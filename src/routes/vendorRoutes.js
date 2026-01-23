const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { requireActiveSubscription } = require('../middleware/subscriptionMiddleware');
const {
    getWalletBalance,
    rechargeWallet,
    orderQRs,
    getMyQRs,
    deleteQrBatch,
    getDashboardStats,
    getVendorTransactions,
    getVendorCampaigns,
    getVendorProfile,
    updateVendorProfile,
    getVendorBrand,
    getVendorBrands,
    upsertVendorBrand,
    requestBrand,
    requestCampaign,
    getCampaignStats,
    addProduct,
    importProducts,
    getVendorProducts,
    updateProduct,
    deleteProduct,
    updateBrand,
    updateCampaign,
    deleteBrand,
    deleteCampaign,
    updateCampaignStatus,
    getVendorOrders,
    createOrder,
    payOrder,
    payCampaign
} = require('../controllers/vendorController');

router.use(protect);
router.use(authorize('vendor'));
router.use(requireActiveSubscription);

// Wallet
router.get('/wallet', getWalletBalance);
router.post('/wallet/recharge', rechargeWallet);

// QR Codes
router.post('/qrs/order', orderQRs);
router.get('/qrs', getMyQRs);
router.delete('/qrs/batch', deleteQrBatch);

// QR Orders (with tracking)
router.get('/orders', getVendorOrders);
router.post('/orders', createOrder);
router.post('/orders/:orderId/pay', payOrder);

// Dashboard & Transactions
router.get('/dashboard', getDashboardStats);
router.get('/transactions', getVendorTransactions);

// Vendor Profile
router.get('/profile', getVendorProfile);
router.put('/profile', updateVendorProfile);

// Brand Management
router.get('/brands', getVendorBrands);
router.get('/brand', getVendorBrand);
router.post('/brand', upsertVendorBrand);
router.post('/brands', requestBrand);
router.put('/brands/:id', updateBrand);
router.delete('/brands/:id', deleteBrand);

// Campaign Management
router.get('/campaigns', getVendorCampaigns);
router.post('/campaigns', requestCampaign);
router.put('/campaigns/:id', updateCampaign);
router.put('/campaigns/:id/status', updateCampaignStatus);
router.delete('/campaigns/:id', deleteCampaign);
router.get('/campaigns/stats', getCampaignStats);

// Product Management
router.post('/campaigns/:id/pay', payCampaign);
router.post('/products', addProduct);
router.post('/products/import', importProducts);
router.get('/products', getVendorProducts);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

module.exports = router;
