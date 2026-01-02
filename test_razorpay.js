const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000/api';
// Using random user to ensure we can get a token
const RANDOM_ID = Math.floor(Math.random() * 10000);
const NAME = `Test User ${RANDOM_ID}`;
const EMAIL = `test_razor_${RANDOM_ID}@example.com`;
const PASSWORD = 'password123';
const KEY_SECRET = '74CpG2wVbTpojRsDAVlGPPRa'; // Test Secret

async function runTest() {
    try {
        console.log(`1. Authenticating as ${EMAIL}...`);
        let token;
        try {
            // Try Register
            const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
                name: NAME,
                email: EMAIL,
                password: PASSWORD,
                role: 'vendor' // Vendor role to test wallet creation cleanly if needed
            });
            token = registerRes.data.token;
            console.log('   Registration successful. Token received.');
        } catch (err) {
            console.log('   Registration failed (maybe exists), trying login...');
            const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
                email: EMAIL,
                password: PASSWORD
            });
            token = loginRes.data.token;
            console.log('   Login successful. Token received.');
        }

        console.log('\n2. Creating Order...');
        const orderRes = await axios.post(`${BASE_URL}/payments/order`,
            { amount: 500 },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const order = orderRes.data;
        console.log(`   Order Created: ${order.id} (Amount: ${order.amount})`);

        console.log('\n3. Simulating Payment & Generating Signature...');
        const razorpay_order_id = order.id;
        const razorpay_payment_id = 'pay_' + Math.random().toString(36).substring(7); // Mock Payment ID

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const razorpay_signature = crypto
            .createHmac('sha256', KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        console.log(`   Signature: ${razorpay_signature}`);

        console.log('\n4. Verifying Payment...');
        try {
            const verifyRes = await axios.post(`${BASE_URL}/payments/verify`, {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            }, { headers: { Authorization: `Bearer ${token}` } });

            console.log('   Verification Response:', verifyRes.data);
            console.log('   ✅ TEST PASSED');
        } catch (verifyError) {
            console.error('   ❌ Verification Failed:', verifyError.response ? verifyError.response.data : verifyError.message);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

runTest();
