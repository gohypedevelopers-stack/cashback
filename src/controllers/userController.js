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
