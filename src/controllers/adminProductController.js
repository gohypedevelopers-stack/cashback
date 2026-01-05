const prisma = require('../config/prismaClient');

// --- Admin Product Management ---

exports.createProduct = async (req, res) => {
    try {
        const { brandId, name, variant, category, description, packSize, warranty, imageUrl, bannerUrl } = req.body;

        // Check if brand exists
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        const product = await prisma.product.create({
            data: {
                brandId,
                name,
                variant,
                category,
                description,
                packSize,
                warranty,
                imageUrl,
                bannerUrl,
                status: 'active' // Admin products are active by default
            }
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error creating product', error: error.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const { brandId, type, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (brandId) where.brandId = brandId;

        if (type === 'admin') {
            where.Brand = { vendorId: null };
        } else if (type === 'vendor') {
            where.Brand = { vendorId: { not: null } };
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: { Brand: { select: { name: true, vendorId: true, Vendor: { select: { businessName: true } } } } },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.product.count({ where })
        ]);

        res.json({
            products,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id },
            include: { Brand: true }
        });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const product = await prisma.product.update({
            where: { id },
            data
        });
        res.json({ message: 'Product updated', product });
    } catch (error) {
        res.status(500).json({ message: 'Error updating product', error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};
