const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const payoutController = require('../controllers/payoutController');
const { protect } = require('../middleware/authMiddleware');

// Wallet routes
router.get('/wallet/overview', protect, walletController.getWalletOverview);
router.get('/wallet/transactions', protect, walletController.getTransactionHistory);
router.post('/wallet/redeem', protect, walletController.requestPayout);
router.get('/payout/:id', protect, walletController.getPayoutStatus);

// UPI Management routes
router.get('/payout-methods', protect, walletController.getPayoutMethods);
router.post('/payout-methods/upi', protect, payoutController.addUPIMethod);
router.put('/payout-methods/primary', protect, payoutController.setPrimaryUPI);
router.delete('/payout-methods/:id', protect, payoutController.deleteUPIMethod);

module.exports = router;
