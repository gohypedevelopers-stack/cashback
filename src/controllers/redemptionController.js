const prisma = require('../config/prismaClient');
const { safeLogActivity } = require('../utils/activityLogger');
const { spendLocked } = require('../services/walletService');

const ACTIVE_QR_STATUSES = new Set(['funded', 'generated', 'assigned', 'active']);

const createHttpError = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const toPositiveAmount = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return Number(numeric.toFixed(2));
};

const toCoordinate = (value, min, max) => {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null;
    return Number(numeric.toFixed(7));
};

const toAccuracy = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100000) return null;
    return Number(numeric.toFixed(2));
};

const normalizeText = (value, max = 120) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
};

const parseLocationPayload = (body = {}) => {
    const source = body.location && typeof body.location === 'object' ? body.location : body;
    const lat = toCoordinate(source.lat, -90, 90);
    const lng = toCoordinate(source.lng, -180, 180);
    const accuracyMeters = toAccuracy(source.accuracyMeters ?? source.accuracy);

    return {
        lat,
        lng,
        accuracyMeters,
        city: normalizeText(source.city, 80),
        state: normalizeText(source.state, 80),
        pincode: normalizeText(source.pincode, 20),
        capturedAt: new Date()
    };
};

const ensureUserWallet = async (tx, userId) => {
    let wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        wallet = await tx.wallet.create({
            data: {
                userId,
                balance: 0.0,
                currency: 'INR'
            }
        });
    }
    return wallet;
};

const createRedemptionEvent = async (tx, payload = {}) => {
    return tx.redemptionEvent.create({
        data: {
            qrId: payload.qrId || null,
            campaignId: payload.campaignId || null,
            vendorId: payload.vendorId || null,
            userId: payload.userId || null,
            amount: payload.amount || 0,
            type: payload.type || 'preview',
            lat: payload.location?.lat ?? null,
            lng: payload.location?.lng ?? null,
            accuracyMeters: payload.location?.accuracyMeters ?? null,
            city: payload.location?.city ?? null,
            state: payload.location?.state ?? null,
            pincode: payload.location?.pincode ?? null,
            capturedAt: payload.location?.capturedAt || null
        }
    });
};

const validateQrForRedemption = (qr) => {
    if (!qr) throw createHttpError('Invalid QR Code', 404);
    if (qr.status === 'redeemed') throw createHttpError('QR Code already redeemed', 409);
    if (!ACTIVE_QR_STATUSES.has(qr.status)) {
        throw createHttpError('QR Code not active', 400);
    }
    if (!qr.Campaign || qr.Campaign.deletedAt) {
        throw createHttpError('Campaign not available for this QR', 400);
    }

    const now = new Date();
    if (now < new Date(qr.Campaign.startDate) || now > new Date(qr.Campaign.endDate)) {
        throw createHttpError('Campaign expired or not started', 400);
    }

    const amount = toPositiveAmount(qr.cashbackAmount) || toPositiveAmount(qr.Campaign.cashbackAmount);
    if (!amount) {
        throw createHttpError('Invalid cashback amount for this QR', 400);
    }

    return amount;
};

exports.scanAndRedeem = async (req, res) => {
    try {
        const { hash } = req.params;
        const userId = req.user.id;
        const location = parseLocationPayload(req.body || {});

        const previewQr = await prisma.qRCode.findUnique({
            where: { uniqueHash: hash },
            include: {
                Campaign: {
                    include: { Brand: true }
                }
            }
        });

        if (!previewQr) {
            return res.status(404).json({ message: 'Invalid QR Code' });
        }

        try {
            validateQrForRedemption(previewQr);
        } catch (validationError) {
            const eventType = validationError.status === 409 ? 'already_redeemed' : 'invalid';
            await prisma.redemptionEvent.create({
                data: {
                    qrId: previewQr.id,
                    campaignId: previewQr.campaignId,
                    vendorId: previewQr.vendorId,
                    userId,
                    amount: 0,
                    type: eventType,
                    lat: location.lat,
                    lng: location.lng,
                    accuracyMeters: location.accuracyMeters,
                    city: location.city,
                    state: location.state,
                    pincode: location.pincode,
                    capturedAt: location.capturedAt
                }
            });
            return res.status(validationError.status || 400).json({ message: validationError.message });
        }

        const result = await prisma.$transaction(async (tx) => {
            const qr = await tx.qRCode.findUnique({
                where: { id: previewQr.id },
                include: {
                    Campaign: {
                        include: { Brand: true }
                    }
                }
            });

            const cashbackAmount = validateQrForRedemption(qr);

            if (qr.campaignBudgetId) {
                const campaignBudget = await tx.campaignBudget.findUnique({
                    where: { id: qr.campaignBudgetId }
                });

                if (!campaignBudget || campaignBudget.status !== 'active') {
                    throw createHttpError('Campaign budget is not active', 400);
                }

                if (Number(campaignBudget.lockedAmount || 0) < cashbackAmount) {
                    throw createHttpError('Locked budget exhausted for this campaign', 400);
                }

                await spendLocked(tx, qr.vendorId, cashbackAmount, {
                    referenceId: hash,
                    campaignBudgetId: campaignBudget.id,
                    qrId: qr.id,
                    description: `Cashback spent for redemption in campaign ${qr.Campaign.title}`,
                    metadata: {
                        campaignId: qr.campaignId,
                        qrHash: hash
                    }
                });

                const nextLocked = Number(campaignBudget.lockedAmount || 0) - cashbackAmount;
                await tx.campaignBudget.update({
                    where: { id: campaignBudget.id },
                    data: {
                        spentAmount: { increment: cashbackAmount },
                        lockedAmount: { decrement: cashbackAmount },
                        status: nextLocked <= 0 ? 'closed' : campaignBudget.status
                    }
                });
            }

            const lockResult = await tx.qRCode.updateMany({
                where: {
                    id: qr.id,
                    status: {
                        not: 'redeemed'
                    }
                },
                data: {
                    status: 'redeemed',
                    redeemedByUserId: userId,
                    redeemedAt: new Date()
                }
            });

            if (!lockResult.count) {
                throw createHttpError('QR Code already redeemed', 409);
            }

            let wallet = await ensureUserWallet(tx, userId);
            const upiMethod = await tx.payoutMethod.findFirst({
                where: { userId, type: 'upi', isPrimary: true }
            });

            wallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: cashbackAmount } }
            });

            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'credit',
                    amount: cashbackAmount,
                    category: 'cashback_payout',
                    status: 'success',
                    description: `Cashback for Campaign: ${qr.Campaign.title}`,
                    referenceId: hash,
                    qrId: qr.id,
                    metadata: {
                        campaignId: qr.campaignId,
                        vendorId: qr.vendorId,
                        campaignBudgetId: qr.campaignBudgetId || null
                    }
                }
            });

            let payoutTx = null;
            if (upiMethod) {
                wallet = await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: cashbackAmount } }
                });

                payoutTx = await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'debit',
                        amount: cashbackAmount,
                        category: 'withdrawal',
                        status: 'success',
                        description: `Instant payout to UPI: ${upiMethod.value}`,
                        referenceId: `BANK_REF_${Date.now()}`,
                        qrId: qr.id
                    }
                });

                await tx.qRCode.update({
                    where: { id: qr.id },
                    data: {
                        payoutTransactionId: payoutTx.id
                    }
                });
            }

            await createRedemptionEvent(tx, {
                qrId: qr.id,
                campaignId: qr.campaignId,
                vendorId: qr.vendorId,
                userId,
                amount: cashbackAmount,
                type: 'redeem_success',
                location
            });

            return {
                amount: cashbackAmount,
                payoutTo: upiMethod ? upiMethod.value : 'Wallet Balance',
                campaign: qr.Campaign,
                qrId: qr.id,
                vendorId: qr.vendorId,
                campaignId: qr.campaignId,
                brandId: qr.Campaign?.brandId,
                walletBalance: Number(wallet.balance || 0)
            };
        });

        safeLogActivity({
            actorUserId: userId,
            actorRole: req.user?.role,
            vendorId: result.vendorId,
            brandId: result.brandId,
            campaignId: result.campaignId,
            action: 'qr_redeem',
            entityType: 'qr',
            entityId: result.qrId,
            metadata: {
                amount: result.amount,
                payoutTo: result.payoutTo,
                location: {
                    lat: location.lat,
                    lng: location.lng,
                    accuracyMeters: location.accuracyMeters,
                    city: location.city,
                    state: location.state,
                    pincode: location.pincode
                }
            },
            req
        });

        if (result.vendorId) {
            const vendor = await prisma.vendor.findUnique({
                where: { id: result.vendorId },
                select: { userId: true }
            });
            if (vendor?.userId) {
                await prisma.notification.create({
                    data: {
                        userId: vendor.userId,
                        title: 'QR redeemed',
                        message: `Customer redeemed INR ${result.amount} for campaign "${result.campaign?.title || 'Campaign'}".`,
                        type: 'qr-redeemed',
                        metadata: {
                            tab: 'redemptions',
                            campaignId: result.campaignId,
                            brandId: result.brandId,
                            amount: result.amount,
                            location: {
                                city: location.city,
                                state: location.state
                            }
                        }
                    }
                });
            }
        }

        res.json({
            success: true,
            message: `Cashback of INR ${result.amount} sent to ${result.payoutTo}`,
            amount: result.amount,
            payoutTo: result.payoutTo,
            walletBalance: result.walletBalance,
            campaign: result.campaign?.title,
            brand: result.campaign?.Brand?.name
        });
    } catch (error) {
        res.status(error.status || 500).json({
            message: error.message || 'Redemption failed'
        });
    }
};

exports.verifyQR = async (req, res) => {
    try {
        const { hash } = req.params;
        const qr = await prisma.qRCode.findUnique({
            where: { uniqueHash: hash },
            include: {
                Campaign: {
                    include: { Brand: true }
                }
            }
        });

        if (!qr) return res.status(404).json({ message: 'Invalid QR Code' });

        if (qr.status === 'redeemed') {
            return res.status(400).json({ message: 'QR Code already redeemed', qr });
        }

        if (!ACTIVE_QR_STATUSES.has(qr.status)) {
            return res.status(400).json({ message: 'QR Code not active', status: qr.status });
        }

        if (!qr.Campaign || qr.Campaign.deletedAt) {
            return res.status(400).json({ message: 'Campaign not available for this QR' });
        }

        const now = new Date();
        if (now < new Date(qr.Campaign.startDate) || now > new Date(qr.Campaign.endDate)) {
            return res.status(400).json({ message: 'Campaign expired or not started' });
        }

        const amount = toPositiveAmount(qr.cashbackAmount) || toPositiveAmount(qr.Campaign.cashbackAmount) || 0;

        await prisma.redemptionEvent.create({
            data: {
                qrId: qr.id,
                campaignId: qr.campaignId,
                vendorId: qr.vendorId,
                type: 'preview',
                amount
            }
        });

        res.json({
            valid: true,
            amount,
            brand: qr.Campaign.Brand?.name,
            campaign: qr.Campaign.title,
            status: qr.status
        });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying QR', error: error.message });
    }
};
