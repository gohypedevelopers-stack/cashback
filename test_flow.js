const axios = require('axios'); // Assuming axios might be there or I can use http, but let's try fetch first if node is new enough. 
// Actually since I can't be sure of axios, I'll use native http or fetch if available. 
// Let's use a simple script with native fetch (Node 18+) or https.
// To be safe and compatible with older node without fetch, I will use 'http' module.

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
        console.log('--- Starting Test ---');

        // 1. Send OTP
        const phone = '9876543210';
        console.log(`\n1. Sending OTP to ${phone}...`);
        const sendOtpRes = await request('POST', '/api/auth/send-otp', { phoneNumber: phone });
        console.log('Response:', sendOtpRes);

        if (!sendOtpRes.data.success) {
            console.error('Failed to send OTP');
            return;
        }

        const otp = sendOtpRes.data.otp;
        console.log(`\nGot OTP: ${otp}`);

        // 2. Verify OTP
        console.log(`\n2. Verifying OTP...`);
        const verifyRes = await request('POST', '/api/auth/verify-otp', { phoneNumber: phone, otp });
        console.log('Response:', verifyRes);

        if (!verifyRes.data.token) {
            console.error('Failed to verify OTP');
            return;
        }

        const token = verifyRes.data.token;
        console.log(`\nGot Token: ${token.substring(0, 10)}...`);

        // 3. Scan QR (Need a valid QR Hash first)
        // Since I can't easily generate a valid mocked QR in DB from here without direct DB access or an admin API,
        // I will try to hit the endpoint and expect a 'Invalid QR Code' or 'QR Code not active' which proves the endpoint works.
        // If I really wanted to test success, I'd need to create data first. 
        // For now, let's just checking the User Dashboard which should be empty (or 0 balance).

        console.log(`\n3. Checking Dashboard...`);
        const dashRes = await request('GET', '/api/user/dashboard', null, token);
        console.log('Response:', dashRes);

        // 4. Test Scan QR with dummy hash
        console.log(`\n4. Scanning Dummy QR...`);
        const scanRes = await request('POST', '/api/user/scan-qr/DUMMYHASH123', {}, token);
        console.log('Response:', scanRes);

    } catch (error) {
        console.error('Test Error:', error);
    }
}

runTest();
