const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QRCode = sequelize.define('QRCode', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    campaignId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    vendorId: {
        type: DataTypes.UUID, // Only if QR batches are pre-assigned to a vendor
        allowNull: true
    },
    uniqueHash: {
        type: DataTypes.STRING,
        allowNull: false, // In real app, this is the encrypted payload
        unique: true
    },
    status: {
        type: DataTypes.ENUM('generated', 'assigned', 'active', 'redeemed', 'expired', 'blocked'),
        defaultValue: 'generated'
    },
    redeemedByUserId: { // Optional if we track which customer redeemed it (if login was required, but req says no login for customer)
        type: DataTypes.UUID,
        allowNull: true
    },
    redeemedAt: {
        type: DataTypes.DATE
    },
    payoutTransactionId: {
        type: DataTypes.STRING
    }
});

module.exports = QRCode;
