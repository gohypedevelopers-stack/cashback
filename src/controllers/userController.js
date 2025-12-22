const { User, Wallet, Transaction } = require('../models');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch User with Wallet and recent Transactions
        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'phoneNumber', 'email'],
            include: [{
                model: Wallet,
                as: 'Wallet', // Assuming association alias, or default 'Wallet'
                include: [{
                    model: Transaction,
                    limit: 10,
                    order: [['createdAt', 'DESC']]
                }]
            }]
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
