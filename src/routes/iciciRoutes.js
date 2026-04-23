const express = require('express');
const router = express.Router();
const { handleCallback, handleWebhook, processWebhook } = require('../controllers/iciciController');

// ICICI Payment Callback (Public - no auth required)
router.get('/callback', handleCallback);

// ICICI Webhook (Public)
router.get('/webhook', handleWebhook);   // Verification
router.post('/webhook', processWebhook); // Actual processing

module.exports = router;


