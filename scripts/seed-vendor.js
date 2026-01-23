require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set.');
}

const prismaAdapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: prismaAdapter,
});

(async () => {
  try {
    const passwordHash = await bcrypt.hash('YourPassword123!', 10);
    const user = await prisma.user.create({
      data: {
        email: 'vendor@example.com',
        password: passwordHash,
        role: 'vendor',
        status: 'active',
        Vendor: {
          create: {
            businessName: 'Test Vendor',
            contactPhone: '9999999999',
            address: '123 Demo Lane',
          },
        },
      },
    });
    console.log('Vendor created:', user.id);
  } finally {
    await prisma.$disconnect();
  }
})();
