const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/userController');
const { scanAndRedeem } = require('../controllers/redemptionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboard);
router.post('/scan-qr/:hash', protect, scanAndRedeem);
router.post('/payout', protect, requestPayout);

module.exports = router;
