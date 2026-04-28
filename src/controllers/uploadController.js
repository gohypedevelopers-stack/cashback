const path = require('path');
const fs = require('fs');

exports.uploadFile = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return the accessible API path
        const filePath = `/api/upload/${req.file.filename}`;

        res.status(201).json({
            message: 'File uploaded successfully',
            url: filePath
        });
    } catch (error) {
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

exports.serveFile = (req, res) => {
    try {
        const { filename } = req.params;
        // Basic filename validation to prevent path traversal
        if (!filename || filename.includes('..')) {
            return res.status(400).json({ message: 'Invalid filename' });
        }

        const filePath = path.join(__dirname, '../../uploads', filename);

        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).json({ message: 'File not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to serve file', error: error.message });
    }
};
