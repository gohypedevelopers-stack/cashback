const prisma = require('../config/prismaClient');

// GET /api/wallet - Wallet summary for claim flow
exports.getWalletSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        let wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: {
                Transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: { userId, balance: 0.00, currency: 'INR' },
                include: { Transactions: true }
            });
        }

        const recentTransactions = wallet.Transactions.map((tx) => ({
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount),
            category: tx.category,
            status: tx.status,
            description: tx.description,
            referenceId: tx.referenceId,
            createdAt: tx.createdAt
        }));

        res.json({
            success: true,
            wallet: {
                balance: parseFloat(wallet.balance),
                currency: wallet.currency
            },
            recentTransactions
        });
    } catch (error) {
        console.error('Get wallet summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wallet summary',
            error: error.message
        });
    }
};

// Get Wallet Overview (Screen 8)
exports.getWalletOverview = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get or create wallet
        let wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: {
                Transactions: {
                    where: { status: 'success' },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: { userId, balance: 0.00 },
                include: { Transactions: true }
            });
        }

        // Calculate balances
        const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
        const pendingBalance = parseFloat(wallet.lockedBalance);

        // Calculate lifetime earnings (sum of all successful credit transactions)
        const lifetimeEarnings = await prisma.transaction.aggregate({
            where: {
                walletId: wallet.id,
                type: 'credit',
                category: 'cashback_payout',
                status: 'success'
            },
            _sum: { amount: true }
        });

        // Get recent transactions (last 5)
        const recentTransactions = wallet.Transactions.slice(0, 5).map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount),
            category: tx.category,
            status: tx.status,
            description: tx.description,
            referenceId: tx.referenceId,
            createdAt: tx.createdAt
        }));

        res.json({
            success: true,
            wallet: {
                availableBalance,
                pendingBalance,
                lifetimeEarnings: parseFloat(lifetimeEarnings._sum.amount || 0),
                currency: wallet.currency,
                recentTransactions
            }
        });

    } catch (error) {
        console.error('Get wallet overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wallet overview',
            error: error.message
        });
    }
};

// Get Transaction History (Screen 9)
exports.getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;

        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }

        // Build filter
        const where = { walletId: wallet.id };
        if (type) where.type = type;
        if (status) where.status = status;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        // Get total count
        const total = await prisma.transaction.count({ where });

        // Get paginated transactions
        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        res.json({
            success: true,
            transactions: transactions.map(tx => ({
                id: tx.id,
                type: tx.type,
                amount: parseFloat(tx.amount),
                category: tx.category,
                status: tx.status,
                description: tx.description,
                referenceId: tx.referenceId,
                createdAt: tx.createdAt
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get transaction history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction history',
            error: error.message
        });
    }
};

// Request Payout (Screen 10)
exports.requestPayout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, payoutMethodId } = req.body;

        // Configuration
        const MIN_PAYOUT_AMOUNT = 10;
        const DAILY_LIMIT = 5000;

        // Validate amount
        if (!amount || parseFloat(amount) < MIN_PAYOUT_AMOUNT) {
            return res.status(400).json({
                success: false,
                message: `Minimum payout amount is ₹${MIN_PAYOUT_AMOUNT}`
            });
        }

        // Get wallet
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }

        const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);

        // Check balance
        if (parseFloat(amount) > availableBalance) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Check daily limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayWithdrawals = await prisma.withdrawal.aggregate({
            where: {
                walletId: wallet.id,
                createdAt: { gte: today },
                status: { in: ['pending', 'processing', 'completed'] }
            },
            _sum: { amount: true }
        });

        const totalToday = parseFloat(todayWithdrawals._sum.amount || 0);
        if (totalToday + parseFloat(amount) > DAILY_LIMIT) {
            return res.status(400).json({
                success: false,
                message: `Daily limit of ₹${DAILY_LIMIT} exceeded. You've withdrawn ₹${totalToday} today.`
            });
        }

        // Verify payout method
        const payoutMethod = await prisma.payoutMethod.findUnique({
            where: { id: payoutMethodId }
        });

        if (!payoutMethod || payoutMethod.userId !== userId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payout method'
            });
        }

        // Create withdrawal request and lock balance
        const result = await prisma.$transaction(async (tx) => {
            // Lock balance
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { lockedBalance: { increment: parseFloat(amount) } }
            });

            // Create withdrawal request
            const withdrawal = await tx.withdrawal.create({
                data: {
                    walletId: wallet.id,
                    amount: parseFloat(amount),
                    status: 'pending',
                    payoutMethodId: payoutMethodId
                },
                include: { PayoutMethod: true }
            });

            return withdrawal;
        });

        res.json({
            success: true,
            message: 'Payout request created successfully',
            withdrawal: {
                id: result.id,
                amount: parseFloat(result.amount),
                status: result.status,
                payoutMethod: result.PayoutMethod.value,
                createdAt: result.createdAt
            }
        });

        console.log('[PAYOUT] initiated (wallet)', {
            userId,
            amount: parseFloat(amount),
            payoutMethodId,
            withdrawalId: result.id
        });

    } catch (error) {
        console.error('Request payout error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payout request',
            error: error.message
        });
    }
};

// Get Payout Status (Screen 11)
exports.getPayoutStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const withdrawal = await prisma.withdrawal.findUnique({
            where: { id },
            include: {
                PayoutMethod: true,
                Wallet: {
                    include: { User: true }
                }
            }
        });

        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Payout not found' });
        }

        // Verify ownership
        if (withdrawal.Wallet.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        res.json({
            success: true,
            payout: {
                id: withdrawal.id,
                amount: parseFloat(withdrawal.amount),
                status: withdrawal.status,
                payoutMethod: withdrawal.PayoutMethod.value,
                referenceId: withdrawal.referenceId,
                adminNote: withdrawal.adminNote,
                rejectionReason: withdrawal.rejectionReason,
                createdAt: withdrawal.createdAt,
                updatedAt: withdrawal.updatedAt
            }
        });

    } catch (error) {
        console.error('Get payout status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payout status',
            error: error.message
        });
    }
};

// Get user's payout methods
exports.getPayoutMethods = async (req, res) => {
    try {
        const userId = req.user.id;

        const methods = await prisma.payoutMethod.findMany({
            where: { userId },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
        });

        res.json({
            success: true,
            payoutMethods: methods.map(method => ({
                id: method.id,
                type: method.type,
                value: method.value,
                isPrimary: method.isPrimary,
                createdAt: method.createdAt
            }))
        });

    } catch (error) {
        console.error('Get payout methods error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payout methods',
            error: error.message
        });
    }
};

module.exports = exports;
