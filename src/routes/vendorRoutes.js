const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getWalletBalance,
    rechargeWallet,
    orderQRs,
    rechargeQrInventory,
    getVendorQrInventorySeries,
    importVendorQrInventorySeries,
    getMyQRs,
    deleteQrBatch,
    getDashboardStats,
    getVendorTransactions,
    getVendorWalletTransactionsDetailed,
    exportVendorWalletTransactions,
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
    downloadVendorInventoryQrPdf,
    downloadCampaignQrPdf,
    getVendorRedemptions,
    exportVendorRedemptions,
    getVendorRedemptionsMap,
    getVendorSummaryAnalytics,
    getVendorCustomers,
    exportVendorCustomers,
    getVendorInvoices,
    downloadVendorInvoicePdf,
    shareVendorInvoice,
    createVendorSupportTicket,
    getVendorSupportTickets,
    getVendorProductReports,
    downloadVendorProductReport,
    assignSheetCashback,
    paySheetCashback
} = require('../controllers/vendorController');

router.use(protect);
router.use(authorize('vendor'));

// --- OPEN ROUTES (Onboarding & Account Management) ---

// Wallet
router.get('/wallet', getWalletBalance);
router.post('/wallet/recharge', rechargeWallet);
router.get('/wallet/transactions', getVendorWalletTransactionsDetailed);
router.get('/wallet/transactions/export', exportVendorWalletTransactions);

// Vendor Profile
router.get('/profile', getVendorProfile);
router.put('/profile', updateVendorProfile);
router.post('/credentials/request', requestCredentialUpdate);

// Brand Management (Creation & Viewing allowed)
router.get('/brands', getVendorBrands);
router.get('/brand', getVendorBrand);
router.post('/brand', upsertVendorBrand);
router.post('/brands', requestBrand); // <--- CRITICAL: Must be open
router.put('/brands/:id', updateBrand);
router.delete('/brands/:id', deleteBrand);

// Dashboard (Basic stats allowed)
router.get('/dashboard', getDashboardStats);
router.get('/transactions', getVendorTransactions);

// Support Tickets (Open - vendor can always contact support)
router.get('/support', getVendorSupportTickets);
router.post('/support', createVendorSupportTicket);

// --- VENDOR ROUTES ---
const restrictedRouter = express.Router();

// QR Codes
restrictedRouter.post('/qrs/order', orderQRs);
restrictedRouter.post('/qrs/recharge', rechargeQrInventory);
restrictedRouter.get('/qrs/inventory/series', getVendorQrInventorySeries);
restrictedRouter.post('/qrs/inventory/import', importVendorQrInventorySeries);
restrictedRouter.get('/qrs/inventory/download', downloadVendorInventoryQrPdf);
restrictedRouter.get('/qrs', getMyQRs);
restrictedRouter.delete('/qrs/batch', deleteQrBatch);

// QR Orders (with tracking)
restrictedRouter.get('/orders', getVendorOrders);
restrictedRouter.post('/orders', createOrder);
restrictedRouter.post('/orders/:orderId/pay', payOrder);
restrictedRouter.get('/orders/:orderId/download', downloadOrderQrPdf);

// Redemptions (B11 - Customer Data)
restrictedRouter.get('/redemptions', getVendorRedemptions);
restrictedRouter.get('/redemptions/export', exportVendorRedemptions);
restrictedRouter.get('/redemptions/map', getVendorRedemptionsMap);
restrictedRouter.get('/analytics/summary', getVendorSummaryAnalytics);
restrictedRouter.get('/customers', getVendorCustomers);
restrictedRouter.get('/customers/export', exportVendorCustomers);

// Campaign Management
restrictedRouter.get('/campaigns', getVendorCampaigns);
restrictedRouter.post('/campaigns', requestCampaign);
restrictedRouter.put('/campaigns/:id', updateCampaign);
restrictedRouter.put('/campaigns/:id/status', updateCampaignStatus);
restrictedRouter.delete('/campaigns/:id', deleteCampaign);
restrictedRouter.get('/campaigns/stats', getCampaignStats);
restrictedRouter.get('/campaigns/:id/download', downloadCampaignQrPdf);
restrictedRouter.put('/campaigns/:id/sheet-cashback', assignSheetCashback);
restrictedRouter.post('/campaigns/:id/sheet-pay', paySheetCashback);

// Product Management
restrictedRouter.post('/campaigns/:id/pay', payCampaign);
restrictedRouter.post('/products', addProduct);
restrictedRouter.post('/products/import', importProducts);
restrictedRouter.get('/products', getVendorProducts);
restrictedRouter.put('/products/:id', updateProduct);
restrictedRouter.delete('/products/:id', deleteProduct);
restrictedRouter.get('/product-reports', getVendorProductReports);
restrictedRouter.get('/product-reports/:id/download', downloadVendorProductReport);

// Billing
restrictedRouter.get('/invoices', getVendorInvoices);
restrictedRouter.get('/invoices/:id/pdf', downloadVendorInvoicePdf);
restrictedRouter.post('/invoices/:id/share', shareVendorInvoice);

// Mount Restricted Router
router.use('/', restrictedRouter);

module.exports = router;
