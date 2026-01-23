const http = require('http');
const https = require('https');
const { URL } = require('url');

const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@incentify.local';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

const base = new URL(baseUrl);
const client = base.protocol === 'https:' ? https : http;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const normalizedBasePath = base.pathname === '/' ? '' : base.pathname.replace(/\/$/, '');
    const options = {
      hostname: base.hostname,
      port: base.port || (base.protocol === 'https:' ? 443 : 80),
      path: `${normalizedBasePath}${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (error) => reject(error));

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runAdminSmokeTest() {
  try {
    console.log('--- Admin API Smoke Test ---');
    console.log(`Base URL: ${baseUrl}`);

    console.log('\n1. Admin login...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: adminEmail,
      password: adminPassword,
    });
    console.log('Response:', loginRes);

    if (!loginRes.data || !loginRes.data.token) {
      console.error('Login failed. Check ADMIN_EMAIL/ADMIN_PASSWORD or seed the admin.');
      return;
    }

    const token = loginRes.data.token;
    console.log('\n2. Admin dashboard...');
    const dashboardRes = await request('GET', '/api/admin/dashboard', null, token);
    console.log('Response:', dashboardRes);

    console.log('\n3. Admin users...');
    const usersRes = await request('GET', '/api/admin/users', null, token);
    console.log('Response:', usersRes);

    console.log('\n4. Admin QR registry...');
    const qrsRes = await request('GET', '/api/admin/qrs', null, token);
    console.log('Response:', qrsRes);
  } catch (error) {
    console.error('Admin test failed:', error);
  }
}

runAdminSmokeTest();
