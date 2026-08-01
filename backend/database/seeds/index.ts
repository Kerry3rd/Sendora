import dotenv from 'dotenv';
import sequelize from '../../src/config/sequelize';
import seedAdminUser from './seedAdminUser';
import seedSMSGateways from './seedSMSGateways';
import seedContacts from './seedContacts';
import seedCampaigns from './seedCampaigns';

dotenv.config();

interface SeedOptions {
  skipUsers?: boolean;
  skipGateways?: boolean;
  skipContacts?: boolean;
  skipCampaigns?: boolean;
  force?: boolean;
}

const runSeeds = async (options: SeedOptions = {}): Promise<void> => {
  console.log('🚀 Starting database seeding process...');
  console.log('=' .repeat(50));

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Force sync if requested
    if (options.force) {
      console.log('🔄 Force syncing database...');
      await sequelize.sync({ force: true });
      console.log('✅ Database force synced');
    }

    // Run seeds based on options
    const startTime = Date.now();

    if (!options.skipUsers) {
      console.log('\n👥 Seeding users...');
      await seedAdminUser();
    } else {
      console.log('\n⏭️  Skipping users...');
    }

    if (!options.skipGateways) {
      console.log('\n📡 Seeding SMS gateways...');
      await seedSMSGateways();
    } else {
      console.log('\n⏭️  Skipping SMS gateways...');
    }

    if (!options.skipContacts) {
      console.log('\n📇 Seeding contacts...');
      await seedContacts();
    } else {
      console.log('\n⏭️  Skipping contacts...');
    }

    if (!options.skipCampaigns) {
      console.log('\n📨 Seeding campaigns and messages...');
      await seedCampaigns();
    } else {
      console.log('\n⏭️  Skipping campaigns...');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '=' .repeat(50));
    console.log(`🎉 Seeding completed in ${duration} seconds!`);
    console.log('=' .repeat(50));

  } catch (error: any) {
    console.error('\n❌ Error during seeding:', error.message);
    process.exit(1);
  }
};

// Parse command line arguments
const parseArgs = (): SeedOptions => {
  const args = process.argv.slice(2);
  const options: SeedOptions = {};

  args.forEach(arg => {
    if (arg === '--skip-users') options.skipUsers = true;
    if (arg === '--skip-gateways') options.skipGateways = true;
    if (arg === '--skip-contacts') options.skipContacts = true;
    if (arg === '--skip-campaigns') options.skipCampaigns = true;
    if (arg === '--force') options.force = true;
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npm run db:seed [options]

Options:
  --skip-users      Skip seeding users
  --skip-gateways   Skip seeding SMS gateways
  --skip-contacts   Skip seeding contacts
  --skip-campaigns  Skip seeding campaigns
  --force           Force sync database before seeding
  --help, -h        Show this help message

Examples:
  npm run db:seed                    # Run all seeds
  npm run db:seed --skip-campaigns   # Skip campaigns only
  npm run db:seed --force           # Force sync and seed
      `);
      process.exit(0);
    }
  });

  return options;
};

// Run seeds if called directly
if (require.main === module) {
  const options = parseArgs();
  runSeeds(options)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default runSeeds;
export { seedAdminUser, seedSMSGateways, seedContacts, seedCampaigns };
