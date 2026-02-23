require('dotenv').config();
const prisma = require('./src/config/prismaClient');
const http = require('http');

function request(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, data }); }
            });
        });
        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function verify() {
    let hash, originalStatus, originalEndDate, campaignId, qrId;

    try {
        console.log('--- Verification Started ---');
        
        const qr = await prisma.qRCode.findFirst({ 
            where: { NOT: { campaignId: null } },
            include: { Campaign: true } 
        });
        
        if (!qr) return console.log('No QR with campaign found in DB');
        
        hash = qr.uniqueHash;
        qrId = qr.id;
        originalStatus = qr.status;
        originalEndDate = qr.Campaign.endDate;
        campaignId = qr.campaignId;

        console.log(`Using QR Hash: ${hash}`);

        // 1. Test "Already Redeemed"
        console.log('\n1. Testing "Already Redeemed" scenario...');
        await prisma.qRCode.update({ where: { id: qrId }, data: { status: 'redeemed' } });
        const res1 = await request('GET', `/api/public/qrs/${hash}`);
        console.log('Status:', res1.status);
        if (res1.data.qr && res1.data.message === 'QR Code already redeemed') {
            console.log('SUCCESS: QR details returned for redeemed QR');
        } else {
            console.log('FAILURE: QR details missing or wrong message', res1.data);
        }

        // 2. Test "Campaign Expired"
        console.log('\n2. Testing "Campaign Expired" scenario...');
        await prisma.qRCode.update({ where: { id: qrId }, data: { status: 'active' } });
        await prisma.campaign.update({ where: { id: campaignId }, data: { endDate: new Date(Date.now() - 86400000) } });
        const res2 = await request('GET', `/api/public/qrs/${hash}`);
        console.log('Status:', res2.status);
        if (res2.data.qr && res2.data.message === 'Campaign expired or not started') {
            console.log('SUCCESS: QR details returned for expired campaign');
        } else {
            console.log('FAILURE: QR details missing or wrong message', res2.data);
        }

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        // Reset
        if (hash && campaignId) {
            await prisma.qRCode.update({ where: { id: qrId }, data: { status: originalStatus } });
            await prisma.campaign.update({ where: { id: campaignId }, data: { endDate: originalEndDate } });
            console.log('DB Reset successful');
        }
        await prisma.$disconnect();
        console.log('\n--- Verification Finished ---');
    }
}

verify();
