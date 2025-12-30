const express = require('express');
const router = express.Router();
const { register, login, getMe, sendOtp, verifyOtp, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
