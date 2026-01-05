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

        // Recent Coupons (New Feature)
        const featuredCoupons = await prisma.coupon.findMany({
            where: { status: 'active' },
            take: 3,
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            banners,
            brands,
            featuredProducts,
            featuredCoupons,
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

exports.getFAQs = async (req, res) => {
    // Mock Data for Frontend Dev
    const faqs = [
        { id: 1, question: "How does cashback work?", answer: "Scan the QR code on the product package and get instant cashback to your wallet." },
        { id: 2, question: "How do I withdraw money?", answer: "Go to your Profile > Wallet and choose UPI or Bank Transfer." },
        { id: 3, question: "Is there a daily limit?", answer: "Yes, you can scan up to 10 products per day." }
    ];
    res.json(faqs);
};

exports.getStaticPage = async (req, res) => {
    const { slug } = req.params;

    // Mock Content
    const pages = {
        'terms': { title: "Terms & Conditions", content: "These are the terms..." },
        'privacy': { title: "Privacy Policy", content: "We respect your privacy..." },
        'about': { title: "About Us", content: "We are the cashback revolution." }
    };

    const page = pages[slug];
    if (page) {
        res.json(page);
    } else {
        res.status(404).json({ message: 'Page not found' });
    }
};

// --- Coupon Routes ---

exports.getPublicCoupons = async (req, res) => {
    try {
        const { platform, category } = req.query;
        let where = { status: 'active', expiryDate: { gt: new Date() } }; // Active, not expired

        if (platform) where.platform = platform;
        // if (category) where.category = category; // If we add category to coupon later

        const coupons = await prisma.coupon.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupons', error: error.message });
    }
};

exports.getCouponDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await prisma.coupon.findUnique({ where: { id } });

        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        // Hide details if desired? No, coupons usually have code visible or click to reveal
        res.json(coupon);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupon', error: error.message });
    }
};