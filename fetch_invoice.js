const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const inv = await prisma.invoice.findFirst({
        orderBy: { issuedAt: 'desc' },
        include: { Items: true }
    });
    console.log(JSON.stringify(inv, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
