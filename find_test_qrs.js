require('dotenv').config();
const prisma = require('./src/config/prismaClient');

async function find() {
    try {
        const anyQr = await prisma.qRCode.findFirst({
            where: { NOT: { campaignId: null } },
            include: { Campaign: { include: { Brand: true } } }
        });
        if (anyQr) {
            console.log('ANY_QR_WITH_CAMPAIGN:', JSON.stringify(anyQr));
        } else {
            console.log('NO_QR_WITH_CAMPAIGNFOUND');
        }
    } catch (err) {
        console.error('Error finding QRs:', err);
    } finally {
        await prisma.$disconnect();
    }
}

find();
