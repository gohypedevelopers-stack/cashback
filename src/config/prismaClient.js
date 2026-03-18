const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set.');
}

const prisma = new PrismaClient();

module.exports = prisma;
