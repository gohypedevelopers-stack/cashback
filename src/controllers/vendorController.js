const { Vendor, Wallet, Transaction, Campaign, QRCode, sequelize } = require('../models');
const crypto = require('crypto');

// Helper to generate unique hash
const generateQRHash = () => {
    return crypto.randomBytes(32).toString('hex');
};

exports.getWalletBalance = async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ where: { userId: req.user.id } });
        if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

        const wallet = await Wallet.findOne({ where: { vendorId: vendor.id } });
        if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wallet', error: error.message });
    }
};

exports.rechargeWallet = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { amount } = req.body; // In real app, this comes from Payment Gateway callback
        const vendor = await Vendor.findOne({ where: { userId: req.user.id } });
        if (!vendor) throw new Error('Vendor not found');

        const wallet = await Wallet.findOne({ where: { vendorId: vendor.id } });

        // Update Wallet
        wallet.balance = parseFloat(wallet.balance) + parseFloat(amount);
        await wallet.save({ transaction: t });

        // Log Transaction
        await Transaction.create({
            walletId: wallet.id,
            type: 'credit',
            amount,
            category: 'recharge',
            status: 'success',
            description: 'Wallet recharge'
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Wallet recharged successfully', balance: wallet.balance });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Recharge failed', error: error.message });
    }
};

exports.orderQRs = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { campaignId, quantity } = req.body;
        const vendor = await Vendor.findOne({ where: { userId: req.user.id } });

        const campaign = await Campaign.findByPk(campaignId);
        if (!campaign) throw new Error('Campaign not found');

        const totalCost = parseFloat(campaign.cashbackAmount) * parseInt(quantity);
        const wallet = await Wallet.findOne({ where: { vendorId: vendor.id } });

        if (parseFloat(wallet.balance) < totalCost) {
            throw new Error('Insufficient wallet balance');
        }

        // Deduct Balance
        wallet.balance = parseFloat(wallet.balance) - totalCost;
        await wallet.save({ transaction: t });

        // Log Transaction
        await Transaction.create({
            walletId: wallet.id,
            type: 'debit',
            amount: totalCost,
            category: 'qr_purchase',
            status: 'success',
            description: `Purchased ${quantity} QRs for Campaign ${campaign.title}`
        }, { transaction: t });

        // Generate QRs
        const qrData = [];
        for (let i = 0; i < quantity; i++) {
            qrData.push({
                campaignId,
                vendorId: vendor.id,
                uniqueHash: generateQRHash(),
                status: 'generated'
            });
        }

        const qrs = await QRCode.bulkCreate(qrData, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'QRs generated successfully', count: qrs.length });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Order failed', error: error.message });
    }
};

exports.getMyQRs = async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ where: { userId: req.user.id } });
        const qrs = await QRCode.findAll({ where: { vendorId: vendor.id } });
        res.json(qrs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching QRs', error: error.message });
    }
};
