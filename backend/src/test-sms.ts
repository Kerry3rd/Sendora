import dotenv from 'dotenv';
import { gatewayManager } from './services/sms/SMSGatewayService';

dotenv.config();

(async () => {
  console.log('Testing SMS Gateway Service...\n');

  try {
    // Test gateway health
    console.log('1. Checking gateway health...');
    const health = await gatewayManager.checkAllGatewaysHealth();
    console.log('Gateway Health:', health);

    // Test sending SMS (using virtual gateway)
    console.log('\n2. Testing SMS sending...');
    const testMessage = {
      to: '+255612345466', // Tanzanian test number
      from: 'SENDORA',
      body: 'Test message from Bulk SMS Platform at ' + new Date().toLocaleTimeString(),
    };

    console.log('Sending test message:', testMessage);
    const result = await gatewayManager.sendSMS(testMessage);
    console.log('Send Result:', result);

    if (result.success) {
      console.log('✅ SMS Gateway test passed!');
    } else {
      console.log('❌ SMS Gateway test failed:', result.error);
    }

  } catch (error) {
    console.error('❌ SMS Gateway test failed with error:', error);
  }

  process.exit(0);
})();
