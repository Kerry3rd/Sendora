import RedisClient from './config/redis';

async function clearQueue() {
  try {
    const redis = await RedisClient.getClient();
    const queueName = 'sms_queue';
    
    // Check current size - use lLen (uppercase L)
    const size = await redis.lLen(queueName);
    console.log(`📊 Queue size before: ${size}`);
    
    // Delete the queue
    await redis.del(queueName);
    console.log('✅ Queue cleared');
    
    // Verify
    const newSize = await redis.lLen(queueName);
    console.log(`📊 Queue size after: ${newSize}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearQueue();
