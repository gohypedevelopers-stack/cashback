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
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/user', userRoutes);

app.get('/', (req, res) => {
    res.send('Coupon Cashback API is running...');
});

// Database Connection (Prisma connects lazily, but we can test connection)
const prisma = require('./config/prismaClient');

const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('Database Connected Successfully');

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
