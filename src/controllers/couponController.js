const prisma = require('../config/prismaClient');

// --- Coupon Management ---

exports.createCoupon = async (req, res) => {
    try {
        const {
            code, description, discountType, discountValue,
            minPurchaseAmount, maxDiscountAmount, expiryDate,
            platform, url, imageUrl
        } = req.body;

        const coupon = await prisma.coupon.create({
            data: {
                code,
                description,
                discountType,
                discountValue,
                minPurchaseAmount,
                maxDiscountAmount,
                expiryDate: new Date(expiryDate),
                platform,
                url,
                imageUrl,
                status: 'active'
            }
        });
        res.status(201).json(coupon);
    } catch (error) {
        // Handle unique constraint violation for code
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Coupon with this code already exists' });
        }
        res.status(500).json({ message: 'Error creating coupon', error: error.message });
    }
};

exports.getAllCoupons = async (req, res) => {
    try {
        const { page = 1, limit = 20, platform } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (platform) where.platform = platform;

        const [coupons, total] = await Promise.all([
            prisma.coupon.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.coupon.count({ where })
        ]);

        res.json({
            coupons,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupons', error: error.message });
    }
};

exports.getCouponById = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await prisma.coupon.findUnique({ where: { id } });
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        res.json(coupon);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupon', error: error.message });
    }
};

exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (data.expiryDate) {
            data.expiryDate = new Date(data.expiryDate);
        }

        const coupon = await prisma.coupon.update({
            where: { id },
            data
        });
        res.json({ message: 'Coupon updated', coupon });
    } catch (error) {
        res.status(500).json({ message: 'Error updating coupon', error: error.message });
    }
};

exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.coupon.delete({ where: { id } });
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting coupon', error: error.message });
    }
};
