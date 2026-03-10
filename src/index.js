require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const { connectDB } = require('./config/database'); // Removed
// const { sequelize } = require('./models'); // Removed
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const publicRoutes = require('./routes/publicRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const walletRoutes = require('./routes/walletRoutes');
const claimRoutes = require('./routes/claimRoutes');
const path = require('path');
const { startBulkExportWorker } = require('./services/bulkQrExportService');

const app = express();
const corsOptions = {
    origin: true,
    credentials: true,
    maxAge: 86400,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow accessing images from other domains/frontend
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads Static Folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes); // New Route
app.use('/api/wallet', walletRoutes); // Wallet & Payout Routes
app.use('/api/claim', claimRoutes); // Claim QR routes

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.get('/', (req, res) => {
    res.send('Coupon Cashback API is running...');
});

// Database Connection (Prisma connects lazily, but we can test connection)
const prisma = require('./config/prismaClient');

const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('Database Connected Successfully');
        startBulkExportWorker();

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

