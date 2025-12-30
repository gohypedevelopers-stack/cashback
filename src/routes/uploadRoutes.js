const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { uploadFile } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

// Protect route (Only logged in users can upload)
router.post('/', protect, upload.single('image'), uploadFile);

module.exports = router;
