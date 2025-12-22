const prisma = require('../config/prismaClient');

// --- Brand Management ---

exports.createBrand = async (req, res) => {
    try {
        const { name, logoUrl, website } = req.body;
        const brand = await prisma.brand.create({
            data: { name, logoUrl, website }
        });
        res.status(201).json(brand);
    } catch (error) {
        res.status(500).json({ message: 'Error creating brand', error: error.message });
    }
};

exports.getAllBrands = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany();
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching brands', error: error.message });
    }
};

// --- Campaign Management ---

exports.createCampaign = async (req, res) => {
    try {
        const { brandId, title, description, cashbackAmount, startDate, endDate, totalBudget } = req.body;

        // Validation: Check if Brand exists
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        const campaign = await prisma.campaign.create({
            data: {
                brandId,
                title,
                description,
                cashbackAmount,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalBudget
            }
        });
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error creating campaign', error: error.message });
    }
};

exports.getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({ include: { Brand: true } });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
};

// --- Vendor Management (Admin View) ---

exports.getAllVendors = async (req, res) => {
    try {
        const vendors = await prisma.vendor.findMany({
            include: { User: true, Wallet: true }
        });
        res.json(vendors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vendors', error: error.message });
    }
};

exports.createVendorProfile = async (req, res) => {
    // This assumes a User already exists (created via Auth Register) 
    // and we are assigning them as a Vendor with a Wallet.
    // Ideally, registration could be atomic, but separating for Admin control.
    const { userId, businessName, contactPhone, gstin } = req.body;

    try {
        const vendor = await prisma.vendor.create({
            data: {
                userId,
                businessName,
                contactPhone,
                gstin
            }
        });

        // Create an empty wallet for the vendor
        await prisma.wallet.create({
            data: { vendorId: vendor.id }
        });

        // Update User role if not already vendor
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'vendor' }
        });

        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ message: 'Error creating vendor', error: error.message });
    }
};
