const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    walletId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('credit', 'debit'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('recharge', 'qr_purchase', 'cashback_payout', 'refund'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'success', 'failed'),
        defaultValue: 'pending'
    },
    referenceId: {
        type: DataTypes.STRING // External gateway ID
    },
    description: {
        type: DataTypes.STRING
    }
});

module.exports = Transaction;
