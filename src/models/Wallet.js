const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('Wallet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
    },
    balance: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
    },
    lockedBalance: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'INR'
    }
});

module.exports = Wallet;
