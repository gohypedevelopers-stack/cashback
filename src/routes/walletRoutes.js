const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const payoutController = require('../controllers/payoutController');
const { protect } = require('../middleware/authMiddleware');

// Wallet routes
router.get('/', protect, walletController.getWalletSummary);
router.get('/overview', protect, walletController.getWalletOverview);
router.get('/transactions', protect, walletController.getTransactionHistory);
router.post('/redeem', protect, walletController.requestPayout);
router.get('/payout/:id', protect, walletController.getPayoutStatus);

// Legacy paths (kept for backward compatibility)
router.get('/wallet/overview', protect, walletController.getWalletOverview);
router.get('/wallet/transactions', protect, walletController.getTransactionHistory);
router.post('/wallet/redeem', protect, walletController.requestPayout);

// UPI Management routes
router.get('/payout-methods', protect, walletController.getPayoutMethods);
router.post('/payout-methods/upi', protect, payoutController.addUPIMethod);
router.put('/payout-methods/primary', protect, payoutController.setPrimaryUPI);
router.delete('/payout-methods/:id', protect, payoutController.deleteUPIMethod);

module.exports = router;
