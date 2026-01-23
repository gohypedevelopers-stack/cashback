const prisma = require('../config/prismaClient');
const crypto = require('crypto');

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

        vendor = await tx.vendor.create({
            data: {
                userId,
                name: user.name,
                email: user.email,
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

        await prisma.$transaction(async (tx) => {
            const { wallet } = await ensureVendorAndWallet(req.user.id, tx);

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

            return updatedWallet;
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

        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
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

        const count = await prisma.$transaction(async (tx) => {
            const { vendor, wallet } = await ensureVendorAndWallet(req.user.id, tx);

            // Use the cashbackAmount from the request (per-QR amount)
            const totalCost = qrCashback * parsedQuantity;

            if (parseFloat(wallet.balance) < totalCost) {
                throw new Error('Insufficient wallet balance');
            }

            // Deduct Balance
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: totalCost } }
            });

            // Log Transaction
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'debit',
                    amount: totalCost,
                    category: 'qr_purchase',
                    status: 'success',
                    description: `Purchased ${parsedQuantity} QRs (â‚¹${qrCashback} each) for Campaign ${campaign.title}`
                }
            });

            // Generate QRs with per-QR cashbackAmount
            const qrData = [];
            for (let i = 0; i < parsedQuantity; i++) {
                qrData.push({
                    campaignId,
                    vendorId: vendor.id,
                    uniqueHash: generateQRHash(),
                    cashbackAmount: qrCashback,
                    status: 'generated'
                });
            }

            await tx.qRCode.createMany({ data: qrData });

            return qrData;
        });

        res.status(201).json({ message: 'QRs generated successfully', count: count.length, qrs: count });
    } catch (error) {
        res.status(500).json({ message: 'Order failed', error: error.message });
    }
};

exports.getMyQRs = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const qrs = await prisma.qRCode.findMany({
            where: { vendorId: vendor.id },
            include: { Campaign: true },
            orderBy: { createdAt: 'desc' } // Latest QRs first
        });

        // Convert Prisma Decimal to plain numbers for JSON serialization
        const formattedQrs = qrs.map(qr => ({
            ...qr,
            cashbackAmount: qr.cashbackAmount ? Number(qr.cashbackAmount) : 0, // Per-QR cashback
            Campaign: qr.Campaign ? {
                ...qr.Campaign,
                cashbackAmount: qr.Campaign.cashbackAmount ? Number(qr.Campaign.cashbackAmount) : 0,
                totalBudget: qr.Campaign.totalBudget ? Number(qr.Campaign.totalBudget) : null
            } : null
        }));

        res.json(formattedQrs);
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
            include: {
                Brand: {
                    include: {
                        Subscription: true
                    }
                }
            }
        });

        if (!vendor || !vendor.Brand) {
            return res.status(404).json({ message: 'Brand not found for this vendor' });
        }

        const brand = vendor.Brand;
        res.json({
            ...brand,
            subscription: brand.Subscription || null
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brand', error: error.message });
    }
};

exports.getVendorBrands = async (req, res) => {
    try {
        const { vendor } = await ensureVendorAndWallet(req.user.id);
        const brand = await prisma.brand.findUnique({
            where: { vendorId: vendor.id },
            include: { Subscription: true }
        });
        if (!brand) {
            return res.json([]);
        }
        res.json([{ ...brand, subscription: brand.Subscription || null }]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
};

// Upsert Vendor Brand (Create or Update)
exports.upsertVendorBrand = async (req, res) => {
    res.status(403).json({
        message: 'Brand setup and modifications are performed through the admin dashboard only'
    });
};

exports.updateVendorProfile = async (req, res) => {
    try {
        const { businessName, contactPhone, gstin, address } = req.body;

        // Ensure Vendor Exists (or Create it)
        let vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });

        if (!vendor) {
            vendor = await prisma.vendor.create({
                data: {
                    userId: req.user.id,
                    businessName: businessName || 'My Company',
                    contactPhone,
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
                    gstin,
                    address
                }
            });
        }

        res.json({ message: 'Profile updated successfully', vendor });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.requestBrand = async (_req, res) => {
    res.status(403).json({
        message: 'New brand creation requests must be handled by the admin dashboard'
    });
};

exports.requestCampaign = async (req, res) => {
    try {
        const { brandId, title, description, cashbackAmount, startDate, endDate, totalBudget, subtotal, allocations } = req.body;
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

        const campaign = await prisma.campaign.create({
            data: {
                brandId,
                title,
                description,
                cashbackAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalBudget,
                subtotal,
                allocations,
                status: 'pending'
            }
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
        res.json({ message: 'Campaign updated', campaign: updatedCampaign });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

// --- Product Management (Vendor) ---

exports.addProduct = async (req, res) => {
    try {
        const { brandId, name, variant, description, category, imageUrl } = req.body;

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
                variant,
                description,
                category,
                imageUrl,
                status: 'active'
            }
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

        const products = await prisma.product.findMany({
            where: { Brand: { vendorId: vendor.id } },
            include: { Brand: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, variant, description, category, imageUrl, status } = req.body;

        // Verify ownership
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        const product = await prisma.product.findFirst({
            where: { id, Brand: { vendorId: vendor.id } }
        });

        if (!product) return res.status(404).json({ message: 'Product not found or unauthorized' });

        const updated = await prisma.product.update({
            where: { id },
            data: {
                name,
                variant,
                description,
                category,
                imageUrl,
                status
            }
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

        // Soft delete (set status to inactive or blocked)
        // Or hard delete if no dependencies? For safety, let's keep it. 
        // We'll actually delete for now if no dependency issues, but Prisma might complain if linked?
        // Product is linked to Brand. No other heavy links yet unless...
        // Ah, Product might be linked to... nothing transactional yet?
        // Wait, Transactions link Wallet. QRCodes link Campaign.
        // Product doesn't have many dependencies yet besides Brand.

        await prisma.product.delete({ where: { id } });

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

        const campaign = await prisma.campaign.findFirst({
            where: { id, Brand: { vendorId: vendor.id } }
        });

        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        await prisma.$transaction(async (tx) => {
            await tx.qRCode.deleteMany({ where: { campaignId: id } });
            await tx.campaign.delete({ where: { id } });
        });
        res.json({ message: 'Campaign deleted' });

    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
};

// --- QR Order Management ---

exports.getVendorOrders = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const orders = await prisma.qROrder.findMany({
            where: { vendorId: vendor.id },
            include: {
                QRCodes: {
                    select: { id: true, status: true, uniqueHash: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get campaign titles
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
            qrCount: order.QRCodes.length
        }));

        res.json(formattedOrders);
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

        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
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
        const printCostPerQr = 1.0; // â‚¹1 per QR
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
                    description: `QR Order #${order.id.slice(-6)} - ${order.quantity} QRs (â‚¹${Number(order.cashbackAmount)} cashback + â‚¹${printCost} print)`
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

        res.json({
            message: 'Payment successful. Admin will ship QR codes.',
            order: {
                id: order.id,
                status: 'paid',
                quantity: order.quantity,
                totalPaid: totalDeduction
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Payment failed', error: error.message });
    }
};



exports.payCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendor, wallet } = await ensureVendorAndWallet(req.user.id);

        const campaign = await prisma.campaign.findUnique({ where: { id } });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        if (campaign.status === 'active') return res.status(400).json({ message: 'Campaign is already active' });

        // Calculate Cost: Cashback Budget + Print Cost
        // Print Cost = Total Quantity * 1
        const allocations = campaign.allocations || []; // allocations is JSON

        // Ensure allocations is an array
        const allocArray = Array.isArray(allocations) ? allocations : [];
        const totalQty = allocArray.reduce((sum, a) => sum + (parseInt(a.quantity) || 0), 0);
        const printCost = totalQty * 1;

        const totalCost = Number(campaign.totalBudget) + printCost;

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
                    description: `Payment for Campaign: ${campaign.title} (Cashback: ${campaign.totalBudget} + Print: ${printCost})`
                }
            });

            // Activate Campaign
            await tx.campaign.update({
                where: { id: campaign.id },
                data: { status: 'active' }
            });
        });

        res.json({ message: 'Campaign payment successful. Campaign is now active.' });

    } catch (error) {
        console.error('Campaign Payment Error:', error);
        res.status(500).json({ message: 'Payment failed', error: error.message });
    }
};


 
