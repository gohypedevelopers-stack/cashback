const { sequelize } = require('../config/database');

const User = require('./User');
const Vendor = require('./Vendor');
const Brand = require('./Brand');
const Campaign = require('./Campaign');
const Wallet = require('./Wallet');
const QRCode = require('./QRCode');
const Transaction = require('./Transaction');

// User & Vendor
User.hasOne(Vendor, { foreignKey: 'userId', onDelete: 'CASCADE' });
Vendor.belongsTo(User, { foreignKey: 'userId' });

// Vendor & Wallet
Vendor.hasOne(Wallet, { foreignKey: 'vendorId', onDelete: 'CASCADE' });
Wallet.belongsTo(Vendor, { foreignKey: 'vendorId' });

// Brand & Campaign
Brand.hasMany(Campaign, { foreignKey: 'brandId', onDelete: 'CASCADE' });
Campaign.belongsTo(Brand, { foreignKey: 'brandId' });

// Campaign & QRCode
Campaign.hasMany(QRCode, { foreignKey: 'campaignId' });
QRCode.belongsTo(Campaign, { foreignKey: 'campaignId' });

// Vendor & QRCode (If QRs are assigned to vendors)
Vendor.hasMany(QRCode, { foreignKey: 'vendorId' });
QRCode.belongsTo(Vendor, { foreignKey: 'vendorId' });

// Wallet & Transaction
Wallet.hasMany(Transaction, { foreignKey: 'walletId' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId' });

module.exports = {
    sequelize,
    User,
    Vendor,
    Brand,
    Campaign,
    Wallet,
    QRCode,
    Transaction
};
