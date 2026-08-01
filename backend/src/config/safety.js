// Safety check to prevent accidental data loss
const fs = require('fs');
const path = require('path');

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Block force sync in production
if (isProduction) {
  const originalSync = require('sequelize').Sequelize.prototype.sync;
  require('sequelize').Sequelize.prototype.sync = function(options) {
    if (options && options.force === true) {
      throw new Error('❌ CRITICAL: force sync is BLOCKED in production! This would delete all data.');
    }
    return originalSync.call(this, options);
  };
  
  console.log('🛡️  Production safety: force sync is BLOCKED');
}

// Log warning if NODE_ENV is not set
if (!process.env.NODE_ENV) {
  console.warn('⚠️  WARNING: NODE_ENV is not set! Defaulting to development.');
  process.env.NODE_ENV = 'development';
}

console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
