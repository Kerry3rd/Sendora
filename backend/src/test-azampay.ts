import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testAzamPay() {
  console.log('🔑 Testing AzamPay Credentials...\n');

  const appName = process.env.AZAMPAY_APP_NAME;
  const clientId = process.env.AZAMPAY_CLIENT_ID;
  const clientSecret = process.env.AZAMPAY_CLIENT_SECRET;
  const apiKey = process.env.AZAMPAY_API_KEY;

  console.log('Credentials check:');
  console.log(`✅ App Name: ${appName ? 'present' : 'MISSING'}`);
  console.log(`✅ Client ID: ${clientId ? 'present' : 'MISSING'}`);
  console.log(`✅ Client Secret: ${clientSecret ? 'present' : 'MISSING'}`);
  console.log(`✅ API Key: ${apiKey ? 'present' : 'MISSING'}`);

  if (!appName || !clientId || !clientSecret || !apiKey) {
    console.error('\n❌ Missing credentials! Please check your .env file');
    return;
  }

  try {
    // Try to get access token
    const authUrl = 'https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken';
    
    console.log('\n📡 Requesting access token from AzamPay...');
    
    const response = await axios.post(authUrl, {
      appName: appName,
      clientId: clientId,
      clientSecret: clientSecret
    }, {
      headers: {
        'Content-Type': 'application/json',
        'apiKey': apiKey
      }
    });

    console.log('\n✅ SUCCESS! Token received:');
    console.log('Access Token:', response.data.data?.accessToken?.substring(0, 20) + '...');
    console.log('Expires In:', response.data.data?.expiresIn || '1 hour');

  } catch (error: any) {
    console.error('\n❌ Authentication failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data?.message || error.message);
      console.error('Full error:', error.response.data);
      
      if (error.response.status === 423) {
        console.error('\n🔧 FIX: Your credentials are invalid or expired.');
        console.error('   1. Go to https://developers.azampay.co.tz/home');
        console.error('   2. Generate new credentials');
        console.error('   3. Update your .env file');
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAzamPay();
