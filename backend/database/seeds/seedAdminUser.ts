import User from '../../src/models/User';
import bcrypt from 'bcryptjs';
import Transaction from '../../src/models/Transaction';

const seedAdminUser = async (): Promise<void> => {
  console.log('🌱 Seeding admin and test users...');

  const users = [
    {
      email: 'admin@sendora.com',
      password: 'Admin@123',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+255123456789',
      company: 'SENDORA C-SMSs Platform Inc.',
      role: 'super_admin' as const,
      isEmailVerified: true,
      isPhoneVerified: true,
      credits: 10000,
      settings: {
        notifications: {
          email: true,
          sms: true,
          push: true,
          campaignUpdates: true,
          billingUpdates: true,
          systemUpdates: true,
        },
        preferences: {
          language: 'en',
          timezone: 'Africa/Dar_es_Salaam',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          currency: 'TZS',
          defaultSenderId: 'SENDORA',
          smsSignature: 'Sent via SENDORA',
        },
        security: {
          twoFactorEnabled: false,
          loginAlerts: true,
          sessionTimeout: 60,
        },
      },
    },
    {
      email: 'manager@sendora.com',
      password: 'Manager@123',
      firstName: 'Campaign',
      lastName: 'Manager',
      phone: '+255111222333',
      company: 'Marketing Department',
      role: 'admin' as const,
      isEmailVerified: true,
      isPhoneVerified: true,
      credits: 5000,
      settings: {
        notifications: {
          email: true,
          sms: false,
          push: true,
          campaignUpdates: true,
          billingUpdates: false,
          systemUpdates: true,
        },
        preferences: {
          language: 'en',
          timezone: 'Africa/Nairobi',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '12h',
          currency: 'KES',
          defaultSenderId: 'SENDORA MARKET',
          smsSignature: 'Marketing Team',
        },
      },
    },
    {
      email: 'user@sendora.com',
      password: 'User@123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+255987654321',
      company: 'Test Company Ltd.',
      role: 'user' as const,
      isEmailVerified: true,
      isPhoneVerified: true,
      credits: 1000,
      settings: {
        notifications: {
          email: true,
          sms: true,
          push: false,
          campaignUpdates: true,
          billingUpdates: true,
          systemUpdates: false,
        },
        preferences: {
          language: 'sw',
          timezone: 'Africa/Dar_es_Salaam',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          currency: 'TZS',
          defaultSenderId: 'TESTCO',
          smsSignature: '',
        },
      },
    },
    {
      email: 'support@sendora.com',
      password: 'Support@123',
      firstName: 'Customer',
      lastName: 'Support',
      phone: '+255700000001',
      company: 'Support Team',
      role: 'admin' as const,
      isEmailVerified: true,
      isPhoneVerified: true,
      credits: 2000,
      settings: {
        notifications: {
          email: true,
          sms: true,
          push: true,
          campaignUpdates: true,
          billingUpdates: true,
          systemUpdates: true,
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          currency: 'USD',
          defaultSenderId: 'SUPPORT',
          smsSignature: 'Customer Support',
        },
      },
    },
    {
      email: 'sales@sendora.com',
      password: 'Sales@123',
      firstName: 'Sales',
      lastName: 'Representative',
      phone: '+255700000002',
      company: 'Sales Department',
      role: 'user' as const,
      isEmailVerified: true,
      isPhoneVerified: true,
      credits: 3000,
      settings: {
        notifications: {
          email: true,
          sms: true,
          push: true,
          campaignUpdates: true,
          billingUpdates: true,
          systemUpdates: false,
        },
        preferences: {
          language: 'en',
          timezone: 'Africa/Kampala',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          currency: 'UGX',
          defaultSenderId: 'SALES',
          smsSignature: 'Best regards',
        },
      },
    },
  ];

  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: userData.email } });
      
      if (existingUser) {
        console.log(`📝 Updating existing user: ${userData.email}`);
        
        // Update user data
        existingUser.firstName = userData.firstName;
        existingUser.lastName = userData.lastName;
        existingUser.phone = userData.phone;
        existingUser.company = userData.company;
        existingUser.role = userData.role;
        existingUser.isEmailVerified = userData.isEmailVerified;
        existingUser.isPhoneVerified = userData.isPhoneVerified;
        existingUser.credits = userData.credits;
        existingUser.settings = userData.settings;
        
        // Update password if it's the default
        try {
          const isDefaultPassword = await existingUser.comparePassword(userData.password);
          if (isDefaultPassword) {
            const salt = await bcrypt.genSalt(12);
            existingUser.password = await bcrypt.hash(userData.password, salt);
          }
        } catch (error) {
          // If password comparison fails, update password
          const salt = await bcrypt.genSalt(12);
          existingUser.password = await bcrypt.hash(userData.password, salt);
        }
        
        await existingUser.save();
        updatedCount++;
        
        // Create initial transaction for updated credits
        await Transaction.create({
          userId: existingUser.id,
          type: 'bonus',
          amount: userData.credits,
          currency: userData.settings.preferences.currency || 'USD',
          status: 'completed',
          paymentMethod: 'system',
          description: `Initial credits for ${userData.email}`,
          balanceBefore: 0,
          balanceAfter: userData.credits,
          metadata: {
            seed: true,
            userType: userData.role,
          },
        });
        
      } else {
        console.log(`✨ Creating new user: ${userData.email}`);
        
        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        // Create user
        const user = await User.create({
          ...userData,
          password: hashedPassword,
        });
        
        createdCount++;
        
        // Create initial transaction
        await Transaction.create({
          userId: user.id,
          type: 'bonus',
          amount: userData.credits,
          currency: userData.settings.preferences.currency || 'TZS',
          status: 'completed',
          paymentMethod: 'system',
          description: `Welcome bonus for ${userData.firstName} ${userData.lastName}`,
          balanceBefore: 0,
          balanceAfter: userData.credits,
          metadata: {
            seed: true,
            userType: userData.role,
            welcomeBonus: true,
          },
        });
        
        // Create sample transactions for admin
        if (userData.role === 'super_admin') {
          await Transaction.create({
            userId: user.id,
            type: 'credit_purchase',
            amount: 5000,
            currency: 'USD',
            status: 'completed',
            paymentMethod: 'system',
            description: 'Credit purchase - PRO Plan',
            gatewayTransactionId: 'seed_txn_001',
            taxAmount: 500,
            discountAmount: 250,
            netAmount: 5250,
            balanceBefore: userData.credits,
            balanceAfter: userData.credits + 5250,
            metadata: {
              seed: true,
              plan: 'pro',
              smsCount: 50000,
            },
          });
        }
      }
    }
    
    console.log(`✅ User seeding completed: ${createdCount} created, ${updatedCount} updated`);
    
    // Print credentials summary
    console.log('\n📋 User Credentials Summary:');
    console.log('=' .repeat(40));
    users.forEach(user => {
      console.log(`\n👤 ${user.firstName} ${user.lastName}`);
      console.log(`   Email:    ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Role:     ${user.role}`);
      console.log(`   Credits:  ${user.credits.toLocaleString()} ${user.settings.preferences.currency || 'USD'}`);
      console.log(`   Phone:    ${user.phone}`);
    });
    console.log('\n' + '=' .repeat(40));
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

export default seedAdminUser;
