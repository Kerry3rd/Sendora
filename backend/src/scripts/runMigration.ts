import { up } from '../migrations/20240309_add_security_fields';
import sequelize from '../config/sequelize';

async function runMigration() {
  try {
    console.log('🚀 Starting migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Run migration
    const queryInterface = sequelize.getQueryInterface();
    await up(queryInterface);
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();