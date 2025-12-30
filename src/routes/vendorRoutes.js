const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getWalletBalance, rechargeWallet, orderQRs, getMyQRs, getDashboardStats, getVendorTransactions, getActiveCampaigns, updateVendorProfile, requestBrand, requestCampaign, getCampaignStats, addProduct, getVendorProducts, updateProduct, deleteProduct, updateBrand, updateCampaign, deleteBrand, deleteCampaign, updateCampaignStatus } = require('../controllers/vendorController');

router.use(protect);
router.use(authorize('vendor'));

router.get('/wallet', getWalletBalance);
router.post('/wallet/recharge', rechargeWallet); // In prod, this would be a payment gateway callback, not direct API
router.post('/qrs/order', orderQRs);
router.get('/qrs', getMyQRs);

router.get('/dashboard', getDashboardStats);
router.get('/transactions', getVendorTransactions);

// Brand, Campaign & Product Management
router.post('/brands', requestBrand);
router.put('/brands/:id', updateBrand);
router.delete('/brands/:id', deleteBrand); // Drafting Cleanup

router.post('/campaigns', requestCampaign);
router.put('/campaigns/:id', updateCampaign);
router.put('/campaigns/:id/status', updateCampaignStatus); // Pause/Resume
router.delete('/campaigns/:id', deleteCampaign); // Drafting Cleanup

router.get('/campaigns', getActiveCampaigns);
router.get('/campaigns/stats', getCampaignStats);
router.put('/profile', updateVendorProfile);

// Product Management
router.post('/products', addProduct);
router.get('/products', getVendorProducts);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

module.exports = router;

