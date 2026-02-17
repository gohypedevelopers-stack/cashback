const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prisma = require('./src/config/prismaClient');
const bcrypt = require('bcryptjs');

async function main() {
    console.log("Starting admin seed...");

    const adminEmail = 'admin@example.com';
    const adminPassword = 'adminpassword123'; // Change this heavily in production
    const adminName = 'Super Admin';
    const cleanDb = process.argv.includes('--clean');

    if (cleanDb) {
        console.log("Deleting existing admin users...");
        await prisma.user.deleteMany({
            where: { role: 'admin' }
        });
    }

    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (existingAdmin) {
        console.log(`Admin user already exists: ${adminEmail}`);
        // Force update password to ensure known credentials work
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await prisma.user.update({
            where: { id: existingAdmin.id },
            data: { password: hashedPassword, role: 'admin' }
        });
        console.log("Admin password reset to default.");
    } else {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const newAdmin = await prisma.user.create({
            data: {
                name: adminName,
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                status: 'active',
                phoneNumber: '0000000000' // Placeholder
            }
        });
        console.log(`Created admin user: ${newAdmin.email}`);
    }

    console.log("\nADMIN SEED COMPLETE! ✅");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
}

main()
    .catch((e) => {
        console.error("FATAL ERROR:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
