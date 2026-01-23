const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prisma = require('./src/config/prismaClient');

async function main() {
    console.log("Starting vendor data seed...");

    // 1. Find a User to promote to Vendor
    // We'll take the most recently created user
    const user = await prisma.user.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!user) {
        console.error("No users found in the database. Please sign up a user via the app first.");
        process.exit(1);
    }

    console.log(`Found user: ${user.email} (${user.id})`);

    // Update user role to vendor if not already
    if (user.role !== 'vendor') {
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'vendor' }
        });
        console.log("Updated user role to 'vendor'.");
    }

    // 2. Create Vendor Profile
    let vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    if (!vendor) {
        vendor = await prisma.vendor.create({
            data: {
                userId: user.id,
                businessName: "My Dummy Company",
                contactPhone: "9999999999",
                status: "active",
                address: "123 Test St, Demo City"
            }
        });
        console.log("Created Vendor profile.");
    } else {
        console.log("Vendor profile already exists.");
    }

    // 3. Create Wallet
    let wallet = await prisma.wallet.findUnique({ where: { vendorId: vendor.id } });
    if (!wallet) {
        wallet = await prisma.wallet.create({
            data: {
                vendorId: vendor.id,
                balance: 10000.00, // INR 10,000 balance
                currency: "INR"
            }
        });
        console.log("Created Wallet with INR 10,000 balance.");
    } else {
        console.log(`Wallet exists. Balance: ${wallet.balance}`);
    }

    // 4. Create Brand
    let brand = await prisma.brand.findFirst({ where: { vendorId: vendor.id } });
    if (!brand) {
        brand = await prisma.brand.create({
            data: {
                vendorId: vendor.id,
                name: "Test Brand",
                logoUrl: "https://via.placeholder.com/150",
                website: "https://example.com",
                status: "active"
            }
        });
        console.log("Created Brand 'Test Brand'.");
    } else {
        console.log("Brand already exists.");
    }

    // 5. Create Active Campaign
    let campaign = await prisma.campaign.findFirst({ where: { brandId: brand.id } });
    if (!campaign) {
        campaign = await prisma.campaign.create({
            data: {
                brandId: brand.id,
                title: "Demo Cashback",
                description: "Get ₹10 cashback instantly",
                cashbackAmount: 10.00,
                totalBudget: 5000.00,
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
                status: "active"
            }
        });
        console.log("Created Campaign 'Demo Cashback'.");
    } else {
        console.log("Campaign already exists.");
    }

    console.log("\nSEEDING COMPLETE! ✅");
    console.log("You can now refresh the Vendor Dashboard.");
    console.log("Credential to use: The user you last signed up with.");
}

main()
    .catch((e) => {
        console.error("FATAL ERROR:");
        console.error(e);
        if (e.message) console.error("Message:", e.message);
        if (e.code) console.error("Code:", e.code);
        if (e.meta) console.error("Meta:", e.meta);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

