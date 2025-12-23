require('dotenv').config();
const { execSync } = require('child_process');

console.log('Running Prisma Migrate with loaded environment variables...');
try {
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
} catch (error) {
    process.exit(1);
}
