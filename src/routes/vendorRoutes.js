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
    requestCredentialUpdate,
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
    payCampaign,
    downloadOrderQrPdf,
    downloadCampaignQrPdf
} = require('../controllers/vendorController');

router.use(protect);
router.use(authorize('vendor'));
// router.use(requireActiveSubscription); // REMOVED GLOBAL APPLY

// --- OPEN ROUTES (Onboarding & Account Management) ---

// Wallet (Viewing & Recharging allowed without active subscription)
router.get('/wallet', getWalletBalance);
router.post('/wallet/recharge', rechargeWallet);

// Vendor Profile
router.get('/profile', getVendorProfile);
router.put('/profile', updateVendorProfile);
router.post('/credentials/request', requestCredentialUpdate);

// Brand Management (Creation & Viewing allowed)
router.get('/brands', getVendorBrands);
router.get('/brand', getVendorBrand);
router.post('/brand', upsertVendorBrand); // Admin only internally
router.post('/brands', requestBrand); // <--- CRITICAL: Must be open
router.put('/brands/:id', updateBrand);
router.delete('/brands/:id', deleteBrand);

// Dashboard (Basic stats allowed)
router.get('/dashboard', getDashboardStats);
router.get('/transactions', getVendorTransactions);

// --- RESTRICTED ROUTES (Requires Active Subscription) ---
const restrictedRouter = express.Router();
restrictedRouter.use(requireActiveSubscription);

// QR Codes
restrictedRouter.post('/qrs/order', orderQRs);
restrictedRouter.get('/qrs', getMyQRs);
restrictedRouter.delete('/qrs/batch', deleteQrBatch);

// QR Orders (with tracking)
restrictedRouter.get('/orders', getVendorOrders);
restrictedRouter.post('/orders', createOrder);
restrictedRouter.post('/orders/:orderId/pay', payOrder);
restrictedRouter.get('/orders/:orderId/download', downloadOrderQrPdf);

// Campaign Management
restrictedRouter.get('/campaigns', getVendorCampaigns);
restrictedRouter.post('/campaigns', requestCampaign);
restrictedRouter.put('/campaigns/:id', updateCampaign);
restrictedRouter.put('/campaigns/:id/status', updateCampaignStatus);
restrictedRouter.delete('/campaigns/:id', deleteCampaign);
restrictedRouter.get('/campaigns/stats', getCampaignStats);
restrictedRouter.get('/campaigns/:id/download', downloadCampaignQrPdf);

// Product Management
restrictedRouter.post('/campaigns/:id/pay', payCampaign);
restrictedRouter.post('/products', addProduct);
restrictedRouter.post('/products/import', importProducts);
restrictedRouter.get('/products', getVendorProducts);
restrictedRouter.put('/products/:id', updateProduct);
restrictedRouter.delete('/products/:id', deleteProduct);

// Mount Restricted Router
router.use('/', restrictedRouter);

module.exports = router;
