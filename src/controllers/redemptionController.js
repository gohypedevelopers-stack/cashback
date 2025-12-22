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

exports.redeemQR = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { hash } = req.params;
        const { upiId } = req.body;

        if (!upiId) return res.status(400).json({ message: 'UPI ID is required' });

        const qr = await QRCode.findOne({
            where: { uniqueHash: hash },
            include: [Campaign]
        });

        if (!qr) throw new Error('Invalid QR Code');
        if (qr.status === 'redeemed') throw new Error('QR Code already redeemed');

        // Update QR Status
        qr.status = 'redeemed';
        qr.redeemedAt = new Date();
        qr.payoutTransactionId = `PAY_${Date.now()}_${Math.floor(Math.random() * 1000)}`; // Mock Payout ID
        await qr.save({ transaction: t });

        // In a real system, we might need to record this payout in a central ledger 
        // or trigger an async job for the UPI API. 
        // Here we just log it as a transaction for the Campaign/Brand context if needed,
        // but the money was already deducted from Vendor Wallet during creation.
        // We can optionally create a 'payout' transaction record linked to the vendor wallet purely for reporting.

        // Find vendor wallet to link the payout record (for reporting)
        // Note: Amount is 0 here because it was already debited, or we track it as a 'cashback_payout' 
        // with 0 impact on balance if we use a modification of the logic.
        // For now, let's just create a record that doesn't affect balance, or affects a 'payouts' accumulator.
        // Simplifying: Just mock the success response.

        await t.commit();

        res.json({
            success: true,
            message: 'Cashback redemption initiated successfully',
            transactionId: qr.payoutTransactionId,
            amount: qr.Campaign.cashbackAmount
        });

    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Redemption failed', error: error.message });
    }
};
