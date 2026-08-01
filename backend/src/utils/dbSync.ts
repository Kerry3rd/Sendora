import sequelize from '../config/sequelize';
import User from '../models/User';
import Contact from '../models/Contact';
import Campaign from '../models/Campaign';
import Message from '../models/Message';
import SMSGateway from '../models/SMSGateway';
import Transaction from '../models/Transaction';
import Group from '../models/Group';
import GroupMembership from '../models/GroupMembership';

const models = {
  User,
  Contact,
  Campaign,
  Message,
  SMSGateway,
  Transaction,
};

// Define relationships
const setupAssociations = (): void => {

  // Group associations
  Group.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Group.belongsToMany(Contact, {
    through: {
      model: GroupMembership,
      unique: false
    },
    foreignKey: 'groupId',
    otherKey: 'contactId',
    as: 'contacts',
  });

  Contact.belongsToMany(Group, {
    through: GroupMembership,
    foreignKey: 'contactId',
    otherKey: 'groupId',
    as: 'contactGroups',
  });

  // Group.hasMany(Group, {
  //   foreignKey: 'groupId',
  //   as: 'memberships',
  // });

  // GroupMember.belongsTo(Group, {
  //   foreignKey: 'groupId',
  //   as: 'group',
  // });

  // GroupMember.belongsTo(Contact, {
  //   foreignKey: 'contactId',
  //   as: 'contact',
  // });

  // User has many Contacts
  User.hasMany(Contact, {
    foreignKey: 'userId',
    as: 'contacts',
    onDelete: 'CASCADE',
  });

  Contact.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many Groups
  User.hasMany(Group, {
    foreignKey: 'userId',
    as: 'groups',
    onDelete: 'CASCADE',
  });

  // User has many Campaigns
  User.hasMany(Campaign, {
    foreignKey: 'userId',
    as: 'campaigns',
    onDelete: 'CASCADE',
  });
  Campaign.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Campaign has many Messages
  Campaign.hasMany(Message, {
    foreignKey: 'campaignId',
    as: 'messages',
    onDelete: 'CASCADE',
  });
  Message.belongsTo(Campaign, {
    foreignKey: 'campaignId',
    as: 'campaign',
  });

  // User has many Messages
  User.hasMany(Message, {
    foreignKey: 'userId',
    as: 'messages',
    onDelete: 'CASCADE',
  });
  Message.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Message belongs to Contact
  Message.belongsTo(Contact, {
    foreignKey: 'contactId',
    as: 'contact',
  });

  // Message belongs to SMSGateway
  Message.belongsTo(SMSGateway, {
    foreignKey: 'gatewayId',
    as: 'smsGateway',
  });

  // SMSGateway has many Messages
  SMSGateway.hasMany(Message, {
    foreignKey: 'gatewayId',
    as: 'messages',
    onDelete: 'SET NULL',
  });

  // User has many Transactions
  User.hasMany(Transaction, {
    foreignKey: 'userId',
    as: 'transactions',
    onDelete: 'CASCADE',
  });
  Transaction.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Campaign can have gateway
  Campaign.belongsTo(SMSGateway, {
    foreignKey: 'primaryGatewayId',
    as: 'primaryGateway',
  });

  console.log('✅ Database associations setup complete.');
};

const syncDatabase = async (force = false): Promise<void> => {
  try {
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Setup associations
    setupAssociations();

    // CRITICAL FIX: Only sync without forcing (never drop tables automatically)
    // This preserves all existing data
    await sequelize.sync({ 
      force: false, // NEVER use force in development or production
      alter: false  // Don't alter tables automatically either
    });
    
    console.log('✅ Database synced successfully (tables preserved).');
    console.log('⚠️  IMPORTANT: Existing data has been preserved.');

  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
};

// Separate function for resetting database (only use when explicitly called)
const resetDatabase = async (): Promise<void> => {
  console.log('⚠️  ⚠️  ⚠️  WARNING: This will DELETE ALL data in the database!');
  console.log('⚠️  This should ONLY be used in development when absolutely necessary.');
  console.log('⚠️  Type "YES-DELETE-ALL-DATA" to confirm:');
  
  // In a real app, you'd want to add a confirmation prompt here
  // For now, we'll just log a warning and not actually reset
  console.log('❌ Database reset cancelled. Use npm run db:reset:force if you really need to reset.');
  
  // To actually reset, you'd need to explicitly call with force=true
  // await sequelize.sync({ force: true });
};

export { syncDatabase, setupAssociations, resetDatabase };
