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
    getGiftCardCategories,
    getGiftCards,
    getGiftCardDetails,
    getStoreData,
    getPublicCoupons,
    getCouponDetails,
    createBrandInquiry
} = require('../controllers/publicController');
const { verifyQR } = require('../controllers/redemptionController');

// Universal / Public Routes (No Login Required)

router.get('/home', getHomeData);          // Home Screen
router.get('/products', getCatalog);       // Product Catalog / Gift Cards (filtered by category)
router.get('/products/:id', getProductDetails); // Product Info
router.get('/categories', getCategories);  // List Categories
router.get('/brands', getActiveBrands);    // Brand List
router.get('/brands/:id', getBrandDetails); // Brand Details
router.post('/brands/:id/inquiry', createBrandInquiry); // Brand Inquiry
router.get('/qrs/:hash', verifyQR);        // Check QR Validity (Public)
router.get('/giftcards', getGiftCards);
router.get('/giftcards/categories', getGiftCardCategories);
router.get('/giftcards/:id', getGiftCardDetails);
router.get('/store', getStoreData);
router.get('/faqs', getFAQs);              // Common Questions
router.get('/content/:slug', getStaticPage); // Static Pages (terms, privacy)

// New Coupon Routes
router.get('/coupons', getPublicCoupons);
router.get('/coupons/:id', getCouponDetails);

module.exports = router;
