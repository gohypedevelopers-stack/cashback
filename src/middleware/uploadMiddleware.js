const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DEFAULT_MAX_FILE_SIZE_MB = 10;
const parsedMaxSizeMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB);
const MAX_FILE_SIZE_MB = Number.isFinite(parsedMaxSizeMb) && parsedMaxSizeMb > 0
    ? parsedMaxSizeMb
    : DEFAULT_MAX_FILE_SIZE_MB;

// Ensure upload directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Storage Engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Unique filename: fieldname-timestamp.ext
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File Filter (Images Only)
const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Images Only! (jpeg, jpg, png, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: Math.round(MAX_FILE_SIZE_MB * 1024 * 1024) },
    fileFilter: fileFilter
});

upload.maxFileSizeMb = MAX_FILE_SIZE_MB;

module.exports = upload;
