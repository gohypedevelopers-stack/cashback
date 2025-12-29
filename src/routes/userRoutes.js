const express = require('express');
const router = express.Router();
const {
    getDashboard, getRedemptionHistory, getTransactionHistory, updateUserProfile,
    getAvailableOffers, createSupportTicket, getSupportTickets,
    getNotifications, markNotificationRead
} = require('../controllers/userController');
const { requestWithdrawal } = require('../controllers/paymentController');
const { scanAndRedeem } = require('../controllers/redemptionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboard);
router.post('/scan-qr/:hash', protect, scanAndRedeem);
router.post('/payout', protect, requestWithdrawal); // Uses new Payment Controller Logic

router.get('/redemptions', protect, getRedemptionHistory);
router.get('/transactions', protect, getTransactionHistory);
router.put('/profile', protect, updateUserProfile);

// New Features
router.get('/offers', protect, getAvailableOffers); // Searchable
router.post('/support', protect, createSupportTicket);
router.get('/support', protect, getSupportTickets); // History

router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);

// Explorer - Use /api/public/...
// router.get('/home', protect, getHomeData); 
// router.get('/products', protect, getCatalog);
// router.get('/products/:id', protect, getProductDetails);

module.exports = router;
