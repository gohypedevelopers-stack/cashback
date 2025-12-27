const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createBrand, getAllBrands,
    createCampaign, getAllCampaigns,
    getAllVendors, createVendorProfile,
    verifyBrand, verifyCampaign,
    getSystemStats, getAllUsers, updateUserStatus,
    getAllTransactions, getAllQRs,
    verifyVendor, creditWallet, updateCampaignStatus, getVendorDetails,
    getPendingWithdrawals, processWithdrawal
} = require('../controllers/adminController');

// All routes are protected and restricted to Admin
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getSystemStats);

// Brand Management
router.post('/brands', createBrand);
router.get('/brands', getAllBrands);
router.put('/brands/:id/verify', verifyBrand);

// Campaign Management
router.post('/campaigns', createCampaign);
router.get('/campaigns', getAllCampaigns);
router.put('/campaigns/:id/verify', verifyCampaign);
router.put('/campaigns/:id/status', updateCampaignStatus); // Force Status Update

// Vendor Management
router.get('/vendors', getAllVendors);
router.post('/vendors', createVendorProfile);
router.put('/vendors/:id/verify', verifyVendor); // Verify Vendor Onboarding
router.get('/vendors/:id', getVendorDetails); // Detailed View

// Wallet Management
router.post('/wallets/credit', creditWallet); // Manual Credit

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);

// System Audit
router.get('/transactions', getAllTransactions);
// Payout Management
router.get('/withdrawals', getPendingWithdrawals);
router.put('/withdrawals/:id/process', processWithdrawal);

module.exports = router;
