const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createBrand, getAllBrands, getSubscriptions, updateVendorSubscription,
    createCampaign, getAllCampaigns, updateCampaignDetails, getCampaignAnalytics,
    getAllVendors, createVendorProfile,
    verifyBrand, verifyCampaign,
    getSystemStats, getAllUsers, updateUserStatus,
    getAllTransactions, getAllQRs, getQrBatch,
    verifyVendor, creditWallet, adjustWalletBalance, updateCampaignStatus, getVendorDetails,
    getVendorOverview, updateVendorDetails, updateVendorCredentials, getVendorCredentialRequests,
    approveCredentialRequest, rejectCredentialRequest, getBrandOverview, updateBrandDetails,
    getPendingWithdrawals, processWithdrawal,
    getAllSupportTickets, replySupportTicket, sendNotification, getNotifications,
    getAllOrders, updateOrderStatus,
    deleteCampaign
} = require('../controllers/adminController');

const {
    createProduct, getAllProducts, getProduct, updateProduct, deleteProduct
} = require('../controllers/adminProductController');

const {
    createCoupon, getAllCoupons, getCouponById, updateCoupon, deleteCoupon
} = require('../controllers/couponController');

// All routes are protected and restricted to Admin
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getSystemStats);

// Brand Management
router.post('/brands', createBrand);
router.get('/brands', getAllBrands);
router.get('/brands/:id', getBrandOverview);
router.put('/brands/:id', updateBrandDetails);
router.get('/subscriptions', getSubscriptions);
router.put('/brands/:id/verify', verifyBrand);

// Product Management (Admin Managed)
router.post('/products', createProduct);
router.get('/products', getAllProducts);
router.get('/products/:id', getProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct); // Overrides previous force delete

// Campaign Management
router.post('/campaigns', createCampaign);
router.get('/campaigns', getAllCampaigns);
router.get('/campaigns/:id/analytics', getCampaignAnalytics);
router.put('/campaigns/:id', updateCampaignDetails);
router.put('/campaigns/:id/verify', verifyCampaign);
router.put('/campaigns/:id/status', updateCampaignStatus); // Force Status Update
router.delete('/campaigns/:id', deleteCampaign);

// Coupon Management (External Coupons)
router.post('/coupons', createCoupon);
router.get('/coupons', getAllCoupons);
router.get('/coupons/:id', getCouponById);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Vendor Management
router.get('/vendors', getAllVendors);
router.post('/vendors', createVendorProfile);
router.put('/vendors/:id/verify', verifyVendor); // Verify Vendor Onboarding
router.get('/vendors/:id/overview', getVendorOverview);
router.get('/vendors/:id', getVendorDetails); // Detailed View
router.put('/vendors/:id', updateVendorDetails);
router.put('/vendors/:id/credentials', updateVendorCredentials);
router.put('/vendors/:id/subscription', updateVendorSubscription);
router.get('/vendors/:id/credential-requests', getVendorCredentialRequests);
router.put('/credential-requests/:id/approve', approveCredentialRequest);
router.put('/credential-requests/:id/reject', rejectCredentialRequest);

// Wallet Management
router.post('/wallets/credit', creditWallet); // Manual Credit
router.post('/wallets/adjust', adjustWalletBalance);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);

// System Audit
router.get('/transactions', getAllTransactions);
router.get('/qrs/batch', getQrBatch);
router.get('/qrs', getAllQRs); // Added missing QR route

// Payout Management
router.get('/withdrawals', getPendingWithdrawals);
router.put('/withdrawals/:id/process', processWithdrawal);

// Support & Notifications
router.get('/support', getAllSupportTickets);
router.put('/support/:id', replySupportTicket);
router.post('/notifications', sendNotification);
router.get('/notifications', getNotifications);

// QR Order Management
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;
