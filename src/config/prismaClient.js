const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set.');
}

// Strip Prisma-specific query params (like ?schema=public) that the raw pg driver doesn't understand
const cleanConnectionString = process.env.DATABASE_URL.replace(/\?schema=[^&]*&?/i, '').replace(/&$/, '');

const pool = new Pool({ 
  connectionString: cleanConnectionString 
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
