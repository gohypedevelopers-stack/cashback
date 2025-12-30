exports.uploadFile = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return the accessible URL path
        // Assuming server serves 'uploads' folder statically
        const filePath = `/uploads/${req.file.filename}`;

        res.status(201).json({
            message: 'File uploaded successfully',
            url: filePath
        });
    } catch (error) {
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};
