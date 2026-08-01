import { syncDatabase } from './utils/dbSync';

(async () => {
  console.log('Testing database connection and sync...');
  await syncDatabase(false); // Don't force sync for testing
  console.log('✅ Database test completed successfully!');
  process.exit(0);
})().catch(error => {
  console.error('❌ Database test failed:', error);
  process.exit(1);
});
