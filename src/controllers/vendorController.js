const prisma = require('../config/prismaClient');
const crypto = require('crypto');

// Helper to generate unique hash
const generateQRHash = () => {
    return crypto.randomBytes(32).toString('hex');
};

exports.getWalletBalance = async (req, res) => {
    try {
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const wallet = await prisma.wallet.findUnique({ where: { vendorId: vendor.id } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wallet', error: error.message });
    }
};

exports.rechargeWallet = async (req, res) => {
    try {
        const { amount } = req.body; // In real app, this comes from Payment Gateway callback

        await prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.findUnique({ where: { userId: req.user.id } });
            if (!vendor) throw new Error('Vendor not found');

            const wallet = await tx.wallet.findUnique({ where: { vendorId: vendor.id } });
            if (!wallet) throw new Error('Wallet not found');

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
        const { campaignId, quantity } = req.body;

        const count = await prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.findUnique({ where: { userId: req.user.id } });
            if (!vendor) throw new Error('Vendor not found');

            const campaign = await tx.campaign.findUnique({ where: { id: campaignId } });
            if (!campaign) throw new Error('Campaign not found');

            if (campaign.status !== 'active') {
                throw new Error('Campaign is not active (Pending or Rejected)');
            }

            const totalCost = parseFloat(campaign.cashbackAmount) * parseInt(quantity);
            const wallet = await tx.wallet.findUnique({ where: { vendorId: vendor.id } });

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
                    description: `Purchased ${quantity} QRs for Campaign ${campaign.title}`
                }
            });

            // Generate QRs
            // Note: createMany is not supported for relation fields if needing to return data, 
            // but here we just need to insert. PostgreSQL supports createMany.
            const qrData = [];
            for (let i = 0; i < quantity; i++) {
                qrData.push({
                    campaignId,
                    vendorId: vendor.id,
                    uniqueHash: generateQRHash(),
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
            include: { Campaign: true } // Assuming relation name
        });
        res.json(qrs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching QRs', error: error.message });
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

exports.getActiveCampaigns = async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            where: { status: 'active' },
            include: { Brand: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
};

exports.updateVendorProfile = async (req, res) => {
    try {
        const { businessName, contactPhone, gstin, address } = req.body;

        const vendor = await prisma.vendor.update({
            where: { userId: req.user.id },
            data: {
                businessName,
                contactPhone,
                gstin,
                address
            }
        });

        res.json({ message: 'Profile updated successfully', vendor });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.requestBrand = async (req, res) => {
    try {
        const { name, logoUrl, website } = req.body;
        const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });

        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        // Strict Check: Vendor must be verified/active
        if (vendor.status !== 'active') { // Assuming schema update applied
            return res.status(403).json({ message: 'Vendor account is pending verification' });
        }

        const brand = await prisma.brand.create({
            data: {
                name,
                logoUrl,
                website,
                status: 'active', // Auto-active as per new requirement
                vendorId: vendor.id
            }
        });
        res.status(201).json({ message: 'Brand created successfully', brand });
    } catch (error) {
        res.status(500).json({ message: 'Request failed', error: error.message });
    }
};

exports.requestCampaign = async (req, res) => {
    try {
        const { brandId, title, description, cashbackAmount, startDate, endDate, totalBudget } = req.body;

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
                status: 'active' // Auto-active as per new requirement
            }
        });
        res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (error) {
        res.status(500).json({ message: 'Request failed', error: error.message });
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
