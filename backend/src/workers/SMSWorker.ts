import { Worker, Job } from 'bullmq';
import RedisClient from '../config/redis';
import { gatewayManager } from '../services/sms/SMSGatewayService';
import Message from '../models/Message';
import User from '../models/User';
import Campaign from '../models/Campaign';
import { Op } from 'sequelize';
import Transaction from '../models/Transaction';
import NotificationService from '@/services/notification/notification.service';

interface SMSJobData {
  id?: string;
  messageId?: string;
  campaignId?: string;
  userId: string;
  phoneNumber: string;
  message: string;
  senderId: string;
  isUnicode?: boolean;
  isFlash?: boolean;
  cost: number;
  parts: number;
  metadata?: Record<string, any>;
}

export class SMSWorker {
  private worker: Worker<SMSJobData> | null = null;
  private redisClient: any;
  private queueName = 'sms_queue';
  private isProcessing = false;
  private manualInterval: any = null;

  constructor() {}

  async initialize() {
    try {
      this.redisClient = await RedisClient.getClient();
      console.log('✅ Redis connected in worker');
      
      // Start manual processor as backup
      this.startManualProcessor();
      
      // Try BullMQ worker
      try {
        this.worker = new Worker<SMSJobData>(
          this.queueName,
          async (job: Job) => {
            console.log(`\n📨 BullMQ processing job ${job.id} for ${job.data.phoneNumber}`);
            return await this.processSMSJob(job.data);
          },
          {
            connection: this.redisClient,
            concurrency: 3,
          }
        );

        this.worker.on('completed', (job) => {
          console.log(`✅ Job ${job?.id} completed`);
        });

        this.worker.on('failed', (job, error) => {
          console.error(`❌ Job ${job?.id} failed:`, error.message);
        });

        console.log('✅ BullMQ worker initialized');
      } catch (e) {
        console.log('⚠️ BullMQ worker failed, using manual processor only');
      }
      
    } catch (error) {
      console.error('❌ Worker initialization failed:', error);
    }
  }

  startManualProcessor() {
    this.manualInterval = setInterval(async () => {
      try {
        if (!this.redisClient) return;
        
        // Try to pop a job
        const jobData = await this.redisClient.rPop(this.queueName);
        
        if (jobData) {
          console.log(`\n📦 Manual processor picked up job`);
          const job = JSON.parse(jobData);
          await this.processSMSJob(job);
        }
      } catch (error) {
        console.error('❌ Manual processor error:', error);
      }
    }, 3000); // Check every 3 seconds
  }

  async processSMSJob(data: SMSJobData): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log(`📨 Processing: ${data.phoneNumber}`);
      
      // Update message status
      if (data.messageId) {
        await Message.update(
          { status: 'processing' },
          { where: { id: data.messageId } }
        );
      }

      // Send SMS
      const result = await gatewayManager.sendSMS({
        to: data.phoneNumber,
        from: data.senderId,
        body: data.message,
        isUnicode: data.isUnicode,
        isFlash: data.isFlash,
      });

      console.log(`✅ Gateway response:`, result);

      // Update message
      if (data.messageId) {
        await Message.update(
          {
            status: result.success ? 'sent' : 'failed',
            gateway: result.gateway,
            gatewayMessageId: result.messageId,
            sentAt: new Date(),
            metadata: { response: result, processingTime: Date.now() - startTime },
          },
          { where: { id: data.messageId } }
        );
      }

      // Update campaign
      if (data.campaignId) {
        if (result.success) {
          await Campaign.increment('sentCount', { by: 1, where: { id: data.campaignId } });
        } else {
          await Campaign.increment('failedCount', { by: 1, where: { id: data.campaignId } });
        }

        const campaign = await Campaign.findByPk(data.campaignId);
        if (campaign) {
          const totalMessages = campaign.totalRecipients;
          const processedMessages = (campaign.sentCount || 0) + (campaign.failedCount || 0);
          
          // If all messages have been processed (sent + failed = total)
          if (processedMessages >= totalMessages && campaign.status === 'running') {
            campaign.status = 'completed';
            campaign.completedAt = new Date();
            await campaign.save();
            console.log(`✅ Campaign ${campaign.id} automatically completed`);
          

            const stats = {
              delivered: campaign.deliveredCount,
              failed: campaign.failedCount,
              total: campaign.totalRecipients
            }
            await NotificationService.campaignCompleted(
              campaign.userId,
              campaign.id,
              campaign.name,
              stats
            );

            console.log(`✅ Campaign ${campaign.name} automatically completed`);
          }
        }
      }

      // Deduct credits
      if (result.success && result.cost && data.userId) {
        const user = await User.findByPk(data.userId);
        if (user) {
          const costInTZS = Math.ceil(result.cost * 2630);
          user.credits -= costInTZS;
          await user.save();

          // Record transaction
          await Transaction.create({
            userId: data.userId,
            type: 'sms_charge',
            amount: costInTZS,
            currency: 'TZS',
            status: 'completed',
            paymentMethod: 'system',
            creditsBefore: user.credits + costInTZS,
            creditsAfter: user.credits,
            description: 'SMS to ${data.phoneNumber}',
            metadata: {
              messageId: data.messageId,
              campaignId: data.campaignId,
              cost: result.cost,
            },
          });

          console.log(' Deducted ${costInTZS} TZS from user ${data.userId}');
        }
      }

      return result;

    } catch (error: any) {
      console.error(`❌ Job error:`, error.message);
      
      if (data.messageId) {
        await Message.update(
          {
            status: 'failed',
            error: error.message,
          },
          { where: { id: data.messageId } }
        );
      }
      
      throw error;
    }
  }

  async start() {
    if (this.isProcessing) {
      console.log('⚠️ Worker already running');
      return;
    }
    
    await this.initialize();
    this.isProcessing = true;
    
    console.log('\n🚀 SMS WORKER STARTED');
    console.log('   Gateways ready: AfricasTalking, Twilio, Virtual');
    console.log('   ----------------------------------------');
  }

  async stop() {
    if (this.manualInterval) {
      clearInterval(this.manualInterval);
    }
    if (this.worker) {
      await this.worker.close();
    }
    this.isProcessing = false;
    console.log('🛑 Worker stopped');
  }

  async getQueueSize(): Promise<number> {
    try {
      if (!this.redisClient) return 0;
      return await this.redisClient.llen(this.queueName);
    } catch {
      return 0;
    }
  }
}

export const smsWorker = new SMSWorker();
export default smsWorker;
