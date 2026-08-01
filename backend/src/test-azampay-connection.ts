import axios from 'axios';
import dns from 'dns';
import https from 'https';

async function testConnection() {
  console.log('🔍 Testing AzamPay Sandbox Connection...\n');

  // 1. DNS Resolution
  console.log('1. Checking DNS resolution...');
  dns.lookup('sandbox.azampay.co.tz', (err, address) => {
    if (err) {
      console.error('❌ DNS resolution failed:', err.message);
    } else {
      console.log(`✅ DNS resolved: sandbox.azampay.co.tz → ${address}`);
    }
  });

  // 2. Basic HTTP connectivity
  console.log('\n2. Testing HTTP connectivity...');
  try {
    const response = await axios.get('https://sandbox.azampay.co.tz', {
      timeout: 10000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Bypass SSL for testing
    });
    console.log('✅ Connected to sandbox.azampay.co.tz');
  } catch (error: any) {
    if (error.code === 'ECONNRESET') {
      console.error('❌ Connection reset - firewall or network issue');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ Connection timeout - server may be down');
    } else {
      console.error('❌ Connection failed:', error.message);
    }
  }

  // 3. Auth endpoint test
  console.log('\n3. Testing auth endpoint...');
  try {
    const response = await axios.post(
      'https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken',
      {
        appName: process.env.AZAMPAY_APP_NAME,
        clientId: process.env.AZAMPAY_CLIENT_ID,
        clientSecret: process.env.AZAMPAY_CLIENT_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apiKey': process.env.AZAMPAY_API_KEY
        },
        timeout: 15000
      }
    );
    console.log('✅ Auth endpoint reachable');
  } catch (error: any) {
    console.error('❌ Auth endpoint failed:', error.message);
  }
}

testConnection();
