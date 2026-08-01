import dotenv from 'dotenv';
import { gatewayManager } from './services/sms/SMSGatewayService';
import sequelize from './config/sequelize';

dotenv.config();

async function testRealSMSSending() {
  console.log('\n📱 TESTING REAL SMS SENDING\n');
  console.log('='.repeat(70));

  try {
    // 1. Check database connection
    console.log('1️⃣ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // 2. Check Twilio configuration
    console.log('2️⃣ Checking Twilio configuration...');
    
    const requiredEnvVars = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN', 
      'TWILIO_PHONE_NUMBER'
    ];
    
    let missingVars = [];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    }
    
    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars.join(', '));
      console.log('\n📝 Please add these to your backend/.env file:');
      console.log(`
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
      `);
      process.exit(1);
    }
    
    console.log('✅ Twilio credentials found');
    console.log(`   Account SID: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 10)}...`);
    console.log(`   From Number: ${process.env.TWILIO_PHONE_NUMBER}\n`);

    // 3. Check gateway health
    console.log('3️⃣ Checking gateway health...');
    const health = await gatewayManager.checkAllGatewaysHealth();
    
    const twilioHealth = health.find(h => h.gateway === 'Twilio');
    if (twilioHealth) {
      console.log(`   Twilio: ${twilioHealth.status} (${twilioHealth.latency}ms)`);
      if (twilioHealth.balance !== undefined) {
        console.log(`   Balance: $${twilioHealth.balance.toFixed(4)}`);
      }
    }
    
    const virtualHealth = health.find(h => h.gateway === 'Virtual');
    if (virtualHealth) {
      console.log(`   Virtual: ${virtualHealth.status} (fallback)`);
    }
    console.log('');

    // 4. Send a test SMS
    console.log('4️⃣ Sending test SMS...');
    
    const toNumber = process.argv[2];
    if (!toNumber) {
      console.error('❌ Please provide a phone number to send to');
      console.log('\n📝 Usage: npx ts-node src/test-send-sms.ts +1234567890');
      console.log('   Replace +1234567890 with your actual phone number\n');
      process.exit(1);
    }

    // Validate phone number format
    if (!toNumber.startsWith('+')) {
      console.error('❌ Phone number must be in E.164 format (e.g., +1234567890)');
      process.exit(1);
    }

    const testMessage = {
      to: toNumber,
      from: process.env.TWILIO_PHONE_NUMBER || '',
      body: `Test SMS from Sendora Platform - Sent at ${new Date().toLocaleString()}`,
    };

    console.log(`📤 Sending to: ${testMessage.to}`);
    console.log(`📝 Message: ${testMessage.body}`);
    console.log('');

    const result = await gatewayManager.sendSMS(testMessage);

    if (result.success) {
      console.log('✅✅✅ SMS SENT SUCCESSFULLY! ✅✅✅');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Gateway: ${result.gateway}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Cost: $${result.cost?.toFixed(4) || '0.0000'}`);
      
      if (result.gateway === 'Virtual') {
        console.log('\n⚠️  Note: This was sent via VIRTUAL gateway');
        console.log('   To send REAL SMS, check your Twilio credentials and verified numbers');
      } else {
        console.log('\n🎉 REAL SMS sent successfully! Check your phone!');
      }
    } else {
      console.log('❌❌❌ SMS SENDING FAILED ❌❌❌');
      console.log(`   Error: ${result.error}`);
      
      if (result.error?.includes('not verified')) {
        console.log('\n🔧 FIX:');
        console.log('   1. Go to: https://console.twilio.com');
        console.log('   2. Navigate to: Phone Numbers > Verified Caller IDs');
        console.log('   3. Click "Add a New Caller ID"');
        console.log('   4. Enter: ' + toNumber);
        console.log('   5. Complete the verification process');
        console.log('   6. Run this test again\n');
      } else if (result.error?.includes('Authentication')) {
        console.log('\n🔧 FIX:');
        console.log('   1. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
        console.log('   2. Make sure they are correct');
        console.log('   3. Get them from: https://console.twilio.com\n');
      }
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(70));
  process.exit(0);
}

testRealSMSSending();
