const prisma = require('../config/prismaClient');

// --- Home Data (Universal) ---
exports.getHomeData = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany({
            where: { status: 'active' },
            take: 6,
            select: { id: true, name: true, logoUrl: true }
        });

        // Mock Banners (Move to DB if needed later)
        const banners = [
            { id: 1, title: "Get Upto ₹15000 on Scanning Products", subtitle: "From Double Tiger Tea", bg: "bg-teal-900", img: "https://via.placeholder.com/100" },
            { id: 2, title: "Win Gold Coins Daily", subtitle: "Scan Heritage Milk Packs", bg: "bg-blue-900", img: "https://via.placeholder.com/100" }
        ];

        // Featured Products
        const featuredProducts = await prisma.product.findMany({
            where: { status: 'active' },
            take: 4,
            orderBy: { createdAt: 'desc' },
            include: { Brand: true }
        });

        res.json({
            banners,
            brands,
            featuredProducts,
            stats: { productsOwned: 0, productsReported: 0 } // Placeholders for guest
        });
    } catch (error) {
        res.status(500).json({ message: 'Error loading home data', error: error.message });
    }
};

// --- Product Catalog ---
exports.getCatalog = async (req, res) => {
    try {
        const { search, brandId, category } = req.query;
        let whereClause = { status: 'active' };

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (brandId) whereClause.brandId = brandId;
        if (category) whereClause.category = category;

        const products = await prisma.product.findMany({
            where: whereClause,
            include: { Brand: true }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching catalog', error: error.message });
    }
};

exports.getProductDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id },
            include: { Brand: true }
        });

        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Find associated active campaign reward
        const activeCampaign = await prisma.campaign.findFirst({
            where: { brandId: product.brandId, status: 'active' },
            orderBy: { cashbackAmount: 'desc' }
        });

        res.json({
            ...product,
            reward: activeCampaign ? `Up to ₹${activeCampaign.cashbackAmount}` : 'Check App',
            scheme: activeCampaign ? activeCampaign.title : 'Standard Offer'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        // Group by category to return unique list
        const categories = await prisma.product.groupBy({
            by: ['category'],
            where: { status: 'active' },
            _count: true
        });
        res.json(categories.map(c => ({ id: c.category, name: c.category, count: c._count })));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
};

exports.getActiveBrands = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany({
            where: { status: 'active' },
            select: { id: true, name: true, logoUrl: true, website: true }
        });
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
};

exports.getBrandDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const brand = await prisma.brand.findUnique({
            where: { id },
            include: {
                Products: {
                    where: { status: 'active' }
                },
                Vendor: {
                    include: { User: { select: { email: true } } }
                }
            }
        });

        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        // Shape data for frontend
        const brandData = {
            id: brand.id,
            name: brand.name,
            logo: brand.logoUrl,
            banner: brand.logoUrl, // Fallback as we don't have banner in schema
            website: brand.website,
            email: brand.Vendor?.User?.email || "contact@brand.com",
            about: "Trusted Brand Partner of GoHype.", // Default
            tags: ["Verified", "Premium"], // Default
            products: brand.Products.map(p => ({
                id: p.id,
                name: p.name,
                variant: p.variant,
                image: p.imageUrl,
                reward: "Check App", // Could fetch campaign if needed
                category: p.category
            }))
        };

        res.json(brandData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brand details', error: error.message });
    }
};
