const prisma = require('../config/prismaClient');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { parsePagination } = require('../utils/pagination');
const { safeLogVendorActivity } = require('../utils/vendorActivityLogger');

// Helper to generate unique hash
const generateQRHash = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Helper: Ensure Vendor and Wallet exist
const ensureVendorAndWallet = async (userId, tx = prisma) => {
    let vendor = await tx.vendor.findUnique({ where: { userId } });
    if (!vendor) {
        // Create Vendor Profile
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const businessName = user.name || user.username || 'My Company';

        vendor = await tx.vendor.create({
            data: {
                userId,
                businessName,
                contactEmail: user.email || null,
                status: 'active'
            }
        });
    }

    let wallet = await tx.wallet.findUnique({ where: { vendorId: vendor.id } });
    if (!wallet) {
        wallet = await tx.wallet.create({
            data: {
                vendorId: vendor.id,
                balance: 0.0,
                currency: 'INR'
            }
        });
    }
    return { vendor, wallet };
};

const createVendorNotification = async ({ vendorId, title, message, type, metadata }) => {
    if (!vendorId) return null;
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { userId: true } });
    if (!vendor?.userId) return null;
    return prisma.notification.create({
        data: {
            userId: vendor.userId,
            title,
            message,
            type,
            metadata
        }
    });
};

const notifyAdminsAboutPaidOrder = async ({ order, vendor, campaignTitle = 'campaign' }) => {
    if (!order) {
        console.log('[NotifyAdmins] No order provided, skipping notification');
        return;
    }

    try {
        const admins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { id: true }
        });

        console.log(`[NotifyAdmins] Found ${admins.length} admin(s) in database`);

        if (!admins.length) {
            console.log('[NotifyAdmins] No admins found, skipping notification');
            return;
        }

        const vendorLabel =
            vendor?.businessName ||
            vendor?.contactEmail ||
            vendor?.contactPhone ||
            vendor?.User?.name ||
            'Vendor';
        const shortOrderId = order.id ? order.id.slice(-6) : 'order';
        const title = `QR order paid (${vendorLabel})`;
        const message = `${vendorLabel} paid for QR order #${shortOrderId} (${order.quantity || 0} QRs for ${campaignTitle}). Please prepare the PDF.`;

        const metadata = {
            orderId: order.id,
            vendorId: vendor?.id,
            vendorLabel,
            campaignTitle,
            quantity: order.quantity,
            totalAmount: Number(order.totalAmount) || 0,
            status: order.status,
        };

        const notifications = admins.map((admin) => ({
            userId: admin.id,
            title,
            message,
            type: 'admin-order',
            metadata
        }));

        const result = await prisma.notification.createMany({
            data: notifications,
            skipDuplicates: true
        });
        console.log(`[NotifyAdmins] Created ${result.count} notification(s) for order ${shortOrderId}`);
    } catch (error) {
        console.error('[NotifyAdmins] Failed to notify admins about paid order', error);
    }
};

exports.getWalletBalance = async (req, res) => {
    try {
        const { wallet } = await ensureVendorAndWallet(req.user.id);
        res.json(wallet);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wallet', error: error.message });
    }
};

exports.rechargeWallet = async (req, res) => {
    try {
        const { amount } = req.body; // In real app, this comes from Payment Gateway callback

        const { vendorId } = await prisma.$transaction(async (tx) => {
            const { vendor, wallet } = await ensureVendorAndWallet(req.user.id, tx);

            // Update Wallet
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } }
            });

            // Log Transaction
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'credit',
                    amount,
                    category: 'recharge',
                    status: 'success',
                    description: 'Wallet recharge'
                }
            });

            return { vendorId: vendor.id };
        });

        safeLogVendorActivity({
            vendorId,
            action: 'wallet_recharge',
            entityType: 'wallet',
            metadata: { amount: Number(amount) || 0 },
            req
        });
        await createVendorNotification({
            vendorId,
            title: 'Wallet recharged',
            message: `Wallet credited by INR ${Number(amount) || 0}.`,
            type: 'wallet-recharge',
            metadata: { tab: 'wallet', amount: Number(amount) || 0 }
        });
        res.json({ message: 'Wallet recharged successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Recharge failed', error: error.message });
    }
};

exports.orderQRs = async (req, res) => {
    try {
        const { campaignId, quantity, cashbackAmount } = req.body;

        if (!campaignId) {
            return res.status(400).json({ message: 'Campaign ID is required' });
        }

        const parsedQuantity = parseInt(quantity, 10);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }

        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                Brand: { select: { qrPricePerUnit: true } }
            }
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (campaign.status !== 'active') {
            return res.status(400).json({ message: 'Campaign is not active (Pending or Rejected)' });
        }

        const rawCashback =
            cashbackAmount === undefined || cashbackAmount === null || cashbackAmount === ''
                ? campaign.cashbackAmount
                : cashbackAmount;
        const qrCashback = parseFloat(rawCashback);
        if (isNaN(qrCashback) || qrCashback <= 0) {
            return res.status(400).json({ message: 'Invalid cashback amount' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const { vendor, wallet } = await ensureVendorAndWallet(req.user.id, tx);

            const rawPrintCost = Number(campaign?.Brand?.qrPricePerUnit ?? 1);
            const printCostPerQr = Number.isFinite(rawPrintCost) && rawPrintCost > 0 ? rawPrintCost : 1;

            // Use the cashbackAmount from the request (per-QR amount)
            const totalCashbackCost = qrCashback * parsedQuantity;
            const totalPrintCost = printCostPerQr * parsedQuantity;
            const totalCost = totalCashbackCost + totalPrintCost;

            if (parseFloat(wallet.balance) < totalCost) {
                throw new Error('Insufficient wallet balance');
            }

            // Deduct Balance
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: totalCost } }
            });

            const order = await tx.qROrder.create({
                data: {
                    vendorId: vendor.id,
                    campaignId,
                    quantity: parsedQuantity,
                    cashbackAmount: qrCashback,
                    printCost: printCostPerQr,
                    totalAmount: totalPrintCost,
                    status: 'paid'
                }
            });

            // Log Transaction
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'debit',
                    amount: totalCost,
                    category: 'qr_purchase',
                    status: 'success',
                    description: `Purchased ${parsedQuantity} QRs (INR ${qrCashback} cashback + INR ${printCostPerQr} print per QR) for Campaign ${campaign.title}`,
                    referenceId: order.id
                }
            });

            // Generate QRs with per-QR cashbackAmount
            const qrData = [];
            for (let i = 0; i < parsedQuantity; i++) {
                qrData.push({
                    campaignId,
                    vendorId: vendor.id,
                    orderId: order.id,
                    uniqueHash: generateQRHash(),
                    cashbackAmount: qrCashback,
                    status: 'generated'
                });
            }

            await tx.qRCode.createMany({ data: qrData });

            return {
                qrs: qrData,
                order,
                vendorId: vendor.id,
                totalCost,
                totalPrintCost,
                campaignTitle: campaign.title,
                quantity: parsedQuantity
            };
        });

        const orderSummary = result?.order
            ? {
                id: result.order.id,
                campaignId: result.order.campaignId,
                campaignTitle: campaign.title,
                quantity: result.order.quantity,
                cashbackAmount: Number(result.order.cashbackAmount),
                printCost: Number(result.order.printCost),
                totalAmount: Number(result.order.totalAmount),
                status: result.order.status
            }
            : null;

        res.status(201).json({
            message: 'QRs generated successfully',
            count: result.qrs.length,
            qrs: result.qrs,
            order: orderSummary
        });

        safeLogVendorActivity({
            vendorId: result.vendorId,
            action: 'qr_order',
            entityType: 'campaign',
            entityId: campaignId,
            metadata: {
                orderId: result.order?.id,
                quantity: parsedQuantity,
                cashbackAmount: qrCashback,
                totalCost: result.totalCost,
                totalPrintCost: result.totalPrintCost
            },
            req
        });

        await createVendorNotification({
            vendorId: result.vendorId,
            title: 'QRs purchased',
            message: `Debited INR ${Number(result.totalCost || 0).toFixed(2)} for ${result.quantity} QRs (${result.campaignTitle}).`,
            type: 'wallet-debit',
            metadata: {
                tab: 'wallet',
                campaignId,
                orderId: result.order?.id,
                amount: Number(result.totalCost || 0),
                quantity: result.quantity
            }
        });

        const vendorProfile = await prisma.vendor.findUnique({
            where: { id: result.vendorId },
            include: {
                User: { select: { id: true, name: true, email: true } }
            }
        });
        await notifyAdminsAboutPaidOrder({
            order: result.order,
            vendor: vendorProfile,
            campaignTitle: campaign.title
        });
    } catch (error) {
        res.status(500).json({ message: 'Order failed', error: error.message });
    }
};

exports.getMyQRs = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const { page, limit, skip } = parsePagination(req, { defaultLimit: 80, maxLimit: 200 });

        const [qrs, total, statusGroups] = await Promise.all([
            prisma.qRCode.findMany({
                where: { vendorId: vendor.id },
                include: {
                    Campaign: {
                        select: {
                            id: true,
                            title: true,
                            cashbackAmount: true,
                            endDate: true,
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.qRCode.count({ where: { vendorId: vendor.id } }),
            prisma.qRCode.groupBy({
                by: ['status'],
                where: { vendorId: vendor.id },
                _count: { _all: true }
            })
        ]);

        const statusCounts = statusGroups.reduce((acc, row) => {
            const key = String(row.status || 'unknown').toLowerCase();
            acc[key] = row._count._all;
            return acc;
        }, {});

        const formattedQrs = qrs.map(qr => ({
            ...qr,
            cashbackAmount: qr.cashbackAmount ? Number(qr.cashbackAmount) : 0,
            Campaign: qr.Campaign ? {
                ...qr.Campaign,
                cashbackAmount: qr.Campaign.cashbackAmount ? Number(qr.Campaign.cashbackAmount) : 0
            } : null
        }));

        res.json({
            items: formattedQrs,
            total,
            page,
            pages: total ? Math.ceil(total / limit) : 0,
            statusCounts
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching QRs', error: error.message });
    }
};

exports.deleteQrBatch = async (req, res) => {
    try {
        const { campaignId: bodyCampaignId, cashbackAmount: bodyCashbackAmount } = req.body || {};
        const { campaignId: queryCampaignId, cashbackAmount: queryCashbackAmount } = req.query || {};
        const campaignId = bodyCampaignId || queryCampaignId;
        const cashbackAmount = bodyCashbackAmount ?? queryCashbackAmount;

        if (!campaignId) {
            return res.status(400).json({ message: 'Campaign ID is required' });
        }

        const parsedCashback = Number(cashbackAmount);
        if (!Number.isFinite(parsedCashback) || parsedCashback < 0) {
            return res.status(400).json({ message: 'Invalid cashback amount' });
        }

        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { Brand: true }
        });
        const allowNullVendor = campaign?.Brand?.vendorId === vendor.id;

        const normalizedCashback = Number(parsedCashback.toFixed(2));
        const normalizedCashbackString = normalizedCashback.toFixed(2);
        const cashbackAmountFilter =
            normalizedCashback > 0 ? { in: [normalizedCashbackString, '0.00'] } : normalizedCashbackString;
        const baseWhere = {
            campaignId,
            cashbackAmount: cashbackAmountFilter,
            ...(allowNullVendor
                ? { OR: [{ vendorId: vendor.id }, { vendorId: null }] }
                : { vendorId: vendor.id })
        };

        const totalCount = await prisma.qRCode.count({ where: baseWhere });
        if (totalCount === 0) {
            return res.status(404).json({ message: 'No QR batch found for this campaign' });
        }

        const deletableStatuses = ['generated', 'assigned', 'active'];
        const deleteWhere = {
            ...baseWhere,
            status: { in: deletableStatuses }
        };

        const deletableCount = await prisma.qRCode.count({ where: deleteWhere });
        if (deletableCount === 0) {
            return res.status(400).json({
                message: 'No deletable QRs in this batch. Redeemed/expired QRs cannot be removed.',
                total: totalCount,
                deleted: 0,
                skipped: totalCount
            });
        }

        const deleted = await prisma.qRCode.deleteMany({ where: deleteWhere });
        const skipped = totalCount - deleted.count;

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'qr_batch_delete',
            entityType: 'campaign',
            entityId: campaignId,
            metadata: {
                cashbackAmount: normalizedCashback,
                total: totalCount,
                deleted: deleted.count,
                skipped
            },
            req
        });

        res.json({
            message: `Deleted ${deleted.count} QRs from batch`,
            total: totalCount,
            deleted: deleted.count,
            skipped
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete QR batch', error: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: { Wallet: true }
        });

        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const [totalQRs, redeemedQRs, totalSpent] = await Promise.all([
            prisma.qRCode.count({ where: { vendorId: vendor.id } }),
            prisma.qRCode.count({ where: { vendorId: vendor.id, status: 'redeemed' } }),
            prisma.transaction.aggregate({
                where: {
                    walletId: vendor.Wallet.id,
                    type: 'debit'
                },
                _sum: { amount: true }
            })
        ]);

        res.json({
            wallet: {
                balance: vendor.Wallet.balance,
                currency: vendor.Wallet.currency
            },
            stats: {
                totalQRsGenerated: totalQRs,
                totalQRsRedeemed: redeemedQRs,
                totalSpent: totalSpent._sum.amount || 0
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

exports.getVendorTransactions = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: { Wallet: true }
        });

        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const transactions = await prisma.transaction.findMany({
            where: { walletId: vendor.Wallet.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json(transactions);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

exports.getVendorCampaigns = async (req, res) => {
    try {
        // Find vendor first to get ID
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.json([]);

        const campaigns = await prisma.campaign.findMany({
            where: {
                Brand: {
                    vendorId: vendor.id
                }
            },
            include: { Brand: true },
            orderBy: { createdAt: 'desc' }
        });
        // console.log('Fetched Vendor Campaigns:', JSON.stringify(campaigns, null, 2));
        res.json(campaigns);
    } catch (error) {
        console.error('getVendorCampaigns Error:', error);
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
};

// Get Vendor Profile
exports.getVendorProfile = async (req, res) => {
    try {
        let vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            // Auto-create vendor profile
            vendor = await prisma.vendor.create({
                data: {
                    userId: req.user.id,
                    businessName: 'My Company',
                    status: 'active'
                }
            });
        }
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendor profile', error: error.message });
    }
};

// Get Vendor's First Brand
exports.getVendorBrand = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: { Brand: true }
        });

        if (!vendor || !vendor.Brand) {
            return res.status(404).json({ message: 'Brand not found for this vendor' });
        }

        res.json(vendor.Brand);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brand', error: error.message });
    }
};

exports.getVendorBrands = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const brand = await prisma.brand.findUnique({
            where: { vendorId: vendor.id }
        });
        if (!brand) {
            return res.json([]);
        }
        res.json([brand]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
};

// Upsert Vendor Brand (Create or Update)
exports.upsertVendorBrand = async (req, res) => {
    try {
        const { name, website, logoUrl, qrPricePerUnit } = req.body || {};
        const { vendor } = await ensureVendorAndWallet(req.user.id);

        const existingBrand = await prisma.brand.findUnique({
            where: { vendorId: vendor.id }
        });

        const payload = {
            name: typeof name === 'string' && name.trim() ? name.trim() : existingBrand?.name || vendor.businessName || 'My Brand',
            website: typeof website === 'string' && website.trim() ? website.trim() : null,
            logoUrl: typeof logoUrl === 'string' && logoUrl.trim() ? logoUrl.trim() : null,
            status: 'active'
        };

        if (qrPricePerUnit !== undefined && qrPricePerUnit !== null && qrPricePerUnit !== '') {
            payload.qrPricePerUnit = qrPricePerUnit;
        }

        const brand = existingBrand
            ? await prisma.brand.update({
                where: { id: existingBrand.id },
                data: payload
            })
            : await prisma.brand.create({
                data: {
                    ...payload,
                    vendorId: vendor.id
                }
            });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: existingBrand ? 'brand_update' : 'brand_create',
            entityType: 'brand',
            entityId: brand.id,
            metadata: {
                name: brand.name,
                website: brand.website,
                logoUrl: brand.logoUrl
            },
            req
        });

        res.json({ message: existingBrand ? 'Brand updated successfully.' : 'Brand created successfully.', brand });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upsert brand', error: error.message });
    }
};

exports.updateVendorProfile = async (req, res) => {
    try {
        const { businessName, contactPhone, contactEmail, gstin, address } = req.body;

        // Ensure Vendor Exists (or Create it)
        let vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });

        if (!vendor) {
            vendor = await prisma.vendor.create({
                data: {
                    userId: req.user.id,
                    businessName: businessName || 'My Company',
                    contactPhone,
                    contactEmail,
                    gstin,
                    address,
                    status: 'active'
                }
            });
        } else {
            vendor = await prisma.vendor.update({
                where: { userId: req.user.id },
                data: {
                    businessName,
                    contactPhone,
                    contactEmail,
                    gstin,
                    address
                }
            });
        }

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'vendor_profile_update',
            entityType: 'vendor',
            entityId: vendor.id,
            metadata: {
                businessName,
                contactPhone,
                contactEmail,
                gstin,
                address
            },
            req
        });

        res.json({ message: 'Profile updated successfully', vendor });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.requestCredentialUpdate = async (req, res) => {
    try {
        const { username, password } = req.body || {};
        const trimmedUsername = typeof username === 'string' ? username.trim() : '';
        const hasUsername = trimmedUsername.length > 0;
        const hasPassword = typeof password === 'string' && password.length > 0;

        if (!hasUsername && !hasPassword) {
            return res.status(400).json({ message: 'Provide a username or password to request an update' });
        }

        const vendor = await prisma.vendor.findUnique({
            where: { userId: req.user.id },
            include: { User: true, Brand: true }
        });

        if (!vendor || !vendor.User) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }

        if (hasUsername) {
            const existing = await prisma.user.findUnique({ where: { username: trimmedUsername } });
            if (existing && existing.id !== vendor.User.id) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }

        const updatePayload = {};
        if (hasUsername) updatePayload.requestedUsername = trimmedUsername;
        if (hasPassword) updatePayload.requestedPassword = await bcrypt.hash(password, 10);

        if (!Object.keys(updatePayload).length) {
            return res.status(400).json({ message: 'No credential updates provided' });
        }

        let request = await prisma.credentialRequest.findFirst({
            where: { vendorId: vendor.id, status: 'pending' },
            orderBy: { createdAt: 'desc' }
        });

        if (request) {
            request = await prisma.credentialRequest.update({
                where: { id: request.id },
                data: updatePayload
            });
        } else {
            request = await prisma.credentialRequest.create({
                data: {
                    vendorId: vendor.id,
                    userId: vendor.User.id,
                    ...updatePayload
                }
            });
        }

        const admins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { id: true }
        });

        if (admins.length) {
            const vendorLabel =
                vendor.businessName ||
                vendor.contactEmail ||
                vendor.User.email ||
                'Vendor';
            const notifications = admins.map((admin) => ({
                userId: admin.id,
                title: `Credential update request (${vendorLabel})`,
                message: `${vendorLabel} requested to update login credentials.`,
                type: 'credential-request',
                metadata: {
                    requestId: request.id,
                    vendorId: vendor.id,
                    brandId: vendor.Brand?.id || null,
                    vendorLabel,
                    requestedUsername: request.requestedUsername || null,
                    status: request.status
                }
            }));

            await prisma.notification.createMany({ data: notifications });
        }

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'credential_update_request',
            entityType: 'user',
            entityId: vendor.User.id,
            metadata: {
                requestedUsername: request.requestedUsername || null,
                hasPassword: Boolean(request.requestedPassword)
            },
            req
        });

        res.status(201).json({ message: 'Credential update request submitted', requestId: request.id });
    } catch (error) {
        res.status(500).json({ message: 'Failed to request credential update', error: error.message });
    }
};

exports.requestBrand = async (req, res) => {
    try {
        const { name, website, logoUrl } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Brand name is required' });
        }

        // Auto-create Vendor and Wallet if they don't exist
        const { vendor } = await ensureVendorAndWallet(req.user.id);

        // Check if brand already exists for this vendor
        const existingBrand = await prisma.brand.findUnique({
            where: { vendorId: vendor.id }
        });

        if (existingBrand) {
            return res.status(400).json({ message: 'You already have a registered brand.' });
        }

        const brand = await prisma.brand.create({
            data: {
                name,
                website,
                logoUrl,
                vendorId: vendor.id,
                status: 'active'
            }
        });

        // Log activity
        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'brand_create',
            entityType: 'brand',
            entityId: brand.id,
            metadata: { name, website },
            req
        });
        res.status(201).json({ message: 'Brand created successfully.', brand });

    } catch (error) {
        console.error('Request Brand Error:', error);
        res.status(500).json({ message: 'Failed to register brand', error: error.message });
    }
};

exports.requestCampaign = async (req, res) => {
    try {
        const { brandId, productId, title, description, cashbackAmount, startDate, endDate, totalBudget, subtotal, allocations } = req.body;
        console.log('Requesting Campaign Creation:', JSON.stringify(req.body, null, 2));

        // Verify ownership/status of brand
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        // Ensure brand is active (which it should be now)
        // Optional: Check if brand belongs to vendor (if strict ownership is needed)
        // const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        // if (brand.vendorId !== vendor.id) return res.status(403).json({ message: 'Unauthorized brand' });

        if (brand.status !== 'active') {
            return res.status(400).json({ message: 'Brand is not active' });
        }

        // Validate productId if provided
        let validProductId = null;
        if (productId) {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            if (product.brandId !== brandId) {
                return res.status(400).json({ message: 'Product does not belong to this brand' });
            }
            validProductId = productId;
        }

        const allocationRows = Array.isArray(allocations) ? allocations : [];
        const derivedSubtotal = allocationRows.reduce((sum, alloc) => {
            const quantity = parseInt(alloc?.quantity, 10) || 0;
            const cashback = parseFloat(alloc?.cashbackAmount);
            const rowTotal = parseFloat(alloc?.totalBudget);
            if (Number.isFinite(rowTotal) && rowTotal >= 0) {
                return sum + rowTotal;
            }
            if (Number.isFinite(cashback) && cashback > 0 && quantity > 0) {
                return sum + cashback * quantity;
            }
            return sum;
        }, 0);
        const normalizedTotalBudget = Number.isFinite(parseFloat(totalBudget))
            ? parseFloat(totalBudget)
            : derivedSubtotal;
        const normalizedSubtotal = Number.isFinite(parseFloat(subtotal))
            ? parseFloat(subtotal)
            : derivedSubtotal;

        const campaign = await prisma.campaign.create({
            data: {
                brandId,
                productId: validProductId,
                title,
                description,
                cashbackAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalBudget: normalizedTotalBudget,
                subtotal: normalizedSubtotal,
                allocations,
                status: 'pending'
            }
        });
        safeLogVendorActivity({
            vendorId: brand.vendorId,
            action: 'campaign_create',
            entityType: 'campaign',
            entityId: campaign.id,
            metadata: {
                brandId,
                productId: validProductId,
                title,
                totalBudget: normalizedTotalBudget,
                subtotal: normalizedSubtotal,
                allocationsCount: allocationRows.length
            },
            req
        });
        await createVendorNotification({
            vendorId: brand.vendorId,
            title: 'Campaign created',
            message: `Campaign "${title}" created and pending activation.`,
            type: 'campaign-created',
            metadata: { tab: 'campaigns', campaignId: campaign.id, brandId }
        });
        res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (error) {
        console.error('Campaign Creation Error:', error);
        res.status(500).json({ message: 'Request failed', error: error.message, stack: error.stack });
    }
};

exports.updateBrand = async (_req, res) => {
    res.status(403).json({
        message: 'Brand metadata is locked to the admin panel; contact the admin for changes'
    });
};

exports.updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, cashbackAmount, startDate, endDate, totalBudget } = req.body;
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });

        const campaign = await prisma.campaign.findFirst({
            where: { id, Brand: { vendorId: vendor.id } }
        });

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found or unauthorized' });
        }

        const updatedCampaign = await prisma.campaign.update({
            where: { id },
            data: {
                title,
                description,
                cashbackAmount,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                totalBudget
            }
        });
        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_update',
            entityType: 'campaign',
            entityId: id,
            metadata: {
                title,
                cashbackAmount,
                startDate,
                endDate,
                totalBudget
            },
            req
        });
        res.json({ message: 'Campaign updated', campaign: updatedCampaign });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

// --- Product Management (Vendor) ---

exports.addProduct = async (req, res) => {
    try {
        const { brandId, name, sku, mrp, variant, description, category, packSize, warranty, imageUrl } = req.body;

        // Check ownership
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });

        if (!brand || brand.vendorId !== vendor.id) {
            return res.status(403).json({ message: 'Unauthorized brand access' });
        }

        const product = await prisma.product.create({
            data: {
                brandId,
                name,
                sku: sku || null,
                mrp: mrp === undefined || mrp === null || mrp === '' ? null : mrp,
                variant,
                description,
                category,
                packSize: typeof packSize === 'string' ? packSize.trim() || null : null,
                warranty: typeof warranty === 'string' ? warranty.trim() || null : null,
                imageUrl,
                status: 'active'
            }
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'product_create',
            entityType: 'product',
            entityId: product.id,
            metadata: { brandId, name, category },
            req
        });
        res.status(201).json({ message: 'Product added', product });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product', error: error.message });
    }
};

exports.importProducts = async (req, res) => {
    try {
        const { brandId, products } = req.body;

        if (!brandId) {
            return res.status(400).json({ message: 'Brand ID is required' });
        }
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Provide at least one product to import' });
        }

        const { vendor } = await ensureVendorAndWallet(req.user.id);

        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand || brand.vendorId !== vendor.id) {
            return res.status(403).json({ message: 'Unauthorized brand access' });
        }

        const validProducts = products
            .map((item) => {
                const statusCandidate = typeof item.status === 'string' ? item.status.toLowerCase() : '';
                const status =
                    statusCandidate === 'inactive' || statusCandidate === 'blocked' ? statusCandidate : 'active';
                return {
                    brandId,
                    name: item.name?.trim(),
                    sku: item.sku?.trim() || null,
                    mrp:
                        item.mrp === undefined || item.mrp === null || item.mrp === ''
                            ? null
                            : item.mrp,
                    variant: item.variant?.trim() || null,
                    category: item.category?.trim() || null,
                    description: item.description?.trim() || null,
                    packSize: item.packSize?.trim() || null,
                    warranty: item.warranty?.trim() || null,
                    imageUrl: item.imageUrl?.trim() || null,
                    bannerUrl: item.bannerUrl?.trim() || null,
                    status,
                };
            })
            .filter((item) => item.name);

        if (validProducts.length === 0) {
            return res.status(400).json({ message: 'No valid products found to import' });
        }

        const result = await prisma.product.createMany({
            data: validProducts,
            skipDuplicates: true
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'product_import',
            entityType: 'brand',
            entityId: brandId,
            metadata: {
                requested: products.length,
                imported: result.count
            },
            req
        });
        res.status(201).json({
            message: `${result.count} products imported`,
            count: result.count
        });
    } catch (error) {
        res.status(500).json({ message: 'Error importing products', error: error.message });
    }
};

exports.getVendorProducts = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            return res.json([]);
        }

        const products = await prisma.product.findMany({
            where: { Brand: { vendorId: vendor.id } },
            select: {
                id: true,
                brandId: true,
                name: true,
                sku: true,
                mrp: true,
                variant: true,
                category: true,
                description: true,
                packSize: true,
                warranty: true,
                imageUrl: true,
                bannerUrl: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                Brand: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Keep pricing consistently numeric for the frontend table.
        res.json(
            products.map((product) => ({
                ...product,
                mrp: product.mrp !== null && product.mrp !== undefined ? Number(product.mrp) : null
            }))
        );
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, mrp, variant, description, category, packSize, warranty, imageUrl, status } = req.body;
        const hasSku = Object.prototype.hasOwnProperty.call(req.body || {}, 'sku');
        const hasMrp = Object.prototype.hasOwnProperty.call(req.body || {}, 'mrp');
        const hasPackSize = Object.prototype.hasOwnProperty.call(req.body || {}, 'packSize');
        const hasWarranty = Object.prototype.hasOwnProperty.call(req.body || {}, 'warranty');

        // Verify ownership
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        const product = await prisma.product.findFirst({
            where: { id, Brand: { vendorId: vendor.id } }
        });

        if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });

        const data = {
            name,
            variant,
            description,
            category,
            imageUrl,
            status
        };

        if (hasSku) {
            data.sku = typeof sku === 'string' ? sku.trim() || null : null;
        }
        if (hasMrp) {
            if (mrp === undefined || mrp === null || mrp === '') {
                data.mrp = null;
            } else {
                const parsedMrp = Number(mrp);
                data.mrp = Number.isFinite(parsedMrp) ? parsedMrp : null;
            }
        }
        if (hasPackSize) {
            data.packSize = typeof packSize === 'string' ? packSize.trim() || null : null;
        }
        if (hasWarranty) {
            data.warranty = typeof warranty === 'string' ? warranty.trim() || null : null;
        }

        const updated = await prisma.product.update({
            where: { id },
            data
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'product_update',
            entityType: 'product',
            entityId: id,
            metadata: { name, category, status },
            req
        });
        res.json({ message: 'Product updated', product: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error updating product', error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        const product = await prisma.product.findFirst({
            where: { id, Brand: { vendorId: vendor.id } }
        });

        if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });

        const campaigns = await prisma.campaign.findMany({
            where: { productId: id },
            select: { id: true }
        });
        const campaignIds = campaigns.map((campaign) => campaign.id);

        await prisma.$transaction(async (tx) => {
            if (campaignIds.length) {
                await tx.qRCode.deleteMany({ where: { campaignId: { in: campaignIds } } });
                await tx.qROrder.deleteMany({ where: { campaignId: { in: campaignIds } } });
                await tx.campaign.deleteMany({ where: { id: { in: campaignIds } } });
            }
            await tx.product.delete({ where: { id } });
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'product_delete',
            entityType: 'product',
            entityId: id,
            metadata: { name: product.name, deletedCampaigns: campaignIds.length },
            req
        });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};

// --- Analytics ---

exports.getCampaignStats = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        const stats = await prisma.campaign.findMany({
            where: { Brand: { vendorId: vendor.id } }, // All campaigns for this vendor
            select: {
                id: true,
                title: true,
                status: true,
                totalBudget: true,
                _count: {
                    select: { QRCodes: true } // Total QRs generated
                },
                QRCodes: {
                    where: { status: 'redeemed' }, // Only count redeemed for engagement
                    select: { id: true }
                }
            }
        });

        // Format
        const formatted = stats.map(c => ({
            id: c.id,
            campaign: c.title,
            status: c.status,
            budget: c.totalBudget,
            totalQRsOrdered: c._count.QRCodes,
            totalUsersJoined: c.QRCodes.length,
            budgetSpent: c.QRCodes.length * 0 // Access cashback amount if needed, simplifying
        }));

        res.json(formatted);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

// --- Campaign Control & Cleanup ---

exports.updateCampaignStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'paused'
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });

        if (!['active', 'paused'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Use active or paused.' });
        }

        const campaign = await prisma.campaign.findFirst({
            where: { id, Brand: { vendorId: vendor.id } }
        });

        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        // Prevent resuming if rejected/completed?
        // For now, allow toggling active/paused.

        const updated = await prisma.campaign.update({
            where: { id },
            data: { status }
        });
        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_status_update',
            entityType: 'campaign',
            entityId: id,
            metadata: { status },
            req
        });
        res.json({ message: `Campaign ${status}`, campaign: updated });

    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.deleteBrand = async (_req, res) => {
    res.status(403).json({
        message: 'Brand deletion is restricted to administrators'
    });
};

exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { Brand: { select: { vendorId: true } } }
        });

        if (!campaign || campaign.Brand?.vendorId !== vendor.id) {
            return res.status(404).json({ message: 'Campaign not found or unauthorized' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.qRCode.deleteMany({ where: { campaignId: id } });
            await tx.campaign.delete({ where: { id } });
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_delete',
            entityType: 'campaign',
            entityId: id,
            metadata: { title: campaign.title },
            req
        });

        res.json({ message: 'Campaign deleted', campaignId: id });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
};

// --- QR Order Management ---

exports.getVendorOrders = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const { page, limit, skip } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });

        const [orders, total, statusGroups] = await Promise.all([
            prisma.qROrder.findMany({
                where: { vendorId: vendor.id },
                include: {
                    _count: { select: { QRCodes: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.qROrder.count({ where: { vendorId: vendor.id } }),
            prisma.qROrder.groupBy({
                by: ['status'],
                where: { vendorId: vendor.id },
                _count: { _all: true }
            })
        ]);

        const statusCounts = statusGroups.reduce((acc, row) => {
            const key = String(row.status || 'unknown').toLowerCase();
            acc[key] = row._count._all;
            return acc;
        }, {});

        const campaignIds = [...new Set(orders.map(o => o.campaignId))];
        const campaigns = await prisma.campaign.findMany({
            where: { id: { in: campaignIds } },
            select: { id: true, title: true }
        });
        const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c.title]));

        const formattedOrders = orders.map(order => ({
            id: order.id,
            campaignId: order.campaignId,
            campaignTitle: campaignMap[order.campaignId] || 'Unknown Campaign',
            quantity: order.quantity,
            cashbackAmount: Number(order.cashbackAmount),
            printCost: Number(order.printCost),
            totalAmount: Number(order.totalAmount),
            status: order.status,
            createdAt: order.createdAt,
            qrCount: order._count?.QRCodes || 0
        }));

        res.json({
            items: formattedOrders,
            total,
            page,
            pages: total ? Math.ceil(total / limit) : 0,
            statusCounts
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { campaignId, quantity, cashbackAmount } = req.body;

        if (!campaignId) {
            return res.status(400).json({ message: 'Campaign ID is required' });
        }

        const parsedQuantity = parseInt(quantity, 10);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }

        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                Brand: { select: { qrPricePerUnit: true } }
            }
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        if (campaign.status !== 'active') {
            return res.status(400).json({ message: 'Campaign is not active' });
        }

        const rawCashback = cashbackAmount ?? campaign.cashbackAmount;
        const qrCashback = parseFloat(rawCashback);
        if (isNaN(qrCashback) || qrCashback <= 0) {
            return res.status(400).json({ message: 'Invalid cashback amount' });
        }

        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const rawPrintCost = Number(campaign?.Brand?.qrPricePerUnit ?? 1);
        const printCostPerQr = Number.isFinite(rawPrintCost) && rawPrintCost > 0 ? rawPrintCost : 1;
        const totalPrintCost = printCostPerQr * parsedQuantity;

        // Create order (status: pending)
        const order = await prisma.qROrder.create({
            data: {
                vendorId: vendor.id,
                campaignId,
                quantity: parsedQuantity,
                cashbackAmount: qrCashback,
                printCost: printCostPerQr,
                totalAmount: totalPrintCost,
                status: 'pending'
            }
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'qr_order_create',
            entityType: 'campaign',
            entityId: campaignId,
            metadata: {
                orderId: order.id,
                quantity: parsedQuantity,
                cashbackAmount: qrCashback,
                totalAmount: totalPrintCost
            },
            req
        });
        res.status(201).json({
            message: 'Order created. Please pay to confirm.',
            order: {
                id: order.id,
                campaignTitle: campaign.title,
                quantity: order.quantity,
                cashbackAmount: Number(order.cashbackAmount),
                printCost: Number(order.printCost),
                totalAmount: Number(order.totalAmount),
                status: order.status
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Order creation failed', error: error.message });
    }
};

exports.payOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await prisma.qROrder.findUnique({ where: { id: orderId } });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ message: `Order already ${order.status}` });
        }

        const { vendor, wallet } = await ensureVendorAndWallet(req.user.id);

        if (order.vendorId !== vendor.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const printCost = Number(order.totalAmount);
        const cashbackTotal = Number(order.cashbackAmount) * order.quantity;
        const totalDeduction = printCost + cashbackTotal;

        if (parseFloat(wallet.balance) < totalDeduction) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                required: totalDeduction,
                available: Number(wallet.balance)
            });
        }

        const campaign = await prisma.campaign.findUnique({ where: { id: order.campaignId } });

        await prisma.$transaction(async (tx) => {
            // Deduct from wallet
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: totalDeduction } }
            });

            // Log transaction
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'debit',
                    amount: totalDeduction,
                    category: 'qr_purchase',
                    status: 'success',
                    description: `QR Order #${order.id.slice(-6)} - ${order.quantity} QRs (INR ${Number(order.cashbackAmount)} cashback + INR ${printCost} print)`,
                    referenceId: order.id
                }
            });

            // Generate QR codes
            const qrData = [];
            for (let i = 0; i < order.quantity; i++) {
                qrData.push({
                    campaignId: order.campaignId,
                    vendorId: vendor.id,
                    orderId: order.id,
                    uniqueHash: generateQRHash(),
                    cashbackAmount: order.cashbackAmount,
                    status: 'active'
                });
            }
            await tx.qRCode.createMany({ data: qrData });

            // Update order status to paid
            await tx.qROrder.update({
                where: { id: order.id },
                data: { status: 'paid' }
            });
        });

        order.status = 'paid';

        const campaignTitle = campaign?.title || 'Campaign';

        await notifyAdminsAboutPaidOrder({
            order,
            vendor,
            campaignTitle
        });

        await createVendorNotification({
            vendorId: vendor.id,
            title: 'QR order paid',
            message: `Debited INR ${Number(totalDeduction).toFixed(2)} for QR order #${order.id.slice(-6)} (${campaignTitle}).`,
            type: 'wallet-debit',
            metadata: {
                tab: 'wallet',
                orderId: order.id,
                campaignId: order.campaignId,
                amount: Number(totalDeduction)
            }
        });

        res.json({
            message: 'Payment successful. Admin will ship QR codes.',
            order: {
                id: order.id,
                status: 'paid',
                quantity: order.quantity,
                totalPaid: totalDeduction
            }
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'qr_order_pay',
            entityType: 'order',
            entityId: order.id,
            metadata: {
                campaignId: order.campaignId,
                quantity: order.quantity,
                totalPaid: totalDeduction
            },
            req
        });
    } catch (error) {
        res.status(500).json({ message: 'Payment failed', error: error.message });
    }
};



exports.payCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendor, wallet } = await ensureVendorAndWallet(req.user.id);

        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { Brand: { select: { qrPricePerUnit: true } } }
        });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        if (campaign.status === 'active') return res.status(400).json({ message: 'Campaign is already active' });

        // Calculate Cost: Cashback Budget + Print Cost
        // Print Cost = Total Quantity * negotiated QR price
        const allocations = campaign.allocations || []; // allocations is JSON

        // Ensure allocations is an array
        const allocArray = Array.isArray(allocations) ? allocations : [];
        const totalQty = allocArray.reduce((sum, a) => sum + (parseInt(a.quantity) || 0), 0);
        const rawPrintCost = Number(campaign?.Brand?.qrPricePerUnit ?? 1);
        const printCostPerQr = Number.isFinite(rawPrintCost) && rawPrintCost > 0 ? rawPrintCost : 1;
        const printCost = totalQty * printCostPerQr;

        const baseBudget = Number(campaign.subtotal ?? campaign.totalBudget ?? 0);
        const totalCost = baseBudget + printCost;

        if (parseFloat(wallet.balance) < totalCost) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                required: totalCost,
                available: Number(wallet.balance)
            });
        }

        await prisma.$transaction(async (tx) => {
            // Deduct from wallet
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: totalCost } }
            });

            // Log transaction
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'debit',
                    amount: totalCost,
                    category: 'campaign_payment',
                    status: 'success',
                    description: `Payment for Campaign: ${campaign.title} (Cashback: ${campaign.totalBudget} + Print: ${printCost})`,
                    referenceId: campaign.id
                }
            });

            // Activate Campaign
            await tx.campaign.update({
                where: { id: campaign.id },
                data: { status: 'active' }
            });

            // Generate QRs automatically based on allocations
            const qrData = [];
            for (const alloc of allocArray) {
                const qty = parseInt(alloc.quantity) || 0;
                const amt = parseFloat(alloc.cashbackAmount) || 0;
                if (qty > 0 && amt > 0) {
                    for (let i = 0; i < qty; i++) {
                        qrData.push({
                            campaignId: campaign.id,
                            vendorId: vendor.id,
                            uniqueHash: generateQRHash(),
                            cashbackAmount: amt,
                            status: 'generated'
                        });
                    }
                }
            }

            if (qrData.length > 0) {
                await tx.qRCode.createMany({ data: qrData });
            }
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_pay',
            entityType: 'campaign',
            entityId: id,
            metadata: {
                totalCost,
                totalQty,
                printCost,
                baseBudget
            },
            req
        });
        await createVendorNotification({
            vendorId: vendor.id,
            title: 'Campaign activated',
            message: `Debited INR ${Number(totalCost).toFixed(2)} to activate campaign "${campaign.title}".`,
            type: 'wallet-debit',
            metadata: {
                tab: 'campaigns',
                campaignId: campaign.id,
                amount: Number(totalCost)
            }
        });
        res.json({ message: 'Campaign payment successful. Campaign is now active.' });

    } catch (error) {
        console.error('Campaign Payment Error:', error);
        res.status(500).json({ message: 'Payment failed', error: error.message });
    }
};

// Download QR PDF for an order
const { generateQrPdf } = require('../utils/qrPdfGenerator');

exports.downloadOrderQrPdf = async (req, res) => {
    try {
        const { orderId } = req.params;
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }

        // Get order and verify ownership
        const order = await prisma.qROrder.findUnique({
            where: { id: orderId },
            include: {
                QRCodes: {
                    select: { uniqueHash: true, cashbackAmount: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.vendorId !== vendor.id) {
            return res.status(403).json({ message: 'Unauthorized access to this order' });
        }

        if (order.status !== 'paid') {
            return res.status(400).json({ message: 'PDF is only available for paid orders' });
        }

        if (!order.QRCodes || order.QRCodes.length === 0) {
            return res.status(400).json({ message: 'No QR codes found for this order' });
        }

        // Get campaign title
        const campaign = await prisma.campaign.findUnique({
            where: { id: order.campaignId },
            select: {
                title: true,
                Brand: { select: { name: true, logoUrl: true } }
            }
        });

        // Generate PDF
        const pdfBuffer = await generateQrPdf({
            qrCodes: order.QRCodes,
            campaignTitle: campaign?.title || 'Campaign',
            orderId: order.id,
            brandName: campaign?.Brand?.name,
            brandLogoUrl: campaign?.Brand?.logoUrl
        });

        // Send PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="QR_Order_${orderId.slice(-8)}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'qr_pdf_download',
            entityType: 'order',
            entityId: orderId,
            metadata: { qrCount: order.QRCodes.length },
            req
        });

    } catch (error) {
        console.error('PDF Download Error:', error);
        res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
    }
};

// Download QR PDF for a campaign (all QRs)
exports.downloadCampaignQrPdf = async (req, res) => {
    try {
        const { id: campaignId } = req.params;
        console.log('[CampaignPDF] Starting download for campaign:', campaignId);

        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }
        console.log('[CampaignPDF] Vendor found:', vendor.id);

        // Get campaign and verify ownership
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                Brand: { select: { vendorId: true, name: true, logoUrl: true } }
            }
        });

        if (!campaign) {
            console.log('[CampaignPDF] Campaign not found');
            return res.status(404).json({ message: 'Campaign not found' });
        }
        console.log('[CampaignPDF] Campaign found:', campaign.title, 'Status:', campaign.status);

        if (campaign.Brand.vendorId !== vendor.id) {
            console.log('[CampaignPDF] Unauthorized - vendor mismatch');
            return res.status(403).json({ message: 'Unauthorized access to this campaign' });
        }

        if (campaign.status !== 'active') {
            console.log('[CampaignPDF] Campaign not active:', campaign.status);
            return res.status(400).json({ message: 'PDF is only available for active campaigns' });
        }

        // Get all QRs for this campaign
        let qrCodes = await prisma.qRCode.findMany({
            where: { campaignId },
            select: { uniqueHash: true, cashbackAmount: true }
        });
        console.log('[CampaignPDF] Found QR codes:', qrCodes.length);

        if (!qrCodes || qrCodes.length === 0) {
            console.log('[CampaignPDF] No QRs found. Auto-generating based on allocations...');
            const allocations = campaign.allocations || [];
            const allocArray = Array.isArray(allocations) ? allocations : [];
            const newQrData = [];

            for (const alloc of allocArray) {
                const qty = parseInt(alloc.quantity) || 0;
                const amt = parseFloat(alloc.cashbackAmount) || 0;
                if (qty > 0 && amt > 0) {
                    for (let i = 0; i < qty; i++) {
                        newQrData.push({
                            campaignId: campaign.id,
                            vendorId: vendor.id,
                            uniqueHash: generateQRHash(),
                            cashbackAmount: amt,
                            status: 'generated'
                        });
                    }
                }
            }

            if (newQrData.length > 0) {
                await prisma.qRCode.createMany({ data: newQrData });
                console.log(`[CampaignPDF] Auto-generated ${newQrData.length} QRs.`);
                // Fetch the newly created QRs
                qrCodes = await prisma.qRCode.findMany({
                    where: { campaignId },
                    select: { uniqueHash: true, cashbackAmount: true }
                });
            } else {
                return res.status(400).json({ message: 'No allocations found to generate QRs' });
            }
        }

        // Generate PDF
        console.log('[CampaignPDF] Generating PDF...');
        const pdfBuffer = await generateQrPdf({
            qrCodes,
            campaignTitle: campaign.title,
            orderId: campaignId,
            brandName: campaign.Brand.name,
            brandLogoUrl: campaign.Brand.logoUrl
        });
        console.log('[CampaignPDF] PDF generated, size:', pdfBuffer.length);

        // Send PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="QR_Campaign_${campaignId.slice(-8)}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'campaign_qr_pdf_download',
            entityType: 'campaign',
            entityId: campaignId,
            metadata: { qrCount: qrCodes.length },
            req
        });

    } catch (error) {
        console.error('[CampaignPDF] Error:', error.message, error.stack);
        res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
    }
};

// Helper: Mask phone number (e.g., 9876543210 -> 98****3210)
const maskPhone = (phone) => {
    if (!phone || phone.length < 6) return '****';
    return phone.slice(0, 2) + '****' + phone.slice(-4);
};

// Helper: Mask name (e.g., John Doe -> J***e)
const maskName = (name) => {
    if (!name || name.length < 2) return '****';
    return name[0] + '***' + name.slice(-1);
};

// B11: Get Vendor Redemptions (Masked Customer Data)
exports.getVendorRedemptions = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const { page, limit, skip } = parsePagination(req);
        const { campaignId, startDate, endDate } = req.query;

        // Build filter: Get all redeemed QRs from vendor's campaigns
        const whereClause = {
            status: 'redeemed',
            Campaign: {
                Brand: { vendorId: vendor.id }
            }
        };

        if (campaignId) {
            whereClause.campaignId = campaignId;
        }

        if (startDate || endDate) {
            whereClause.redeemedAt = {};
            if (startDate) whereClause.redeemedAt.gte = new Date(startDate);
            if (endDate) whereClause.redeemedAt.lte = new Date(endDate);
        }

        const [redemptions, total] = await Promise.all([
            prisma.qRCode.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { redeemedAt: 'desc' },
                include: {
                    Campaign: {
                        select: { id: true, title: true }
                    }
                }
            }),
            prisma.qRCode.count({ where: whereClause })
        ]);

        const userIds = Array.from(
            new Set(
                redemptions
                    .map((qr) => qr.redeemedByUserId)
                    .filter((id) => id)
            )
        );

        const users = userIds.length
            ? await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, phoneNumber: true }
            })
            : [];

        const userMap = new Map(users.map((user) => [user.id, user]));

        // Mask customer data
        const maskedRedemptions = redemptions.map((qr) => {
            const user = qr.redeemedByUserId ? userMap.get(qr.redeemedByUserId) : null;
            return {
                id: qr.id,
                uniqueHash: qr.uniqueHash.slice(-8), // Only show last 8 chars
                cashbackAmount: qr.cashbackAmount,
                redeemedAt: qr.redeemedAt,
                campaign: {
                    id: qr.Campaign?.id,
                    title: qr.Campaign?.title
                },
                customer: {
                    id: user?.id?.slice(-6),
                    name: maskName(user?.name),
                    phone: maskPhone(user?.phoneNumber)
                }
            };
        });

        res.json({
            redemptions: maskedRedemptions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'view_redemptions',
            entityType: 'redemption',
            metadata: { page, limit, total },
            req
        });

    } catch (error) {
        console.error('[VendorRedemptions] Error:', error);
        res.status(500).json({ message: 'Failed to fetch redemptions', error: error.message });
    }
};

// B13: Create Vendor Support Ticket
exports.createVendorSupportTicket = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const { subject, message, priority = 'medium' } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: req.user.id,
                subject,
                message,
                status: 'open'
            }
        });

        // Notify admins
        const admins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { id: true }
        });

        if (admins.length) {
            const notifications = admins.map(admin => ({
                userId: admin.id,
                title: 'New Support Ticket',
                message: `Vendor "${vendor.businessName}" created a support ticket: ${subject}`,
                type: 'support_ticket',
                metadata: {
                    ticketId: ticket.id,
                    vendorId: vendor.id,
                    priority
                }
            }));
            await prisma.notification.createMany({ data: notifications });
        }

        res.status(201).json({
            success: true,
            message: 'Support ticket created',
            ticket
        });

        safeLogVendorActivity({
            vendorId: vendor.id,
            action: 'create_support_ticket',
            entityType: 'support_ticket',
            entityId: ticket.id,
            metadata: { subject, priority },
            req
        });

    } catch (error) {
        console.error('[VendorSupportTicket] Create Error:', error);
        res.status(500).json({ message: 'Failed to create support ticket', error: error.message });
    }
};

// B13: Get Vendor Support Tickets
exports.getVendorSupportTickets = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req);
        const { status } = req.query;

        const whereClause = { userId: req.user.id };
        if (status) whereClause.status = status;

        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.supportTicket.count({ where: whereClause })
        ]);

        res.json({
            tickets,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('[VendorSupportTicket] Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch support tickets', error: error.message });
    }
};

// B13: Get Customer Brand Inquiries (Notifications)
exports.getVendorBrandInquiries = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req);
        const whereClause = { userId: req.user.id, type: 'brand-inquiry' };

        const [items, total] = await Promise.all([
            prisma.notification.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.notification.count({ where: whereClause })
        ]);

        res.json({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[VendorBrandInquiries] Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch brand inquiries', error: error.message });
    }
};



