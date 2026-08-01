import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    console.log('🔧 Running migration: Add security fields to users table');

    // Check if columns exist before adding them
    const tableInfo = await queryInterface.describeTable('users');

    // Add twoFactorSecret column if it doesn't exist
    if (!tableInfo.twoFactorSecret) {
      await queryInterface.addColumn('users', 'twoFactorSecret', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
      console.log('✅ Added column: twoFactorSecret');
    }

    // Add twoFactorEnabled column if it doesn't exist
    if (!tableInfo.twoFactorEnabled) {
      await queryInterface.addColumn('users', 'twoFactorEnabled', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
      console.log('✅ Added column: twoFactorEnabled');
    }

    // Add twoFactorBackupCodes column if it doesn't exist
    if (!tableInfo.twoFactorBackupCodes) {
      await queryInterface.addColumn('users', 'twoFactorBackupCodes', {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      });
      console.log('✅ Added column: twoFactorBackupCodes');
    }

    // Add tokenVersion column if it doesn't exist
    if (!tableInfo.tokenVersion) {
      await queryInterface.addColumn('users', 'tokenVersion', {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
      });
      console.log('✅ Added column: tokenVersion');
    }

    // Add resetTokenVersion column if it doesn't exist
    if (!tableInfo.resetTokenVersion) {
      await queryInterface.addColumn('users', 'resetTokenVersion', {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
      });
      console.log('✅ Added column: resetTokenVersion');
    }

    // Add lastPasswordChange column if it doesn't exist
    if (!tableInfo.lastPasswordChange) {
      await queryInterface.addColumn('users', 'lastPasswordChange', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✅ Added column: lastPasswordChange');
    }

    // Add failedLoginAttempts column if it doesn't exist
    if (!tableInfo.failedLoginAttempts) {
      await queryInterface.addColumn('users', 'failedLoginAttempts', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
      console.log('✅ Added column: failedLoginAttempts');
    }

    // Add lockUntil column if it doesn't exist
    if (!tableInfo.lockUntil) {
      await queryInterface.addColumn('users', 'lockUntil', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✅ Added column: lockUntil');
    }

    // Add loginHistory column if it doesn't exist
    if (!tableInfo.loginHistory) {
      await queryInterface.addColumn('users', 'loginHistory', {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      });
      console.log('✅ Added column: loginHistory');
    }

    // Add lastLoginIp column if it doesn't exist
    if (!tableInfo.lastLoginIp) {
      await queryInterface.addColumn('users', 'lastLoginIp', {
        type: DataTypes.STRING(45),
        allowNull: true,
      });
      console.log('✅ Added column: lastLoginIp');
    }

    // Add lastLoginUserAgent column if it doesn't exist
    if (!tableInfo.lastLoginUserAgent) {
      await queryInterface.addColumn('users', 'lastLoginUserAgent', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log('✅ Added column: lastLoginUserAgent');
    }

    // Now create indexes (only after columns exist)
    console.log('🔧 Creating indexes...');

    try {
      await queryInterface.addIndex('users', ['twoFactorEnabled'], {
        name: 'users_two_factor_enabled',
      });
      console.log('✅ Created index: users_two_factor_enabled');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Index users_two_factor_enabled already exists');
      } else {
        console.error('Error creating index users_two_factor_enabled:', error);
      }
    }

    try {
      await queryInterface.addIndex('users', ['tokenVersion'], {
        name: 'users_token_version',
      });
      console.log('✅ Created index: users_token_version');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Index users_token_version already exists');
      } else {
        console.error('Error creating index users_token_version:', error);
      }
    }

    try {
      await queryInterface.addIndex('users', ['lastLoginAt'], {
        name: 'users_last_login_at',
      });
      console.log('✅ Created index: users_last_login_at');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Index users_last_login_at already exists');
      } else {
        console.error('Error creating index users_last_login_at:', error);
      }
    }

    try {
      await queryInterface.addIndex('users', ['failedLoginAttempts'], {
        name: 'users_failed_login_attempts',
      });
      console.log('✅ Created index: users_failed_login_attempts');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Index users_failed_login_attempts already exists');
      } else {
        console.error('Error creating index users_failed_login_attempts:', error);
      }
    }

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    console.log('🔧 Rolling back migration: Remove security fields from users table');

    // Remove indexes
    try {
      await queryInterface.removeIndex('users', 'users_two_factor_enabled');
      console.log('✅ Removed index: users_two_factor_enabled');
    } catch (error) {
      console.log('ℹ️ Index users_two_factor_enabled does not exist');
    }

    try {
      await queryInterface.removeIndex('users', 'users_token_version');
      console.log('✅ Removed index: users_token_version');
    } catch (error) {
      console.log('ℹ️ Index users_token_version does not exist');
    }

    try {
      await queryInterface.removeIndex('users', 'users_last_login_at');
      console.log('✅ Removed index: users_last_login_at');
    } catch (error) {
      console.log('ℹ️ Index users_last_login_at does not exist');
    }

    try {
      await queryInterface.removeIndex('users', 'users_failed_login_attempts');
      console.log('✅ Removed index: users_failed_login_attempts');
    } catch (error) {
      console.log('ℹ️ Index users_failed_login_attempts does not exist');
    }

    // Remove columns
    const columnsToRemove = [
      'twoFactorSecret',
      'twoFactorEnabled',
      'twoFactorBackupCodes',
      'tokenVersion',
      'resetTokenVersion',
      'lastPasswordChange',
      'failedLoginAttempts',
      'lockUntil',
      'loginHistory',
      'lastLoginIp',
      'lastLoginUserAgent'
    ];

    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn('users', column);
        console.log(`✅ Removed column: ${column}`);
      } catch (error) {
        console.log(`ℹ️ Column ${column} does not exist`);
      }
    }

    console.log('✅ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}