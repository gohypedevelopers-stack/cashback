const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Campaign = sequelize.define('Campaign', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    brandId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    cashbackAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    totalBudget: {
        type: DataTypes.DECIMAL(12, 2)
    },
    status: {
        type: DataTypes.ENUM('active', 'paused', 'completed'),
        defaultValue: 'active'
    }
});

module.exports = Campaign;
