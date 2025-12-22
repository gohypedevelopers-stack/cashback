const express = require('express');
const router = express.Router();
const { verifyQR, redeemQR } = require('../controllers/redemptionController');

router.get('/qrs/:hash', verifyQR);
router.post('/qrs/:hash/redeem', redeemQR);

module.exports = router;
