const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Public health check endpoint
router.get('/', healthController.getHealthStatus);

module.exports = router;
