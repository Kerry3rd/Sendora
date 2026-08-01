import { smsWorker } from './workers/SMSWorker';
import RedisClient from './config/redis';
import dotenv from 'dotenv';
import './jobs/completeCampaigns';
import './jobs/recurringCampaignScheduler';

dotenv.config();

async function startWorker() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 BULK SMS WORKER - FIXED VERSION');
  console.log('='.repeat(60));
  
  try {
    // Test Redis connection
    const redis = await RedisClient.getClient();
    await redis.ping();
    console.log('✅ Redis connection confirmed');
    
    // Clear any stale locks (if using BullMQ)
    // This is optional but helps
    
    await smsWorker.start();
    
    // Manual queue processor as backup
    setInterval(async () => {
      try {
        // Try to pop a job directly
        const jobData = await redis.rPop('sms_queue');
        if (jobData) {
          console.log(`\n📦 Manually processing job from queue`);
          const job = JSON.parse(jobData);
          
          // Process it manually
          await processManualJob(job, redis);
        }
      } catch (e) {
        // Ignore
      }
    }, 5000);
    
    // Keep process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down worker...');
      await smsWorker.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down worker...');
      await smsWorker.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Manual job processor
async function processManualJob(job: any, redis: any) {
  console.log(`\n📨 Manual processing: ${job.phoneNumber}`);
  console.log(`   Message: ${job.message?.substring(0, 50)}...`);
  
  try {
    // Import here to avoid circular deps
    const { gatewayManager } = require('./services/sms/SMSGatewayService');
    const Message = require('./models/Message').default;
    const Campaign = require('./models/Campaign').default;
    const User = require('./models/User').default;
    
    // Send SMS
    const result = await gatewayManager.sendSMS({
      to: job.phoneNumber,
      from: job.senderId || 'SENDORA',
      body: job.message
    });
    
    console.log(`✅ SMS sent:`, result);
    
    // Update message
    if (job.messageId) {
      await Message.update(
        {
          status: result.success ? 'sent' : 'failed',
          gateway: result.gateway,
          gatewayMessageId: result.messageId,
          sentAt: new Date(),
          metadata: { response: result }
        },
        { where: { id: job.messageId } }
      );
    }
    
    // Update campaign
    if (job.campaignId && result.success) {
      await Campaign.increment('sentCount', { 
        by: 1, 
        where: { id: job.campaignId } 
      });
    }
    
    console.log(`✅ Job completed`);
    
  } catch (error: any) {
    console.error(`❌ Manual job failed:`, error.message);
    
    // Mark as failed in DB
    if (job.messageId) {
      const Message = require('./models/Message').default;
      await Message.update(
        {
          status: 'failed',
          error: error.message
        },
        { where: { id: job.messageId } }
      );
    }
  }
}

startWorker();
