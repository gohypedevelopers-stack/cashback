const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch User with Wallet and recent Transactions
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                Wallet: {
                    include: {
                        Transactions: {
                            take: 10,
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Handle case where wallet might not exist yet
        const wallet = user.Wallet || { balance: '0.00', Transactions: [] };

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                avatarUrl: user.avatarUrl
            },
            wallet: {
                balance: wallet.balance,
                currency: 'INR'
            },
            recentTransactions: wallet.Transactions || []
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// requestPayout is deprecated and replaced by paymentController.requestWithdrawal
// routed via /api/user/payout -> requestWithdrawal

exports.getRedemptionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const redemptions = await prisma.qRCode.findMany({
            where: { redeemedByUserId: userId, status: 'redeemed' },
            include: { Campaign: { include: { Brand: true } } },
            orderBy: { redeemedAt: 'desc' }
        });
        res.json(redemptions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching redemptions', error: error.message });
    }
};

exports.getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { Wallet: true }
        });

        if (!user || !user.Wallet) return res.json({ transactions: [], count: 0 });

        const [transactions, count] = await Promise.all([
            prisma.transaction.findMany({
                where: { walletId: user.Wallet.id },
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: limit
            }),
            prisma.transaction.count({ where: { walletId: user.Wallet.id } })
        ]);

        res.json({
            transactions,
            pagination: {
                total: count,
                page: page,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const { name, email, username, phoneNumber } = req.body || {};

        const updates = {};
        if (typeof name === 'string') updates.name = name.trim() || null;
        if (typeof email === 'string') updates.email = email.trim().toLowerCase() || null;
        if (typeof username === 'string') updates.username = username.trim() || null;
        if (typeof phoneNumber === 'string') updates.phoneNumber = phoneNumber.trim() || null;

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: 'No profile updates provided' });
        }

        if (updates.email) {
            const existing = await prisma.user.findUnique({ where: { email: updates.email } });
            if (existing && existing.id !== req.user.id) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        if (updates.username) {
            const existing = await prisma.user.findUnique({ where: { username: updates.username } });
            if (existing && existing.id !== req.user.id) {
                return res.status(400).json({ message: 'Username already in use' });
            }
        }

        if (updates.phoneNumber) {
            const existing = await prisma.user.findUnique({ where: { phoneNumber: updates.phoneNumber } });
            if (existing && existing.id !== req.user.id) {
                return res.status(400).json({ message: 'Phone number already in use' });
            }
        }

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: updates
        });

        const { password, otp, otpExpires, resetPasswordToken, resetPasswordExpires, ...safeUser } = user;
        res.json({ message: 'Profile updated', user: safeUser });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const avatarUrl = `/uploads/${req.file.filename}`;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl }
        });

        res.json({ message: 'Avatar updated', avatarUrl, user });
    } catch (error) {
        res.status(500).json({ message: 'Avatar upload failed', error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
            return res.status(400).json({ message: 'Invalid old password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password', error: error.message });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Soft delete: changing status to inactive/blocked
        // We might also want to clear sensitive info? 
        // For now, just disabling access.

        await prisma.user.update({
            where: { id: userId },
            data: { status: 'inactive' } // or 'blocked', schema has 'inactive'
        });

        res.json({ message: 'Account deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting account', error: error.message });
    }
};

// --- New "More Flow" Features ---

exports.getAvailableOffers = async (req, res) => {
    try {
        const { search, brandId } = req.query;

        let whereClause = {
            status: 'active',
            endDate: { gt: new Date() }
        };

        if (brandId) {
            whereClause.brandId = brandId;
        }

        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const offers = await prisma.campaign.findMany({
            where: whereClause,
            include: { Brand: true },
            orderBy: { endDate: 'asc' }
        });
        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching offers', error: error.message });
    }
};

exports.getOfferDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await prisma.campaign.findUnique({
            where: { id },
            include: { Brand: true }
        });
        if (!offer) return res.status(404).json({ message: 'Offer not found' });
        res.json(offer);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching offer details', error: error.message });
    }
};

exports.getActiveBrands = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany({
            where: {
                status: 'active',
                Subscription: {
                    is: {
                        status: 'ACTIVE',
                        endDate: { gt: new Date() }
                    }
                }
            },
            select: { id: true, name: true, logoUrl: true, website: true }
        });
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
};

exports.createSupportTicket = async (req, res) => {
    try {
        const { subject, message } = req.body;
        const ticket = await prisma.supportTicket.create({
            data: {
                userId: req.user.id,
                subject,
                message,
                status: 'open'
            }
        });
        res.status(201).json({ message: 'Support ticket created', ticket });
    } catch (error) {
        res.status(500).json({ message: 'Ticket creation failed', error: error.message });
    }
};

exports.getSupportTickets = async (req, res) => {
    try {
        const tickets = await prisma.supportTicket.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification', error: error.message });
    }
};

// --- Catalog & Home API ---

exports.getHomeData = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany({
            where: { status: 'active' },
            take: 6,
            select: { id: true, name: true, logoUrl: true }
        });

        // Mocking Banners for now (could be dynamic in future)
        const banners = [
            { id: 1, title: "Join the Cashback Revolution", subtitle: "Scan & Earn Instantly", bg: "bg-teal-900", img: "/placeholder.svg" },
            { id: 2, title: "Trusted Brands Only", subtitle: "100% Authentic Products", bg: "bg-blue-900", img: "/placeholder.svg" }
        ];

        // Featured Products (Latest 4)
        const featuredProducts = await prisma.product.findMany({
            where: { status: 'active' },
            take: 4,
            orderBy: { createdAt: 'desc' },
            include: { Brand: true }
        });

        res.json({
            banners,
            brands,
            featuredProducts,
            stats: {
                productsOwned: 0, // Placeholder
                productsReported: 0 // Placeholder
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error loading home data', error: error.message });
    }
};

exports.getCatalog = async (req, res) => {
    try {
        const { search, brandId, category } = req.query;
        let whereClause = { status: 'active' };

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (brandId) whereClause.brandId = brandId;
        if (category) whereClause.category = category;

        const products = await prisma.product.findMany({
            where: whereClause,
            include: { Brand: true }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching catalog', error: error.message });
    }
};

exports.getProductDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id },
            include: { Brand: true }
        });

        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Heuristic: Find active campaign for this brand to show available reward
        const activeCampaign = await prisma.campaign.findFirst({
            where: { brandId: product.brandId, status: 'active' },
            orderBy: { cashbackAmount: 'desc' }
        });

        res.json({
            ...product,
            reward: activeCampaign ? `Up to â‚¹${activeCampaign.cashbackAmount}` : 'Check App',
            scheme: activeCampaign ? activeCampaign.title : 'Standard Offer'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
};

