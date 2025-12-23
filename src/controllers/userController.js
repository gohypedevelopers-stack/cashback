const prisma = require('../config/prismaClient');

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
                phoneNumber: user.phoneNumber
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

exports.requestPayout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, upiId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid payout amount' });
        }

        await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                include: { Wallet: true }
            });

            if (!user) throw new Error('User not found');
            const wallet = user.Wallet;

            if (!wallet) throw new Error('Wallet not found');

            const payoutAmount = parseFloat(amount);
            const currentBalance = parseFloat(wallet.balance);

            if (currentBalance < payoutAmount) {
                throw new Error('Insufficient wallet balance');
            }

            // Deduct from Wallet
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { decrement: payoutAmount }
                }
            });

            // Create Transaction Record
            await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'debit',
                    amount: payoutAmount,
                    category: 'cashback_payout',
                    status: 'success', // Simulating instant success
                    description: `Payout to UPI: ${upiId || 'N/A'}`
                }
            });

            return updatedWallet;
        });

        res.json({
            success: true,
            message: 'Payout processed successfully',
            amount: amount,
            remainingBalance: (await prisma.wallet.findUnique({ where: { userId } })).balance
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Payout failed' });
    }
};