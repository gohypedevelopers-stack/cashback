const prisma = require('../config/prismaClient');

// --- Brand Management ---

// --- Brand Management ---

exports.createBrand = async (req, res) => {
    try {
        const { name, logoUrl, website } = req.body;
        const brand = await prisma.brand.create({
            data: {
                name,
                logoUrl,
                website,
                status: 'active' // Admin created brands are auto-verified
            }
        });
        res.status(201).json(brand);
    } catch (error) {
        res.status(500).json({ message: 'Error creating brand', error: error.message });
    }
};

// ... (getAllBrands - no change)

// --- Campaign Management ---

exports.createCampaign = async (req, res) => {
    try {
        const { brandId, title, description, cashbackAmount, startDate, endDate, totalBudget } = req.body;

        // Validation: Check if Brand exists
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        const campaign = await prisma.campaign.create({
            data: {
                brandId,
                title,
                description,
                cashbackAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalBudget,
                status: 'active' // Admin created campaigns are auto-verified
            }
        });
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error creating campaign', error: error.message });
    }
};

// ... (getAllCampaigns, getAllVendors, createVendorProfile - no change)

exports.verifyBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Allow passing 'active' or 'rejected'

        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const brand = await prisma.brand.update({
            where: { id },
            data: { status: newStatus }
        });
        res.json({ message: `Brand ${newStatus}`, brand });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.verifyCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Allow passing 'active' or 'rejected'

        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const campaign = await prisma.campaign.update({
            where: { id },
            data: { status: newStatus }
        });
        res.json({ message: `Campaign ${newStatus}`, campaign });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.getAllBrands = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany();
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
};

// --- Campaign Management ---

exports.createCampaign = async (req, res) => {
    try {
        const { brandId, title, description, cashbackAmount, startDate, endDate, totalBudget } = req.body;

        // Validation: Check if Brand exists
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        const campaign = await prisma.campaign.create({
            data: {
                brandId,
                title,
                description,
                cashbackAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalBudget
            }
        });
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error creating campaign', error: error.message });
    }
};

exports.getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({ include: { Brand: true } });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
};

// --- Vendor Management (Admin View) ---

// --- Vendor Management (Admin View) ---

exports.getAllVendors = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                include: { User: true, Wallet: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.vendor.count()
        ]);

        res.json({
            vendors,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendors', error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // Admin force delete (no ownership check needed really, just existence)
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product forcibly deleted by Admin' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
};

exports.createVendorProfile = async (req, res) => {
    // This assumes a User already exists (created via Auth Register) 
    // and we are assigning them as a Vendor with a Wallet.
    // Ideally, registration could be atomic, but separating for Admin control.
    const { userId, businessName, contactPhone, gstin } = req.body;

    try {
        const vendor = await prisma.vendor.create({
            data: {
                userId,
                businessName,
                contactPhone,
                gstin
            }
        });

        // Create an empty wallet for the vendor
        await prisma.wallet.create({
            data: { vendorId: vendor.id }
        });

        // Update User role if not already vendor
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'vendor' }
        });

        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ message: 'Error creating vendor', error: error.message });
    }
};

exports.verifyBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body; // Allow passing 'active' or 'rejected'

        const newStatus = status === 'rejected' ? 'rejected' : 'active';
        // Auto-approve logic: if status not provided, assume active? Or require explicit?

        const brand = await prisma.brand.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: newStatus === 'rejected' ? reason : null
            }
        });
        res.json({ message: `Brand ${newStatus}`, brand });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.verifyCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const campaign = await prisma.campaign.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: newStatus === 'rejected' ? reason : null
            }
        });
        res.json({ message: `Campaign ${newStatus}`, campaign });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.verifyVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const vendor = await prisma.vendor.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: newStatus === 'rejected' ? reason : null
            }
        });
        res.json({ message: `Vendor ${newStatus}`, vendor });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.processWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, referenceId, adminNote, reason } = req.body; // status: 'processed' or 'rejected'

        if (!['processed', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
            if (!withdrawal) throw new Error('Withdrawal request not found');
            if (withdrawal.status !== 'pending') throw new Error('Request already handled');

            // Update Withdrawal
            const updatedWithdrawal = await tx.withdrawal.update({
                where: { id },
                data: {
                    status,
                    referenceId,
                    adminNote,
                    rejectionReason: status === 'rejected' ? reason : null
                }
            });

            if (status === 'rejected') {
                // Refund Balance
                await tx.wallet.update({
                    where: { id: withdrawal.walletId },
                    data: { balance: { increment: withdrawal.amount } }
                });

                // Log Refund Transaction
                await tx.transaction.create({
                    data: {
                        walletId: withdrawal.walletId,
                        type: 'credit',
                        amount: withdrawal.amount,
                        category: 'refund',
                        status: 'success',
                        description: `Refund: Withdrawal Rejected. Reason: ${reason || adminNote || ''}`
                    }
                });
            }

            return updatedWithdrawal;
        });

        res.json({ message: `Withdrawal ${status}`, result });

    } catch (error) {
        res.status(500).json({ message: 'Processing failed', error: error.message });
    }
};

// --- System Analytics ---

exports.getSystemStats = async (req, res) => {
    try {
        const [userCount, vendorCount, activeCampaigns, totalTransactions] = await Promise.all([
            prisma.user.count({ where: { role: 'customer' } }),
            prisma.vendor.count(),
            prisma.campaign.count({ where: { status: 'active' } }),
            prisma.transaction.count()
        ]);

        res.json({
            users: userCount,
            vendors: vendorCount,
            activeCampaigns,
            totalTransactions
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

// --- User Management ---

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: { role: 'customer' },
                select: { id: true, name: true, email: true, phoneNumber: true, status: true, createdAt: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where: { role: 'customer' } })
        ]);

        res.json({
            users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active' or 'blocked'

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { status }
        });
        res.json({ message: `User ${status}`, user });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

// --- Global Audit ---

exports.getAllTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                include: { Wallet: { include: { User: { select: { name: true, email: true } }, Vendor: { select: { businessName: true } } } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.transaction.count()
        ]);

        res.json({
            transactions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

exports.getAllQRs = async (req, res) => {
    try {
        const qrs = await prisma.qRCode.findMany({
            include: { Campaign: { select: { title: true, Brand: { select: { name: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(qrs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching QRs', error: error.message });
    }
};

// --- Advanced Admin Controls ---

exports.verifyVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const newStatus = status === 'rejected' ? 'rejected' : 'active';

        const vendor = await prisma.vendor.update({
            where: { id },
            data: {
                status: newStatus,
                rejectionReason: newStatus === 'rejected' ? reason : null
            }
        });
        res.json({ message: `Vendor ${newStatus}`, vendor });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

exports.creditWallet = async (req, res) => {
    try {
        const { vendorId, amount, description } = req.body;

        // Transactional update
        const result = await prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.update({
                where: { vendorId },
                data: { balance: { increment: parseFloat(amount) } }
            });

            const transaction = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'credit',
                    amount: parseFloat(amount),
                    category: 'recharge', // Admin manual recharge
                    status: 'success',
                    description: description || 'Admin manual credit'
                }
            });
            return { wallet, transaction };
        });

        res.json({ message: 'Wallet credited successfully', data: result });
    } catch (error) {
        res.status(500).json({ message: 'Credit failed', error: error.message });
    }
};

exports.updateCampaignStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'paused', 'rejected', 'completed'

        if (!['active', 'paused', 'rejected', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const campaign = await prisma.campaign.update({
            where: { id },
            data: { status }
        });
        res.json({ message: `Campaign status updated to ${status}`, campaign });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.getVendorDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: {
                User: { select: { name: true, email: true, phoneNumber: true } },
                Wallet: true,
                Brands: { include: { Campaigns: true } }
            }
        });
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching details', error: error.message });
    }
};

// --- Payout Management ---

exports.getPendingWithdrawals = async (req, res) => {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
            where: { status: 'pending' },
            include: {
                PayoutMethod: true,
                Wallet: {
                    include: {
                        User: { select: { name: true, email: true } },
                        Vendor: { select: { businessName: true, contactPhone: true } }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching withdrawals', error: error.message });
    }
};

exports.processWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, referenceId, adminNote, reason } = req.body; // status: 'processed' or 'rejected'

        if (!['processed', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
            if (!withdrawal) throw new Error('Withdrawal request not found');
            if (withdrawal.status !== 'pending') throw new Error('Request already handled');

            // Update Withdrawal
            const updatedWithdrawal = await tx.withdrawal.update({
                where: { id },
                data: {
                    status,
                    referenceId,
                    adminNote,
                    rejectionReason: status === 'rejected' ? reason : null
                }
            });

            if (status === 'rejected') {
                // Refund Balance
                await tx.wallet.update({
                    where: { id: withdrawal.walletId },
                    data: { balance: { increment: withdrawal.amount } }
                });

                // Log Refund Transaction
                await tx.transaction.create({
                    data: {
                        walletId: withdrawal.walletId,
                        type: 'credit',
                        amount: withdrawal.amount,
                        category: 'refund',
                        status: 'success',
                        description: `Refund: Withdrawal Rejected. Reason: ${reason || adminNote || ''}`
                    }
                });
            }

            return updatedWithdrawal;
        });

        res.json({ message: `Withdrawal ${status}`, result });

    } catch (error) {
        res.status(500).json({ message: 'Processing failed', error: error.message });
    }
};

// --- Support & Usage ---

exports.getAllSupportTickets = async (req, res) => {
    try {
        const tickets = await prisma.supportTicket.findMany({
            include: { User: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
};

exports.replySupportTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { response, status } = req.body;

        const ticket = await prisma.supportTicket.update({
            where: { id },
            data: {
                response,
                status: status || 'resolved'
            }
        });
        res.json({ message: 'Ticket updated', ticket });
    } catch (error) {
        res.status(500).json({ message: 'Error updating ticket', error: error.message });
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { userId, title, message, type } = req.body;

        // If userId is 'all', send to all users (bulk create)
        if (userId === 'all') {
            const users = await prisma.user.findMany({ select: { id: true } });
            const notifications = users.map(user => ({
                userId: user.id,
                title,
                message,
                type: type || 'system'
            }));
            await prisma.notification.createMany({ data: notifications });
            return res.json({ message: `Notification sent to ${users.length} users` });
        }

        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type: type || 'system'
            }
        });
        res.status(201).json({ message: 'Notification sent', notification });
    } catch (error) {
        res.status(500).json({ message: 'Error sending notification', error: error.message });
    }
};
