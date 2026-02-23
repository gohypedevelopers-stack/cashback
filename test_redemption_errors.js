const http = require('http');

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTest() {
    try {
        console.log('--- Verification Test: QR Redemption Errors ---');

        // We need a valid hash that exists but is redeemed or has expired campaign.
        // Since we don't know the DB state, we will look for any QR hash first.
        // But wait, I can just check if the code I added is syntactically correct and hit any invalid hash to see general error format.
        
        console.log('\n1. Testing Verify QR with invalid hash...');
        const verifyRes = await request('GET', '/api/public/qrs/NON_EXISTENT_HASH');
        console.log('Response Status:', verifyRes.status);
        console.log('Response Data:', verifyRes.data);

        // To truly verify my change, I need a QR that is redeemed.
        // I'll try to find one in the DB.
    } catch (error) {
        console.error('Test Error:', error);
    }
}

runTest();
