import Campaign from '../../src/models/Campaign';
import Message from '../../src/models/Message';
import User from '../../src/models/User';
import Contact from '../../src/models/Contact';

// Check if faker is available
let faker: any;
try {
  faker = require('@faker-js/faker').faker;
} catch (error) {
  console.log('⚠️  faker.js not installed, using simple data generation');
  faker = {
    person: {
      firstName: () => ['John', 'Jane', 'Mike', 'Sarah'][Math.floor(Math.random() * 4)],
      lastName: () => ['Doe', 'Smith', 'Johnson'][Math.floor(Math.random() * 3)],
    },
    string: {
      uuid: () => Math.random().toString(36).substring(2),
      numeric: (len: number) => Math.floor(Math.random() * Math.pow(10, len)).toString(),
    },
    internet: {
      email: () => `user${Math.floor(Math.random() * 1000)}@example.com`,
    },
    date: {
      past: () => new Date(),
      recent: () => new Date(),
      between: () => new Date(),
    },
    number: {
      int: ({ min, max }: { min: number; max: number }) => 
        Math.floor(Math.random() * (max - min + 1)) + min,
    },
    helpers: {
      arrayElements: (arr: any[], count: number) => arr.slice(0, count),
    },
  };
}

const seedCampaigns = async (): Promise<void> => {
  console.log('🌱 Seeding sample campaigns...');

  try {
    // Get admin user
    const adminUser = await User.findOne({ where: { email: 'admin@sendora.com' } });
    
    if (!adminUser) {
      console.log('⚠️ Admin user not found. Run seedAdminUser first.');
      return;
    }

    // Clear existing campaigns for admin
    await Campaign.destroy({ where: { userId: adminUser.id } });
    console.log('🗑️  Cleared existing campaigns for admin');

    // Get some contacts to associate with campaigns
    const contacts = await Contact.findAll({ 
      where: { userId: adminUser.id },
      limit: 50
    });

    // Campaign templates
    const campaignTemplates = [
      {
        name: 'Welcome Campaign',
        description: 'Welcome new subscribers to our service',
        message: 'Hello {{name}}, welcome to our service! We\'re excited to have you on board.',
        senderId: 'WELCOME',
        isUnicode: false,
        isFlash: false,
        status: 'completed' as const,
      },
      {
        name: 'Promotional Offer',
        description: 'Promote special offers to customers',
        message: 'Hi {{name}}! Exclusive offer just for you: Get 20% off on your next purchase.',
        senderId: 'PROMO',
        isUnicode: false,
        isFlash: false,
        status: 'completed' as const,
      },
      {
        name: 'Payment Reminder',
        description: 'Send payment reminders to customers',
        message: 'Dear {{name}}, this is a reminder that your payment is due soon.',
        senderId: 'BILLING',
        isUnicode: false,
        isFlash: false,
        status: 'running' as const,
      },
      {
        name: 'Appointment Reminder',
        description: 'Remind customers of upcoming appointments',
        message: 'Reminder: You have an appointment scheduled.',
        senderId: 'APPOINT',
        isUnicode: false,
        isFlash: false,
        status: 'scheduled' as const,
      },
      {
        name: 'Customer Feedback',
        description: 'Request feedback from customers',
        message: 'Hi {{name}}, we value your opinion! Please take a moment to rate our service.',
        senderId: 'FEEDBACK',
        isUnicode: false,
        isFlash: false,
        status: 'draft' as const,
      },
      {
        name: 'Birthday Greetings',
        description: 'Send birthday wishes to customers',
        message: '🎉 Happy Birthday {{name}}! 🎂 Wishing you a wonderful day!',
        senderId: 'BIRTHDAY',
        isUnicode: true,
        isFlash: false,
        status: 'scheduled' as const,
      },
      {
        name: 'Service Update',
        description: 'Notify users about service updates',
        message: 'Service Update: We have improved our platform with new features!',
        senderId: 'UPDATE',
        isUnicode: false,
        isFlash: false,
        status: 'completed' as const,
      },
      {
        name: 'Event Invitation',
        description: 'Invite contacts to an event',
        message: 'You\'re invited to our upcoming event! Join us for networking and fun.',
        senderId: 'INVITE',
        isUnicode: false,
        isFlash: false,
        status: 'draft' as const,
      },
    ];

    const sampleCampaigns = [];
    const now = new Date();
    
    for (let i = 0; i < campaignTemplates.length; i++) {
      const template = campaignTemplates[i];
      const campaignContacts = contacts.length > 0 
        ? contacts.slice(0, Math.min(contacts.length, faker.number.int({ min: 5, max: 20 })))
        : [];
      
      // Calculate campaign dates
      const createdAt = new Date(now.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000));
      const startedAt = template.status !== 'draft' ? 
        new Date(createdAt.getTime() + (Math.random() * 5 * 24 * 60 * 60 * 1000)) : null;
      const completedAt = template.status === 'completed' && startedAt ?
        new Date(startedAt.getTime() + (Math.random() * 2 * 24 * 60 * 60 * 1000)) : null;
      const scheduledFor = template.status === 'scheduled' ?
        new Date(now.getTime() + (Math.random() * 10 * 24 * 60 * 60 * 1000)) : null;

      // Calculate statistics
      const totalRecipients = campaignContacts.length;
      const sentCount = template.status === 'completed' ? totalRecipients : 
                       template.status === 'running' ? Math.floor(totalRecipients * 0.6) : 0;
      const deliveredCount = sentCount > 0 ? Math.floor(sentCount * 0.9) : 0;
      const failedCount = sentCount - deliveredCount;
      
      // Calculate costs
      const messageParts = Math.ceil(template.message.length / 160);
      const costPerMessage = messageParts * 0.01;
      const estimatedCost = totalRecipients * costPerMessage;
      const actualCost = sentCount * costPerMessage;

      sampleCampaigns.push({
        userId: adminUser.id,
        name: `${template.name}`,
        description: template.description,
        message: template.message,
        senderId: template.senderId,
        status: template.status,
        scheduledFor,
        startedAt,
        completedAt,
        totalRecipients,
        sentCount,
        deliveredCount,
        failedCount,
        estimatedCost,
        actualCost,
        isUnicode: template.isUnicode,
        isFlash: template.isFlash,
        variables: ['name'],
        metadata: {
          template: template.name,
          seed: true,
          messageParts,
          costPerMessage,
          tags: ['sample', 'seed', template.status],
        },
        createdAt,
        updatedAt: new Date(createdAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000),
      });
    }

    // Create campaigns
    const createdCampaigns = await Campaign.bulkCreate(sampleCampaigns, { returning: true });
    
    console.log(`✅ ${createdCampaigns.length} campaigns created successfully!`);

    // Create sample messages for each campaign
    console.log('📨 Creating sample messages...');
    
    const sampleMessages = [];
    for (const campaign of createdCampaigns) {
      if (campaign.status === 'draft' || contacts.length === 0) continue;
      
      // Get contacts for this campaign
      const campaignContacts = contacts.slice(0, Math.min(contacts.length, campaign.totalRecipients || 10));
      
      for (const contact of campaignContacts) {
        // Determine message status based on campaign stats
        let status: 'pending' | 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'undelivered' = 'sent';
        
        if (campaign.status === 'completed') {
          status = Math.random() < 0.9 ? 'delivered' : 'failed';
        } else if (campaign.status === 'running') {
          status = ['queued', 'processing', 'sent'][Math.floor(Math.random() * 3)] as any;
        } else {
          status = 'pending';
        }

        // Calculate message cost
        const messageParts = Math.ceil(campaign.message.length / 160);
        const cost = messageParts * 0.01;
        
        // Generate timestamps
        const sentAt = campaign.startedAt && status !== 'pending' ? 
          new Date(campaign.startedAt.getTime() + Math.random() * 60 * 60 * 1000) : null;
        const deliveredAt = status === 'delivered' && sentAt ?
          new Date(sentAt.getTime() + Math.random() * 5 * 60 * 1000) : null;

        sampleMessages.push({
          userId: adminUser.id,
          campaignId: campaign.id,
          contactId: contact.id,
          phoneNumber: contact.phoneNumber,
          message: campaign.message.replace('{{name}}', contact.firstName || 'Customer'),
          senderId: campaign.senderId,
          status,
          gateway: 'Virtual',
          gatewayMessageId: `virtual_${Date.now()}_${Math.random()}`,
          parts: messageParts,
          cost,
          isUnicode: campaign.isUnicode,
          isFlash: campaign.isFlash,
          sentAt,
          deliveredAt,
          error: status === 'failed' ? 'Simulated delivery failure' : null,
          retryCount: status === 'failed' ? 1 : 0,
          metadata: {
            seed: true,
            contactName: `${contact.firstName} ${contact.lastName}`,
          },
          createdAt: sentAt || campaign.createdAt,
          updatedAt: deliveredAt || sentAt || campaign.updatedAt,
        });
      }
    }

    // Create messages in batches
    if (sampleMessages.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < sampleMessages.length; i += batchSize) {
        const batch = sampleMessages.slice(i, i + batchSize);
        await Message.bulkCreate(batch);
        console.log(`  Created ${Math.min(i + batchSize, sampleMessages.length)}/${sampleMessages.length} messages...`);
      }
    }

    // Print campaign statistics
    console.log('\n📊 Campaign Statistics:');
    console.log('=' .repeat(60));
    
    const campaigns = await Campaign.findAll({ 
      where: { userId: adminUser.id },
      order: [['createdAt', 'DESC']]
    });

    campaigns.forEach((campaign: any, index: number) => {
      const deliveryRate = campaign.sentCount > 0 ? 
        Math.round((campaign.deliveredCount / campaign.sentCount) * 100) : 0;
      
      console.log(`\n${index + 1}. ${campaign.name}`);
      console.log(`   Status: ${campaign.status}`);
      console.log(`   Recipients: ${campaign.totalRecipients}`);
      console.log(`   Sent: ${campaign.sentCount}`);
      console.log(`   Delivered: ${campaign.deliveredCount} (${deliveryRate}%)`);
      console.log(`   Failed: ${campaign.failedCount}`);
      console.log(`   Cost: $${(campaign.actualCost || 0).toFixed(2)}`);
      console.log(`   Created: ${new Date(campaign.createdAt).toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('❌ Error seeding campaigns:', error);
    throw error;
  }
};

export default seedCampaigns;
