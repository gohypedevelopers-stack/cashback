const prisma = require('../config/prismaClient');
const { giftCardCategories, giftCards, storeTabs, storeCategories, vouchers, storeProducts } = require('../data/publicCatalog');

const toPositiveNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const formatCashbackValue = (value) => {
    if (!Number.isFinite(value)) return null;
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
};

const normalizeProduct = (product) => {
    if (!product) return product;
    return {
        ...product,
        mrp: product.mrp !== null && product.mrp !== undefined ? Number(product.mrp) : null
    };
};

const getCampaignCashbackRange = (campaign, productId) => {
    if (!campaign) return null;
    const amounts = [];

    const base = toPositiveNumber(campaign.cashbackAmount);
    if (base) amounts.push(base);

    const allocations = Array.isArray(campaign.allocations) ? campaign.allocations : [];
    allocations.forEach((alloc) => {
        if (productId && alloc?.productId && alloc.productId !== productId) return;
        const amount = toPositiveNumber(alloc?.cashbackAmount);
        if (amount) amounts.push(amount);
    });

    if (!amounts.length) return null;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    return { min, max };
};

const getCampaignRewardLabel = (campaign, productId) => {
    const range = getCampaignCashbackRange(campaign, productId);
    if (!range) return 'Check App';
    const minLabel = formatCashbackValue(range.min);
    const maxLabel = formatCashbackValue(range.max);
    if (!minLabel || !maxLabel) return 'Check App';
    if (range.min === range.max) return `Up to INR ${maxLabel}`;
    return `Up to INR ${minLabel} - ${maxLabel}`;
};

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
            { id: 1, title: "Get Upto â‚¹15000 on Scanning Products", subtitle: "From Double Tiger Tea", bg: "bg-teal-900", img: "/placeholder.svg" },
            { id: 2, title: "Win Gold Coins Daily", subtitle: "Scan Heritage Milk Packs", bg: "bg-blue-900", img: "/placeholder.svg" }
        ];

        // Featured Products
        const featuredProductsRaw = await prisma.product.findMany({
            where: { status: 'active' },
            take: 4,
            orderBy: { createdAt: 'desc' },
            include: { Brand: true }
        });
        const featuredProducts = featuredProductsRaw.map((product) => normalizeProduct(product));

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

        const productsRaw = await prisma.product.findMany({
            where: whereClause,
            include: { Brand: true }
        });
        res.json(productsRaw.map((product) => normalizeProduct(product)));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching catalog', error: error.message });
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
        const [brand, activeCampaigns] = await Promise.all([
            prisma.brand.findUnique({
                where: { id },
                include: {
                    Products: {
                        where: { status: 'active' }
                    },
                    Vendor: {
                        include: { User: { select: { email: true } } }
                    }
                }
            }),
            prisma.campaign.findMany({
                where: {
                    brandId: id,
                    status: 'active',
                    endDate: { gt: new Date() }
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    productId: true,
                    title: true,
                    cashbackAmount: true,
                    allocations: true,
                    endDate: true
                }
            })
        ]);

        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        const productCampaignMap = new Map();
        let fallbackCampaign = null;
        activeCampaigns.forEach((campaign) => {
            if (!fallbackCampaign) fallbackCampaign = campaign;
            if (campaign.productId && !productCampaignMap.has(campaign.productId)) {
                productCampaignMap.set(campaign.productId, campaign);
            }
        });

        const mapReward = (campaign, productId) => getCampaignRewardLabel(campaign, productId);

        const mapScheme = (campaign) => campaign?.title || 'Standard Offer';

        // Shape data for frontend
        const brandData = {
            id: brand.id,
            name: brand.name,
            logo: brand.logoUrl,
            banner: brand.logoUrl,
            website: brand.website,
            email: brand.Vendor?.User?.email || 'contact@brand.com',
            about: 'Trusted Brand Partner of GoHype.',
            tags: ['Verified', 'Premium'],
            products: brand.Products.map((p) => {
                const linkedCampaign = productCampaignMap.get(p.id) || fallbackCampaign;
                return {
                    id: p.id,
                    brandId: p.brandId,
                    name: p.name,
                    sku: p.sku,
                    mrp: p.mrp ? Number(p.mrp) : null,
                    variant: p.variant,
                    description: p.description,
                    packSize: p.packSize,
                    warranty: p.warranty,
                    image: p.imageUrl,
                    imageUrl: p.imageUrl,
                    bannerUrl: p.bannerUrl,
                    status: p.status,
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt,
                    reward: mapReward(linkedCampaign, p.id),
                    scheme: mapScheme(linkedCampaign),
                    campaignId: linkedCampaign?.id || null,
                    campaignEndDate: linkedCampaign?.endDate || null,
                    category: p.category
                };
            })
        };

        res.json(brandData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brand details', error: error.message });
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

        // Prefer product-specific running campaign, fallback to brand-level running campaign
        const activeCampaign = await prisma.campaign.findFirst({
            where: {
                brandId: product.brandId,
                status: 'active',
                endDate: { gt: new Date() },
                OR: [
                    { productId: product.id },
                    { productId: null }
                ]
            },
            orderBy: { cashbackAmount: 'desc' }
        });

        res.json({
            ...normalizeProduct(product),
            reward: getCampaignRewardLabel(activeCampaign, product.id),
            scheme: activeCampaign ? activeCampaign.title : 'Standard Offer'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
};

// --- Brand Inquiry (Public) ---
exports.createBrandInquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, message } = req.body || {};
        const trimmedMessage = typeof message === 'string' ? message.trim() : '';

        if (!trimmedMessage) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const brand = await prisma.brand.findUnique({
            where: { id },
            include: {
                Vendor: { select: { id: true, userId: true, businessName: true } }
            }
        });

        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        if (!brand.Vendor?.userId) {
            return res.status(404).json({ message: 'Brand does not have a vendor assigned' });
        }

        const customerName = typeof name === 'string' ? name.trim() : '';
        const customerEmail = typeof email === 'string' ? email.trim() : '';
        const customerPhone = typeof phone === 'string' ? phone.trim() : '';

        await prisma.notification.create({
            data: {
                userId: brand.Vendor.userId,
                title: `New customer query${brand.name ? ` - ${brand.name}` : ''}`,
                message: trimmedMessage,
                type: 'brand-inquiry',
                metadata: {
                    tab: 'support',
                    brandId: brand.id,
                    brandName: brand.name,
                    customerName: customerName || null,
                    customerEmail: customerEmail || null,
                    customerPhone: customerPhone || null
                }
            }
        });

        res.status(201).json({ message: 'Your query has been sent to the brand.' });
    } catch (error) {
        console.error('[BrandInquiry] Error:', error);
        res.status(500).json({ message: 'Failed to send query', error: error.message });
    }
};


exports.getGiftCardCategories = (_req, res) => {
    res.json(giftCardCategories);
};

exports.getGiftCards = (req, res) => {
    const { categoryId, search } = req.query;
    let filtered = giftCards;

    if (categoryId) {
        filtered = filtered.filter((card) => card.categoryId === categoryId);
    }

    if (search) {
        const normalized = String(search).trim().toLowerCase();
        filtered = filtered.filter((card) => card.name.toLowerCase().includes(normalized));
    }

    res.json(filtered);
};

exports.getGiftCardDetails = (req, res) => {
    const { id } = req.params;
    const card = giftCards.find((item) => item.id === id);

    if (!card) {
        return res.status(404).json({ message: 'Gift card not found' });
    }

    res.json(card);
};

exports.getStoreData = (_req, res) => {
    res.json({
        tabs: storeTabs,
        categories: storeCategories,
        vouchers,
        products: storeProducts
    });
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

