const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = require('../src/config/prismaClient');

const USERNAME = process.env.VENDOR_USERNAME || 'T-rex_tee';
const PASSWORD = process.env.VENDOR_PASSWORD || '1234567890';
const EMAIL = process.env.VENDOR_EMAIL || 'trex_tee@example.com';

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

async function main() {
  console.log('Ensuring vendor account...');
  const normalizedUsername = USERNAME.trim();
  const normalizedEmail = EMAIL.trim().toLowerCase();

  if (!normalizedUsername) {
    throw new Error('Username is required');
  }
  if (!PASSWORD) {
    throw new Error('Password is required');
  }

  let user = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  }

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: normalizedUsername,
        email: normalizedEmail,
        username: normalizedUsername,
        password: hashedPassword,
        role: 'vendor',
        status: 'active'
      }
    });
    console.log('Created user:', user.id);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: user.username || normalizedUsername,
        email: user.email || normalizedEmail,
        password: hashedPassword,
        role: 'vendor',
        status: 'active'
      }
    });
    console.log('Updated user:', user.id);
  }

  let vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        businessName: normalizedUsername,
        contactPhone: '9999999999',
        contactEmail: user.email,
        status: 'active',
        address: 'Demo Address'
      }
    });
    console.log('Created vendor:', vendor.id);
  } else if (String(vendor.status || '').toLowerCase() !== 'active') {
    vendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: { status: 'active' }
    });
    console.log('Activated vendor:', vendor.id);
  }

  let wallet = await prisma.wallet.findUnique({ where: { vendorId: vendor.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        vendorId: vendor.id,
        balance: 10000,
        currency: 'INR'
      }
    });
    console.log('Created wallet:', wallet.id);
  }

  let brand = await prisma.brand.findFirst({ where: { vendorId: vendor.id } });
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        vendorId: vendor.id,
        name: `${normalizedUsername} Brand`,
        status: 'active',
        website: 'https://example.com'
      }
    });
    console.log('Created brand:', brand.id);
  } else if (String(brand.status || '').toLowerCase() !== 'active') {
    brand = await prisma.brand.update({
      where: { id: brand.id },
      data: { status: 'active' }
    });
    console.log('Activated brand:', brand.id);
  }

  let subscription = await prisma.subscription.findUnique({ where: { brandId: brand.id } });
  const now = new Date();
  const endDate = addDays(now, 365);
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        brandId: brand.id,
        subscriptionType: 'MONTHS_12',
        startDate: now,
        endDate,
        status: 'ACTIVE'
      }
    });
    console.log('Created subscription:', subscription.id);
  } else {
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        startDate: subscription.startDate || now,
        endDate,
        status: 'ACTIVE'
      }
    });
    console.log('Activated subscription:', subscription.id);
  }

  console.log('Done.');
  console.log(`Login with username: ${normalizedUsername}`);
  console.log(`Password: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('Failed to ensure vendor account.');
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

