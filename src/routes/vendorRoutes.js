const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getWalletBalance, rechargeWallet, orderQRs, getMyQRs } = require('../controllers/vendorController');

router.use(protect);
router.use(authorize('vendor'));

router.get('/wallet', getWalletBalance);
router.post('/wallet/recharge', rechargeWallet); // In prod, this would be a payment gateway callback, not direct API
router.post('/qrs/order', orderQRs);
router.get('/qrs', getMyQRs);

module.exports = router;
