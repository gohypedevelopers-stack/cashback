const express = require('express');
const router = express.Router();
const { getDashboard, requestPayout, getRedemptionHistory, getTransactionHistory, updateUserProfile } = require('../controllers/userController');
const { scanAndRedeem } = require('../controllers/redemptionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboard);
router.post('/scan-qr/:hash', protect, scanAndRedeem);
router.post('/payout', protect, requestPayout);

router.get('/redemptions', protect, getRedemptionHistory);
router.get('/transactions', protect, getTransactionHistory);
router.put('/profile', protect, updateUserProfile);

module.exports = router;
