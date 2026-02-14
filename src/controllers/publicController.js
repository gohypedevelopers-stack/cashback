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

const DEFAULT_REDEEM_PRODUCT_CATEGORY = 'Popular';
const REDEEM_PRODUCT_STATUSES = new Set(['active', 'inactive']);

const normalizeCatalogText = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeStoreTab = (tab) => {
    const id = normalizeCatalogText(tab?.id).toLowerCase();
    const label = normalizeCatalogText(tab?.label);
    if (!id || !label) return null;
    return { id, label };
};

const sanitizeStoreProduct = (item, index) => {
    const name = normalizeCatalogText(item?.name);
    if (!name) return null;

    const amountValue = Number(item?.amount ?? item?.points);
    const amount = Number.isFinite(amountValue) && amountValue >= 0 ? amountValue : 0;
    const category = normalizeCatalogText(item?.category) || DEFAULT_REDEEM_PRODUCT_CATEGORY;
    const statusRaw = normalizeCatalogText(item?.status).toLowerCase();
    const status = REDEEM_PRODUCT_STATUSES.has(statusRaw) ? statusRaw : 'active';
    const id =
        normalizeCatalogText(item?.id) ||
        normalizeCatalogText(item?.sku) ||
        `redeem-product-${index + 1}`;
    const image =
        normalizeCatalogText(item?.image) ||
        normalizeCatalogText(item?.imageUrl);

    return {
        id,
        name,
        amount,
        points: amount,
        category,
        description: normalizeCatalogText(item?.description),
        image: image || '',
        value: normalizeCatalogText(item?.value),
        brand: normalizeCatalogText(item?.brand),
        stock: Number.isFinite(Number(item?.stock))
            ? Math.max(0, Math.floor(Number(item.stock)))
            : null,
        status
    };
};

const normalizeCategoryList = (categories) => {
    if (!Array.isArray(categories)) return [];
    const deduped = [];
    const seen = new Set();
    categories.forEach((raw) => {
        const value = normalizeCatalogText(raw);
        if (!value) return;
        const key = value.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(value);
    });
    return deduped;
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
        const settings = await prisma.systemSettings.findUnique({
            where: { id: 'default' },
            select: { metadata: true }
        });
        const rawBanners = settings?.metadata?.homeBanners;
        const banners = Array.isArray(rawBanners)
            ? rawBanners
                .map((banner, index) => ({
                    id: banner?.id || banner?.key || banner?.slug || index + 1,
                    title: banner?.title || banner?.heading || '',
                    subtitle: banner?.subtitle || banner?.subTitle || banner?.caption || '',
                    img: banner?.img || banner?.imageUrl || banner?.image || banner?.bannerImage || '',
                    accent: banner?.accent || banner?.gradient || '',
                    link: banner?.link || banner?.ctaLink || ''
                }))
                .filter((banner) => banner.title || banner.subtitle || banner.img)
            : [];

        const brands = await prisma.brand.findMany({
            where: { status: 'active' },
            take: 6,
            select: { id: true, name: true, logoUrl: true }
        });

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

        const contactBits = [
            customerName ? `Name: ${customerName}` : null,
            customerEmail ? `Email: ${customerEmail}` : null,
            customerPhone ? `Phone: ${customerPhone}` : null
        ].filter(Boolean);
        const adminMessage = contactBits.length
            ? `${contactBits.join(' | ')} | Message: ${trimmedMessage}`
            : trimmedMessage;

        const adminUsers = await prisma.user.findMany({
            where: { role: 'admin', status: 'active' },
            select: { id: true }
        });

        const commonMetadata = {
            tab: 'support',
            brandId: brand.id,
            brandName: brand.name,
            vendorId: brand.Vendor.id,
            vendorUserId: brand.Vendor.userId,
            customerName: customerName || null,
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null
        };

        const writeOps = [
            prisma.notification.create({
                data: {
                    userId: brand.Vendor.userId,
                    title: `New customer query${brand.name ? ` - ${brand.name}` : ''}`,
                    message: trimmedMessage,
                    type: 'brand-inquiry',
                    metadata: commonMetadata
                }
            })
        ];

        const adminNotifications = adminUsers
            .map((admin) => admin.id)
            .filter((adminId) => adminId !== brand.Vendor.userId)
            .map((adminId) => ({
                userId: adminId,
                title: `Customer inquiry for ${brand.name || 'brand'}`,
                message: adminMessage,
                type: 'brand-inquiry-admin',
                metadata: commonMetadata
            }));

        if (adminNotifications.length) {
            writeOps.push(
                prisma.notification.createMany({
                    data: adminNotifications
                })
            );
        }

        await prisma.$transaction(writeOps);

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

exports.getStoreData = async (_req, res) => {
    try {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: 'default' },
            select: { metadata: true }
        });
        const metadata =
            settings?.metadata && typeof settings.metadata === 'object'
                ? settings.metadata
                : {};
        const redeemStore =
            metadata?.redeemStore && typeof metadata.redeemStore === 'object'
                ? metadata.redeemStore
                : {};

        const configuredTabs = Array.isArray(redeemStore.tabs)
            ? redeemStore.tabs.map(sanitizeStoreTab).filter(Boolean)
            : [];

        const configuredProducts = Array.isArray(redeemStore.products)
            ? redeemStore.products
                .map((item, index) => sanitizeStoreProduct(item, index))
                .filter(Boolean)
                .filter((product) => product.status !== 'inactive')
            : [];

        const products = configuredProducts.length ? configuredProducts : storeProducts;
        const categoriesFromProducts = products
            .map((product) => normalizeCatalogText(product?.category))
            .filter(Boolean);
        const categoriesFromVouchers = vouchers
            .map((voucher) => normalizeCatalogText(voucher?.category))
            .filter(Boolean);
        const configuredCategories = normalizeCategoryList(redeemStore.categories);
        const mergedCategories = normalizeCategoryList([
            ...(configuredCategories.length ? configuredCategories : []),
            ...storeCategories,
            ...categoriesFromVouchers,
            ...categoriesFromProducts
        ]);

        res.json({
            tabs: configuredTabs.length ? configuredTabs : storeTabs,
            categories: mergedCategories.length ? mergedCategories : storeCategories,
            vouchers,
            products
        });
    } catch (error) {
        res.status(500).json({ message: 'Error loading store data', error: error.message });
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

