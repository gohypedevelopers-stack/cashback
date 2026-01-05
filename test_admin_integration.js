const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const axios = require('axios');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function run() {
    console.log("--- Starting Admin Integration Test ---");

    // 1. Create Admin User in DB
    const adminEmail = `admin_test_${Date.now()}@test.com`;
    let adminUser;
    try {
        adminUser = await prisma.user.create({
            data: {
                name: 'Test Admin',
                email: adminEmail,
                phoneNumber: `99${Date.now().toString().slice(-8)}`,
                role: 'admin',
                status: 'active'
            }
        });
    } catch (e) {
        console.error("Prisma Error (Admin Creation):", e);
        process.exit(1);
    }

    const token = jwt.sign({ id: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`Created Admin: ${adminEmail}`);

    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Ensure cleanup of previous test runs if needed? (Not doing now for simplicity)

    try {
        // --- ADMIN OWNED RESOURCE ---
        console.log('\n--- creating Admin Brand ---');
        const brandRes = await axios.post(`${BASE_URL}/admin/brands`, {
            name: `Admin Brand ${Date.now()}`,
            logoUrl: 'http://example.com/logo.png',
            website: 'http://example.com'
        }, config);
        const adminBrandId = brandRes.data.id;
        console.log('Admin Brand Created:', adminBrandId);

        console.log('--- creating Admin Product ---');
        const productRes = await axios.post(`${BASE_URL}/admin/products`, {
            brandId: adminBrandId,
            name: 'Admin Product 1',
            variant: 'Red',
            category: 'Electronics',
            description: 'A great product',
            packSize: '1',
            warranty: '1 Year',
            imageUrl: 'http://example.com/prod.png'
        }, config);
        console.log('Admin Product Created:', productRes.data.id);

        // --- VENDOR OWNED RESOURCE ---
        console.log('\n--- Creating Manual Vendor Data (Simulating Vendor) ---');
        const vendorEmail = `vendor_${Date.now()}@test.com`;
        const vendorUser = await prisma.user.create({
            data: {
                name: 'Test Vendor',
                email: vendorEmail,
                phoneNumber: `88${Date.now().toString().slice(-8)}`,
                role: 'vendor',
                Vendor: {
                    create: {
                        businessName: `Vendor Biz ${Date.now()}`,
                        Brands: {
                            create: {
                                name: `Vendor Brand ${Date.now()}`,
                                status: 'active',
                                Products: {
                                    create: {
                                        name: 'Vendor Product 1',
                                        status: 'active'
                                    }
                                }
                            }
                        },
                        Wallet: { create: {} }
                    }
                }
            },
            include: { Vendor: { include: { Brands: { include: { Products: true } } } } }
        });
        const vendorBrandId = vendorUser.Vendor.Brands[0].id;
        console.log('Vendor Brand Created (Manual):', vendorBrandId);

        // --- TEST COUPONS ---
        console.log('\n--- creating Coupon ---');
        const couponCode = `SAVE${Date.now()}`;
        const couponRes = await axios.post(`${BASE_URL}/admin/coupons`, {
            code: couponCode,
            description: 'Save big',
            discountType: 'percentage',
            discountValue: 10,
            expiryDate: new Date(Date.now() + 86400000).toISOString(),
            platform: 'Amazon',
            url: 'http://amazon.com/deal'
        }, config);
        console.log('Coupon Created:', couponRes.data.id);


        // --- FILTERING TEST ---
        console.log('\n--- Testing Filtering ---');

        // 2. Test Admin Only Filter
        console.log("Testing ?type=admin Filter...");
        const adminProds = await axios.get(`${BASE_URL}/admin/products?type=admin`, config);
        const adminBrands = await axios.get(`${BASE_URL}/admin/brands?type=admin`, config);

        console.log(`Admin Products Count: ${adminProds.data.products.length}`);
        console.log(`Admin Brands Count: ${adminBrands.data.length}`);

        // Verify content
        const hasVendorProdInAdmin = adminProds.data.products.some(p => p.Brand.vendorId !== null);
        const hasVendorBrandInAdmin = adminBrands.data.some(b => b.vendorId !== null);

        if (hasVendorProdInAdmin) throw new Error("FAIL: Found Vendor Product in Admin Filter");
        if (hasVendorBrandInAdmin) throw new Error("FAIL: Found Vendor Brand in Admin Filter");
        console.log("PASS: Admin Filter clean");

        // 3. Test Vendor Only Filter
        console.log("Testing ?type=vendor Filter...");
        const vendorProds = await axios.get(`${BASE_URL}/admin/products?type=vendor`, config);
        const vendorBrands = await axios.get(`${BASE_URL}/admin/brands?type=vendor`, config);

        console.log(`Vendor Products Count: ${vendorProds.data.products.length}`);
        console.log(`Vendor Brands Count: ${vendorBrands.data.length}`);

        const hasAdminProdInVendor = vendorProds.data.products.some(p => p.Brand.vendorId === null);
        const hasAdminBrandInVendor = vendorBrands.data.some(b => b.vendorId === null);

        if (hasAdminProdInVendor) throw new Error("FAIL: Found Admin Product in Vendor Filter");
        if (hasAdminBrandInVendor) throw new Error("FAIL: Found Admin Brand in Vendor Filter");
        console.log("PASS: Vendor Filter clean");

        console.log("\nALL TESTS PASSED SUCCESSFULLY");

    } catch (error) {
        console.error('Test Error:', error.response ? error.response.data : error.message);
        if (error.response) console.error(error.response.data);
    } finally {
        await prisma.$disconnect();
    }
}

run();
