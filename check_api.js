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
    try {
        const qr = await prisma.qRCode.findFirst({ 
            where: { NOT: { campaignId: null }, status: 'active' },
            include: { Campaign: true } 
        });
        
        if (!qr) return console.log('No suitable QR found');
        
        const hash = qr.uniqueHash;
        console.log(`Testing with QR Hash: ${hash}`);

        const verRes = await request('GET', `/api/public/qrs/${hash}`);
        console.log('API Response:', JSON.stringify(verRes.data, null, 2));
    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
