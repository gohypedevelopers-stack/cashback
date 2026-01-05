const express = require('express');
const router = express.Router();
const {
    getHomeData,
    getCatalog,
    getProductDetails,
    getCategories,
    getActiveBrands,
    getBrandDetails,
    getFAQs,
    getStaticPage,
    getPublicCoupons,
    getCouponDetails
} = require('../controllers/publicController');
const { verifyQR } = require('../controllers/redemptionController');

// Universal / Public Routes (No Login Required)

router.get('/home', getHomeData);          // Home Screen
router.get('/products', getCatalog);       // Product Catalog / Gift Cards (filtered by category)
router.get('/products/:id', getProductDetails); // Product Info
router.get('/categories', getCategories);  // List Categories
router.get('/brands', getActiveBrands);    // Brand List
router.get('/brands/:id', getBrandDetails); // Brand Details
router.get('/qrs/:hash', verifyQR);        // Check QR Validity (Public)
router.get('/faqs', getFAQs);              // Common Questions
router.get('/content/:slug', getStaticPage); // Static Pages (terms, privacy)

// New Coupon Routes
router.get('/coupons', getPublicCoupons);
router.get('/coupons/:id', getCouponDetails);

module.exports = router;