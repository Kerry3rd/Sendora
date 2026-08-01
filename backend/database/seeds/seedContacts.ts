import Contact from '../../src/models/Contact';
import User from '../../src/models/User';

// Check if faker is available, if not use simple data generation
let faker: any;
try {
  faker = require('@faker-js/faker').faker;
} catch (error) {
  console.log('⚠️  faker.js not installed, using simple data generation');
  // Simple fallback data generator
  faker = {
    person: {
      firstName: () => ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma'][Math.floor(Math.random() * 6)],
      lastName: () => ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'][Math.floor(Math.random() * 6)],
      sex: () => ['Male', 'Female'][Math.floor(Math.random() * 2)],
      jobTitle: () => ['Manager', 'Developer', 'Designer', 'Sales', 'Support'][Math.floor(Math.random() * 5)],
    },
    string: {
      numeric: (length: number) => Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0'),
      uuid: () => Math.random().toString(36).substring(2) + Date.now().toString(36),
    },
    internet: {
      email: () => `user${Math.floor(Math.random() * 1000)}@example.com`,
    },
    company: {
      name: () => ['ABC Corp', 'XYZ Ltd', 'Global Inc', 'Tech Solutions', 'Marketing Pro'][Math.floor(Math.random() * 5)],
    },
    helpers: {
      arrayElements: (arr: any[], count: number) => arr.slice(0, count),
    },
    date: {
      past: () => new Date(),
      recent: () => new Date(),
      between: () => new Date(),
    },
    number: {
      int: ({ min, max }: { min: number; max: number }) => Math.floor(Math.random() * (max - min + 1)) + min,
      float: ({ min, max }: { min: number; max: number }) => Math.random() * (max - min) + min,
    },
    datatype: {
      boolean: (probability: number) => Math.random() < probability,
    },
    lorem: {
      sentence: () => 'Sample sentence for testing.',
    },
  };
}

const seedContacts = async (): Promise<void> => {
  console.log('🌱 Seeding sample contacts...');

  try {
    // Get admin user to associate contacts with
    const adminUser = await User.findOne({ where: { email: 'admin@sendora.com' } });
    
    if (!adminUser) {
      console.log('⚠️ Admin user not found. Run seedAdminUser first.');
      return;
    }

    // Clear existing contacts for admin
    await Contact.destroy({ where: { userId: adminUser.id } });
    console.log('🗑️  Cleared existing contacts for admin');

    // Generate sample contacts
    const sampleContacts = [];
    const tags = ['VIP', 'Customer', 'Prospect', 'Subscriber', 'Employee', 'Partner', 'Family', 'Friend'];
    const locations = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Zanzibar', 'Tanga', 'Morogoro'];

    for (let i = 0; i < 50; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const phonePrefix = '+2557'; // Tanzanian mobile prefix
      const phoneNumber = `${phonePrefix}${faker.string.numeric(8)}`;
      
      // Generate email with Tanzanian domains
      const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'co.tz', 'ac.tz'];
      const emailDomain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`;

      // Select random tags (1-3 tags per contact) - FIXED: Explicitly type as string[]
      const contactTags: string[] = [];
      const tagCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < tagCount; j++) {
        const tag = tags[Math.floor(Math.random() * tags.length)];
        if (!contactTags.includes(tag)) {
          contactTags.push(tag);
        }
      }
      
      // Generate custom fields
      const customFields = {
        source: ['Website', 'Referral', 'Event', 'Import', 'Manual'][Math.floor(Math.random() * 5)],
        lastPurchase: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customerSince: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: locations[Math.floor(Math.random() * locations.length)],
        language: ['Swahili', 'English', 'Both'][Math.floor(Math.random() * 3)],
        ageGroup: ['18-25', '26-35', '36-45', '46-55', '56+'][Math.floor(Math.random() * 5)],
        gender: faker.person.sex(),
        occupation: faker.person.jobTitle(),
        company: faker.company.name(),
        department: ['IT', 'Sales', 'Marketing', 'HR', 'Finance'][Math.floor(Math.random() * 5)],
        interests: ['Technology', 'Sports', 'Music', 'Travel', 'Food'].slice(0, Math.floor(Math.random() * 4) + 1),
        subscriptionType: ['Free', 'Basic', 'Premium', 'Enterprise'][Math.floor(Math.random() * 4)],
        loyaltyPoints: Math.floor(Math.random() * 1000),
        lastContacted: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        preferredContactTime: ['Morning', 'Afternoon', 'Evening', 'Any'][Math.floor(Math.random() * 4)],
        optInMethod: ['Web Form', 'SMS', 'Event', 'Phone Call'][Math.floor(Math.random() * 4)],
        notes: 'Sample contact for testing',
      };

      sampleContacts.push({
        userId: adminUser.id,
        phoneNumber,
        firstName,
        lastName,
        email,
        company: faker.company.name(),
        tags: contactTags,
        customFields,
        isSubscribed: Math.random() < 0.8, // 80% subscribed
        isBlacklisted: Math.random() < 0.05, // 5% blacklisted
        lastContacted: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        metadata: {
          createdBy: 'seed',
          importBatch: 'initial_seed_2024',
          lastUpdated: new Date().toISOString(),
          dataQuality: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
          validationStatus: ['Verified', 'Unverified', 'Pending'][Math.floor(Math.random() * 3)],
          sourceFile: 'seed_data.ts',
          importDate: new Date().toISOString(),
          notes: `Sample contact #${i + 1}`,
        },
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Generate additional Tanzanian specific contacts
    const tanzanianNames = [
      { first: 'Juma', last: 'Mohamed' }, { first: 'Fatuma', last: 'Ali' },
      { first: 'Rajab', last: 'Hassan' }, { first: 'Asha', last: 'Juma' },
      { first: 'Omar', last: 'Said' }, { first: 'Neema', last: 'John' },
      { first: 'Bahati', last: 'Michael' }, { first: 'Zainab', last: 'Robert' },
      { first: 'Salim', last: 'Joseph' }, { first: 'Mariam', last: 'David' },
    ];

    for (let i = 0; i < 20; i++) {
      const name = tanzanianNames[i % tanzanianNames.length];
      const phoneNumber = `+2557${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      
      sampleContacts.push({
        userId: adminUser.id,
        phoneNumber,
        firstName: name.first,
        lastName: name.last,
        email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@${['co.tz', 'yahoo.com', 'gmail.com'][Math.floor(Math.random() * 3)]}`,
        company: [
          'Tanzania Breweries',
          'CRDB Bank',
          'Vodacom Tanzania',
          'Tigo Tanzania',
          'NMB Bank',
          'Air Tanzania',
          'Serengeti Breweries',
          'Tanzania Cigarette Company',
          'Bakhresa Group',
          'MeTL Group'
        ][Math.floor(Math.random() * 10)],
        tags: ['Tanzanian', 'Business', 'Local'],
        customFields: {
          source: 'Tanzanian Database',
          location: locations[i % locations.length],
          language: 'Swahili',
          nationality: 'Tanzanian',
          idNumber: `TZ-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          region: locations[i % locations.length],
          district: `${locations[i % locations.length]} District`,
          ward: `Ward ${Math.floor(Math.random() * 10) + 1}`,
          village: `Village ${Math.floor(Math.random() * 20) + 1}`,
          businessType: ['Retail', 'Wholesale', 'Service', 'Manufacturing', 'Agriculture'][Math.floor(Math.random() * 5)],
          taxId: `TIN-${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
          businessSize: ['Micro', 'Small', 'Medium', 'Large'][Math.floor(Math.random() * 4)],
          industry: ['Telecom', 'Banking', 'Manufacturing', 'Agriculture', 'Tourism', 'Mining'][Math.floor(Math.random() * 6)],
        },
        isSubscribed: true,
        isBlacklisted: false,
        lastContacted: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        metadata: {
          createdBy: 'seed',
          importBatch: 'tanzanian_seed_2024',
          nationality: 'Tanzanian',
          dataSource: 'Tanzanian Business Directory',
          verificationStatus: 'Verified',
          lastVerified: new Date().toISOString(),
        },
        createdAt: new Date(Date.now() - Math.random() * 6 * 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
    }

    // Bulk create contacts
    await Contact.bulkCreate(sampleContacts);
    
    // Get statistics
    const totalContacts = await Contact.count({ where: { userId: adminUser.id } });
    const subscribedCount = await Contact.count({ 
      where: { 
        userId: adminUser.id,
        isSubscribed: true 
      } 
    });
    const blacklistedCount = await Contact.count({ 
      where: { 
        userId: adminUser.id,
        isBlacklisted: true 
      } 
    });

    console.log(`✅ Contacts seeded successfully!`);
    console.log(`\n📊 Contact Statistics:`);
    console.log(`   Total Contacts: ${totalContacts}`);
    console.log(`   Subscribed: ${subscribedCount} (${Math.round((subscribedCount / totalContacts) * 100)}%)`);
    console.log(`   Blacklisted: ${blacklistedCount} (${Math.round((blacklistedCount / totalContacts) * 100)}%)`);
    
    // Show sample contacts
    console.log(`\n👥 Sample Contacts Created:`);
    const sample = await Contact.findAll({ 
      where: { userId: adminUser.id },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    
    sample.forEach((contact: any, index: number) => {
      console.log(`\n${index + 1}. ${contact.firstName} ${contact.lastName}`);
      console.log(`   Phone: ${contact.phoneNumber}`);
      console.log(`   Email: ${contact.email || 'N/A'}`);
      console.log(`   Company: ${contact.company || 'N/A'}`);
      console.log(`   Tags: ${contact.tags.join(', ')}`);
      console.log(`   Subscribed: ${contact.isSubscribed ? 'Yes' : 'No'}`);
    });

    // Also create contacts for test user
    const testUser = await User.findOne({ where: { email: 'user@sendora.com' } });
    if (testUser) {
      const testContacts = [];
      for (let i = 0; i < 10; i++) {
        testContacts.push({
          userId: testUser.id,
          phoneNumber: `+2556${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          firstName: ['John', 'Jane', 'Mike', 'Sarah'][Math.floor(Math.random() * 4)],
          lastName: ['Doe', 'Smith', 'Johnson', 'Williams'][Math.floor(Math.random() * 4)],
          email: `user${i}@example.com`,
          tags: ['Test', 'Sample'],
          isSubscribed: true,
          isBlacklisted: false,
        });
      }
      await Contact.bulkCreate(testContacts);
      console.log(`\n✅ Also created 10 sample contacts for test user`);
    }

  } catch (error) {
    console.error('❌ Error seeding contacts:', error);
    throw error;
  }
};

export default seedContacts;
