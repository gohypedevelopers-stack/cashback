const express = require('express');
const router = express.Router();
const { previewClaim, redeemClaim, createClaim } = require('../controllers/claimController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/preview', previewClaim);
router.post('/redeem', protect, redeemClaim);

// TESTING ONLY: Admin-authenticated claim generator
router.post('/create', protect, authorize('admin'), createClaim);

module.exports = router;
