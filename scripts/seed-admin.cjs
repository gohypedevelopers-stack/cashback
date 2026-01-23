require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prismaClient');

const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'password123';

const name = process.env.ADMIN_NAME || 'Admin';

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
      },
    });
    console.log(`Updated admin user: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
      },
    });
    console.log(`Created admin user: ${email}`);
  }

  console.log('Admin credentials:');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error('Failed to seed admin:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
