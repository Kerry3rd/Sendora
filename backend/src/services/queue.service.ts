// backend/src/services/queue.service.ts
import Queue from 'bull';
import redisClient from '../config/redis';
import { smsService } from './sms/SMSService';

export let smsQueue: Queue.Queue | null = null;
export let emailQueue: Queue.Queue | null = null;

export const initializeQueues = async () => {
  if (!redisClient.getStatus().connected) {
    console.log('⚠️ Redis not connected, queues disabled');
    return { smsQueue: null, emailQueue: null };
  }

  try {
    // Initialize SMS Queue
    smsQueue = new Queue('sms', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Initialize Email Queue (optional)
    emailQueue = new Queue('email', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });

    // Process SMS jobs
    smsQueue.process(async (job) => {
      console.log(`📱 Processing SMS job ${job.id}`);
      await smsService.processQueuedMessage(job.data);
    });

    // Queue event handlers
    smsQueue.on('completed', (job) => {
      console.log(`✅ SMS job ${job.id} completed`);
    });

    smsQueue.on('failed', (job, err) => {
      console.error(`❌ SMS job ${job.id} failed:`, err.message);
    });

    smsQueue.on('stalled', (job) => {
      console.warn(`⚠️ SMS job ${job.id} stalled`);
    });

    console.log('✅ Bull queues initialized');
    
    return { smsQueue, emailQueue };
  } catch (error) {
    console.error('❌ Failed to initialize queues:', error);
    return { smsQueue: null, emailQueue: null };
  }
};

// Clean up old jobs periodically
export const cleanQueues = async () => {
  if (smsQueue) {
    await smsQueue.clean(24 * 3600 * 1000, 'completed');
    await smsQueue.clean(24 * 3600 * 1000, 'failed');
  }
};