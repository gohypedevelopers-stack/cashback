const express = require('express');
const router = express.Router();
const { verifyQR, scanAndRedeem } = require('../controllers/redemptionController');

router.get('/qrs/:hash', verifyQR);
router.post('/qrs/:hash/redeem', scanAndRedeem);

module.exports = router;
