const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createBrand, getAllBrands,
    createCampaign, getAllCampaigns,
    getAllVendors, createVendorProfile
} = require('../controllers/adminController');

// All routes are protected and restricted to Admin
router.use(protect);
router.use(authorize('admin'));

// Brand Routes
router.post('/brands', createBrand);
router.get('/brands', getAllBrands);

// Campaign Routes
router.post('/campaigns', createCampaign);
router.get('/campaigns', getAllCampaigns);

// Vendor Routes
router.get('/vendors', getAllVendors);
router.post('/vendors', createVendorProfile);

module.exports = router;
