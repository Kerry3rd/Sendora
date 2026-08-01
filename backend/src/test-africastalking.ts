import dotenv from 'dotenv';
dotenv.config();

// @ts-ignore
const africastalking = require('africastalking');

async function testConnection() {
  console.log('\n🔌 TESTING AFRICASTALKING CONNECTION\n');
  
  try {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const fromNumber = process.env.AFRICASTALKING_FROM || ''; // Allow empty
    
    if (!username || !apiKey) {
      console.error('❌ Missing credentials');
      return;
    }
    
    console.log('✅ Credentials found');
    console.log('   Username:', username);
    console.log('   API Key:', apiKey.substring(0, 10) + '...');
    console.log('   From:', fromNumber || '(using default)');
    
    const client = africastalking({
      username: username,
      apiKey: apiKey
    });
    
    const sms = client.SMS;
    
    console.log('\n📱 Sending test SMS...');
    
    const toNumber = process.argv[2] || '+255611205696';
    console.log(`   To: ${toNumber}`);
    
    // Prepare message options
    const options: any = {
      to: [toNumber],
      message: `Test from Sendora at ${new Date().toLocaleTimeString()}`
    };
    
    // Only add 'from' if it exists
    if (fromNumber) {
      options.from = fromNumber;
    }
    
    const result = await sms.send(options);
    console.log('✅ Response:', JSON.stringify(result, null, 2));
    
    const recipient = result.SMSMessageData?.Recipients?.[0];
    if (recipient?.status === 'Success') {
      console.log('\n✅✅✅ SMS SENT SUCCESSFULLY! ✅✅✅');
    } else {
      console.log('\n❌ SMS sending failed with status:', recipient?.status);
      console.log('   Message:', result.SMSMessageData?.Message);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testConnection();
