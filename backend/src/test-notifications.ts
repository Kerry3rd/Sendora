import dotenv from 'dotenv';
import sequelize from './config/sequelize';
import NotificationService from './services/notification/notification.service';
import User from './models/User';

dotenv.config();

async function testNotifications() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find a user (use admin as test)
    const user = await User.findOne({ where: { email: 'admin@sendora.co.tz' } });
    
    if (!user) {
      console.log('❌ No user found. Please login first.');
      return;
    }

    console.log(`👤 Testing notifications for: ${user.email}\n`);

    // Create test notifications
    console.log('Creating test notifications...');

    // Campaign complete
    await NotificationService.campaignCompleted(
      user.id,
      'test-campaign-id',
      'Welcome Campaign',
      { delivered: 145, failed: 5, total: 150 }
    );

    // Low credits
    await NotificationService.lowCredits(user.id, 45);

    // SMS delivered
    await NotificationService.smsDelivered(user.id, '+255712345678');

    // SMS failed
    await NotificationService.smsFailed(
      user.id, 
      '+255712345679', 
      'Invalid number'
    );

    // Payment success
    await NotificationService.paymentSuccess(user.id, 50, 5000);

    console.log('\n✅ Test notifications created!');
    console.log('📱 Check your notification dropdown in the app.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit();
  }
}

testNotifications();
