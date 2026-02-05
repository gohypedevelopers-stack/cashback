const prisma = require('../config/prismaClient');
const { safeLogActivity } = require('../utils/activityLogger');

exports.scanAndRedeem = async (req, res) => {
    try {
        const { hash } = req.params;
        const userId = req.user.id; // From Auth Middleware

        // Start Transaction
        const result = await prisma.$transaction(async (tx) => {
            const qr = await tx.qRCode.findUnique({
                where: { uniqueHash: hash },
                include: {
                    Campaign: {
                        include: { Brand: true }
                    }
                }
            });

            if (!qr) throw new Error('Invalid QR Code');
            if (qr.status === 'redeemed') throw new Error('QR Code already redeemed');
            if (qr.status !== 'generated' && qr.status !== 'assigned') throw new Error('QR Code not active');

            // Check Campaign Validity
            const now = new Date();
            if (now < new Date(qr.Campaign.startDate) || now > new Date(qr.Campaign.endDate)) {
                throw new Error('Campaign expired or not started');
            }

            const qrAmount = parseFloat(qr.cashbackAmount);
            const campaignAmount = parseFloat(qr.Campaign.cashbackAmount);
            const cashbackAmount = !isNaN(qrAmount) && qrAmount > 0 ? qrAmount : campaignAmount;
            if (isNaN(cashbackAmount) || cashbackAmount <= 0) {
                throw new Error('Invalid cashback amount for this QR');
            }

            // 1. Find User Wallet
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                wallet = await tx.wallet.create({ data: { userId, balance: 0.00 } });
            }

            // 2. Check for Linked UPI (Payout Method)
            const upiMethod = await tx.payoutMethod.findFirst({
                where: { userId, type: 'upi', isPrimary: true }
            });

            // 3. Credit Wallet (Ledger Entry)
            await tx.wallet.update({
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
                    referenceId: hash
                }
            });

            // 4. Auto-Debit (Instant Payout) - ONLY IF UPI EXISTS
            let payoutTx = null;
            if (upiMethod) {
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: cashbackAmount } }
                });

                payoutTx = await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'debit',
                        amount: cashbackAmount,
                        category: 'withdrawal',
                        status: 'success', // Instantly Successful
                        description: `Instant Payout to UPI: ${upiMethod.value}`,
                        referenceId: `BANK_REF_${Date.now()}` // Mock Bank Ref
                    }
                });
            }

            // Update QR Status
            await tx.qRCode.update({
                where: { id: qr.id },
                data: {
                    status: 'redeemed',
                    redeemedByUserId: userId,
                    redeemedAt: now,
                    payoutTransactionId: payoutTx ? payoutTx.id : null
                }
            });

            return {
                amount: cashbackAmount,
                payoutTo: upiMethod ? upiMethod.value : 'Wallet Balance',
                campaign: qr.Campaign,
                isWalletCredit: !upiMethod,
                qrId: qr.id,
                vendorId: qr.vendorId,
                campaignId: qr.campaignId,
                brandId: qr.Campaign?.brandId
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
                payoutTo: result.payoutTo
            },
            req
        });

        if (result.vendorId) {
            const vendor = await prisma.vendor.findUnique({
                where: { id: result.vendorId },
                select: { userId: true, businessName: true }
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
                            amount: result.amount
                        }
                    }
                });
            }
        }

        res.json({
            success: true,
            message: `Cashback of INR ${result.amount} sent instantly to ${result.payoutTo}`,
            amount: result.amount
        });

    } catch (error) {
        res.status(500).json({ message: 'Redemption failed', error: error.message });
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

        if (qr.status !== 'generated' && qr.status !== 'assigned') {
            return res.status(400).json({ message: 'QR Code not active', status: qr.status });
        }

        // Check Campaign Validity
        const now = new Date();
        if (now < new Date(qr.Campaign.startDate) || now > new Date(qr.Campaign.endDate)) {
            return res.status(400).json({ message: 'Campaign expired or not started' });
        }

        const qrAmount = parseFloat(qr.cashbackAmount);
        const campaignAmount = parseFloat(qr.Campaign.cashbackAmount);
        const amount = !isNaN(qrAmount) && qrAmount > 0 ? qrAmount : campaignAmount;

        res.json({
            valid: true,
            amount,
            brand: qr.Campaign.Brand.name,
            campaign: qr.Campaign.title
        });

    } catch (error) {
        res.status(500).json({ message: 'Error verifying QR', error: error.message });
    }
};
