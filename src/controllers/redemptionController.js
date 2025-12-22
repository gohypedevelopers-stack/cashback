const { QRCode, Campaign, Brand, Transaction, Wallet } = require('../models');
const { sequelize } = require('../config/database');

exports.verifyQR = async (req, res) => {
    try {
        const { hash } = req.params;
        const qr = await QRCode.findOne({
            where: { uniqueHash: hash },
            include: [{
                model: Campaign,
                include: [Brand]
            }]
        });

        if (!qr) return res.status(404).json({ message: 'Invalid QR Code' });

        if (qr.status === 'redeemed') {
            return res.status(400).json({ message: 'QR Code already redeemed', qr });
        }

        if (qr.status !== 'generated' && qr.status !== 'assigned') {
            // Assuming 'generated' or 'assigned' are valid states for scanning.
            // If strict 'active' state is needed, the vendor normally 'activates' them.
            // For simplicity, let's allow redemption from 'generated'/'assigned'.
            return res.status(400).json({ message: 'QR Code not active', status: qr.status });
        }

        // Check Campaign Validity
        const now = new Date();
        if (now < new Date(qr.Campaign.startDate) || now > new Date(qr.Campaign.endDate)) {
            return res.status(400).json({ message: 'Campaign expired or not started' });
        }

        res.json({
            valid: true,
            amount: qr.Campaign.cashbackAmount,
            brand: qr.Campaign.Brand.name,
            campaign: qr.Campaign.title
        });

    } catch (error) {
        res.status(500).json({ message: 'Error verifying QR', error: error.message });
    }
};

exports.scanAndRedeem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { hash } = req.params;
        const userId = req.user.id; // From Auth Middleware

        const qr = await QRCode.findOne({
            where: { uniqueHash: hash },
            include: [Campaign]
        });

        if (!qr) throw new Error('Invalid QR Code');
        if (qr.status === 'redeemed') throw new Error('QR Code already redeemed');
        if (qr.status !== 'generated' && qr.status !== 'assigned') throw new Error('QR Code not active');

        // Check Campaign Validity
        const now = new Date();
        if (now < new Date(qr.Campaign.startDate) || now > new Date(qr.Campaign.endDate)) {
            throw new Error('Campaign expired or not started');
        }

        const cashbackAmount = parseFloat(qr.Campaign.cashbackAmount);

        // Find or Create User Wallet
        let wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) {
            wallet = await Wallet.create({ userId, balance: 0.00 }, { transaction: t });
        }

        // Credit Wallet
        wallet.balance = parseFloat(wallet.balance) + cashbackAmount;
        await wallet.save({ transaction: t });

        // Record Transaction
        await Transaction.create({
            walletId: wallet.id,
            type: 'credit',
            amount: cashbackAmount,
            category: 'cashback_payout',
            status: 'success',
            description: `Cashback for Campaign: ${qr.Campaign.title}`,
            referenceId: hash
        }, { transaction: t });

        // Update QR Status
        qr.status = 'redeemed';
        qr.redeemedByUserId = userId;
        qr.redeemedAt = now;
        qr.payoutTransactionId = `WALLET_${wallet.id}_${Date.now()}`;
        await qr.save({ transaction: t });

        await t.commit();

        res.json({
            success: true,
            message: 'Cashback added to wallet successfully',
            amount: cashbackAmount,
            newBalance: wallet.balance
        });

    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Redemption failed', error: error.message });
    }
};
