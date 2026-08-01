import { gatewayManager } from './SMSGatewayService';
import Message from '../../models/Message';
import Campaign from '../../models/Campaign';
import User from '../../models/User';
import redis from '../../config/redis';
import sequelize from '../../config/sequelize';
import { Op } from 'sequelize';
import { Queue } from 'bull'; // Import Queue type
import { PRICING } from '../../config/pricing';
import { InsufficientCreditsError, NotFoundError, BadRequestError } from '../../utils/errors';

export interface SMSMessage {
  to: string;
  from: string;
  body: string;
  messageId?: string;
  isUnicode?: boolean;
  isFlash?: boolean;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  gateway: string;
  status: string;
  error?: string;
  cost?: number;
  remainingBalance?: number;
}

export interface BulkSMSOptions {
  campaignId?: string;
  userId: string;
  contacts: Array<{
    phoneNumber: string;
    variables?: Record<string, string>;
  }>;
  message: string;
  senderId: string;
  isUnicode?: boolean;
  isFlash?: boolean;
  scheduleFor?: Date;
  priority?: 'high' | 'normal' | 'low';
}

export interface DeliveryReportOptions {
  userId: string;
  campaignId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  limit?: number;
  offset?: number;
}

export class SMSService {
  private static instance: SMSService;
  private queueName = 'sms_queue';
  // FIXED: Use Queue type directly, not Queue.Queue
  private smsQueue: Queue | null = null;

  private constructor() {}

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  // Initialize queue (call this after Redis is ready) - FIXED: Use Queue type
  async initializeQueue(queue: Queue | null): Promise<void> {
    this.smsQueue = queue;
    if (queue) {
      console.log('✅ SMS Queue initialized');
    } else {
      console.log('⚠️ SMS Queue not available - using Redis list fallback');
    }
  }

  // Calculate message parts based on encoding
  private calculateMessageParts(message: string, isUnicode?: boolean): number {
    if (!message) return 1;
    if (isUnicode) {
      // Unicode messages have 70 characters per part
      return Math.ceil(message.length / 70);
    }
    // Standard GSM 03.38 encoding has 160 characters per part
    return Math.ceil(message.length / 160);
  }

  // Calculate cost based on pricing tiers
  private calculateCost(quantity: number, parts: number): number {
    const totalMessages = quantity * parts;
    
    // Apply volume pricing tiers from PRICING config
    if (totalMessages <= PRICING.tanzania.tier1.max) {
      return totalMessages * PRICING.tanzania.tier1.price;
    } else if (totalMessages <= PRICING.tanzania.tier2.max) {
      return totalMessages * PRICING.tanzania.tier2.price;
    } else if (totalMessages <= PRICING.tanzania.tier3.max) {
      return totalMessages * PRICING.tanzania.tier3.price;
    } else {
      return totalMessages * PRICING.tanzania.tier4.price;
    }
  }

  // Replace variables in message template
  private replaceVariables(template: string, variables?: Record<string, string>): string {
    if (!variables) return template;
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return result;
  }

  // Validate phone number format
  private validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^(?:\+255|0)[67][0-9]{8}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Format phone number to international format
  private formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('6'))) {
      return `255${cleaned}`;
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `255${cleaned.substring(1)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('255')) {
      return cleaned;
    }
    return phoneNumber;
  }

  // Send single SMS
  async sendSingleSMS(options: {
    userId: string;
    phoneNumber: string;
    message: string;
    senderId: string;
    isUnicode?: boolean;
    isFlash?: boolean;
  }): Promise<SMSResponse> {
    try {
      // Validate phone number
      if (!this.validatePhoneNumber(options.phoneNumber)) {
        throw new BadRequestError('Invalid phone number format');
      }

      // Get user and check credits
      const user = await User.findByPk(options.userId);
      if (!user) throw new NotFoundError('User not found');

      const messageParts = this.calculateMessageParts(options.message, options.isUnicode);
      const estimatedCost = this.calculateCost(1, messageParts);

      // Check if user has enough credits
      if (Number(user.credits) < estimatedCost) {
        throw new InsufficientCreditsError(
          `Insufficient credits. Need ${estimatedCost}, you have ${user.credits}`
        );
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(options.phoneNumber);

      // Prepare SMS message
      const smsMessage: SMSMessage = {
        to: formattedPhone,
        from: options.senderId,
        body: options.message,
        isUnicode: options.isUnicode,
        isFlash: options.isFlash,
      };

      // Send via gateway
      const result = await gatewayManager.sendSMS(smsMessage);

      // Create message record
      const message = await Message.create({
        userId: options.userId,
        contactId: null,
        phoneNumber: formattedPhone,
        message: options.message,
        senderId: options.senderId,
        status: result.success ? 'sent' : 'failed',
        gateway: result.gateway,
        gatewayMessageId: result.messageId,
        cost: result.cost || estimatedCost,
        parts: messageParts,
        isUnicode: options.isUnicode || false,
        isFlash: options.isFlash || false,
        metadata: { response: result },
      });

      // Deduct credits if successful
      if (result.success) {
        user.credits = Number(user.credits) - estimatedCost;
        await user.save();
      }

      return {
        ...result,
        cost: estimatedCost,
        messageId: message.id,
      };
    } catch (error: any) {
      console.error('❌ Error sending single SMS:', error);
      throw error;
    }
  }

  // Send bulk SMS
  async sendBulkSMS(options: BulkSMSOptions): Promise<{
    success: boolean;
    campaignId?: string;
    totalMessages: number;
    estimatedCost: number;
    queuedMessages: number;
    jobId?: string | number;
  }> {
    try {
      // Validate contacts
      if (!options.contacts || options.contacts.length === 0) {
        throw new BadRequestError('No contacts provided');
      }

      // Validate phone numbers
      for (const contact of options.contacts) {
        if (!this.validatePhoneNumber(contact.phoneNumber)) {
          throw new BadRequestError(`Invalid phone number: ${contact.phoneNumber}`);
        }
      }

      // Get user and check credits
      const user = await User.findByPk(options.userId);
      if (!user) throw new NotFoundError('User not found');

      const messageParts = this.calculateMessageParts(options.message, options.isUnicode);
      const totalCost = this.calculateCost(options.contacts.length, messageParts);

      // Check if user has enough credits
      if (Number(user.credits) < totalCost) {
        throw new InsufficientCreditsError(
          `Insufficient credits. Need ${totalCost}, you have ${user.credits}`
        );
      }

      // Create campaign if not provided
      let campaignId = options.campaignId;
      if (!campaignId) {
        const campaign = await Campaign.create({
          userId: options.userId,
          name: `Bulk SMS ${new Date().toLocaleDateString()}`,
          message: options.message,
          senderId: options.senderId,
          status: options.scheduleFor ? 'scheduled' : 'running',
          totalRecipients: options.contacts.length,
          estimatedCost: totalCost,
          isUnicode: options.isUnicode || false,
          isFlash: options.isFlash || false,
          scheduledFor: options.scheduleFor || null,
          startedAt: options.scheduleFor ? null : new Date(),
        });
        campaignId = campaign.id;
      }

      // Deduct credits immediately
      user.credits = Number(user.credits) - totalCost;
      await user.save();

      // Queue messages for sending
      let queuedMessages = 0;
      let jobId: string | number | undefined;

      if (this.smsQueue && !options.scheduleFor) {
        // Use Bull queue for immediate sending
        const job = await this.smsQueue.add({
          type: 'bulk-sms',
          campaignId,
          userId: options.userId,
          contacts: options.contacts,
          message: options.message,
          senderId: options.senderId,
          isUnicode: options.isUnicode,
          isFlash: options.isFlash,
          messageParts,
          costPerMessage: totalCost / options.contacts.length,
        }, {
          attempts: 3,
          backoff: 5000,
          priority: options.priority === 'high' ? 1 : options.priority === 'low' ? 3 : 2,
        });
        jobId = job.id;
        queuedMessages = options.contacts.length;
      } else {
        // Use Redis list for backward compatibility
        queuedMessages = await this.queueBulkMessages({
          campaignId,
          userId: options.userId,
          contacts: options.contacts,
          message: options.message,
          senderId: options.senderId,
          isUnicode: options.isUnicode,
          isFlash: options.isFlash,
          costPerMessage: totalCost / options.contacts.length,
          messageParts,
        });
      }

      return {
        success: true,
        campaignId,
        totalMessages: options.contacts.length * messageParts,
        estimatedCost: totalCost,
        queuedMessages,
        jobId,
      };
    } catch (error: any) {
      console.error('❌ Error sending bulk SMS:', error);
      throw error;
    }
  }

  // Queue messages using Redis list (legacy method)
  private async queueBulkMessages(options: {
    campaignId: string;
    userId: string;
    contacts: BulkSMSOptions['contacts'];
    message: string;
    senderId: string;
    isUnicode?: boolean;
    isFlash?: boolean;
    costPerMessage: number;
    messageParts: number;
  }): Promise<number> {
    const batchSize = 100;
    let queuedCount = 0;
    const client = await redis.getClient();

    for (let i = 0; i < options.contacts.length; i += batchSize) {
      const batch = options.contacts.slice(i, i + batchSize);
      
      // Create message records in batch
      const messages = batch.map(contact => ({
        campaignId: options.campaignId,
        userId: options.userId,
        phoneNumber: this.formatPhoneNumber(contact.phoneNumber),
        message: this.replaceVariables(options.message, contact.variables),
        senderId: options.senderId,
        status: 'queued' as const,
        cost: options.costPerMessage,
        parts: options.messageParts,
        isUnicode: options.isUnicode || false,
        isFlash: options.isFlash || false,
        metadata: {
          variables: contact.variables,
          batch: Math.floor(i / batchSize) + 1,
        },
      }));

      const createdMessages = await Message.bulkCreate(messages, {
        returning: true,
      });
      
      queuedCount += createdMessages.length;

      // Add to Redis queue
      const multi = client.multi();
      for (const message of createdMessages) {
        const jobData = {
          messageId: message.id,
          campaignId: options.campaignId,
          userId: options.userId,
          phoneNumber: message.phoneNumber,
          message: message.message,
          senderId: message.senderId,
          isUnicode: message.isUnicode,
          isFlash: message.isFlash,
          cost: message.cost,
          parts: message.parts,
          metadata: message.metadata,
        };
        multi.lPush(this.queueName, JSON.stringify(jobData));
      }
      await multi.exec();

      console.log(`📨 Queued batch ${Math.floor(i / batchSize) + 1}: ${createdMessages.length} messages`);
    }

    return queuedCount;
  }

  // Get campaign statistics
  async getCampaignStats(campaignId: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    cost: number;
  }> {
    const messages = await Message.findAll({
      where: { campaignId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost'],
      ],
      group: ['status'],
      raw: true,
    });

    const stats = {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      cost: 0,
    };

    messages.forEach((message: any) => {
      const count = parseInt(message.count);
      const cost = parseFloat(message.totalCost || '0');
      
      stats.total += count;
      stats.cost += cost;

      switch (message.status) {
        case 'sent':
          stats.sent += count;
          break;
        case 'delivered':
          stats.delivered += count;
          break;
        case 'failed':
        case 'undelivered':
          stats.failed += count;
          break;
        case 'pending':
        case 'queued':
        case 'processing':
          stats.pending += count;
          break;
      }
    });

    return stats;
  }

  // Get delivery reports
  async getDeliveryReports(options: DeliveryReportOptions): Promise<{
    messages: Message[];
    total: number;
    stats: any[];
  }> {
    const where: any = { userId: options.userId };
    
    if (options.campaignId) {
      where.campaignId = options.campaignId;
    }
    
    if (options.status) {
      where.status = options.status;
    }
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        where.createdAt[Op.lte] = options.endDate;
      }
    }

    const { count, rows } = await Message.findAndCountAll({
      where,
      limit: options.limit || 50,
      offset: options.offset || 0,
      order: [['createdAt', 'DESC']],
    });

    const stats = await Message.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost'],
      ],
      group: ['status'],
      raw: true,
    });

    return {
      messages: rows,
      total: count,
      stats,
    };
  }

  // Get single delivery report
  async getDeliveryReport(messageId: string, userId: string): Promise<Message | null> {
    return await Message.findOne({
      where: {
        id: messageId,
        userId,
      },
    });
  }

  // Get user SMS statistics
  async getUserStats(userId: string, days: number = 30): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalCost: number;
    averageCostPerMessage: number;
    daily: Array<{
      date: string;
      sent: number;
      delivered: number;
      cost: number;
    }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const messages = await Message.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate },
      },
      order: [['createdAt', 'ASC']],
    });

    // Calculate totals
    const totalSent = messages.length;
    const totalDelivered = messages.filter(m => m.status === 'delivered').length;
    const totalFailed = messages.filter(m => m.status === 'failed').length;
    const totalCost = messages.reduce((sum, m) => sum + Number(m.cost), 0);

    // Group by day
    const dailyMap = new Map<string, { sent: number; delivered: number; cost: number }>();
    
    messages.forEach(msg => {
      const date = msg.createdAt.toISOString().split('T')[0];
      const day = dailyMap.get(date) || { sent: 0, delivered: 0, cost: 0 };
      
      day.sent += 1;
      if (msg.status === 'delivered') day.delivered += 1;
      day.cost += Number(msg.cost);
      
      dailyMap.set(date, day);
    });

    const daily = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      totalCost,
      averageCostPerMessage: totalSent > 0 ? totalCost / totalSent : 0,
      daily,
    };
  }

  // Process queued messages (called by worker)
  async processQueuedMessage(jobData: any): Promise<void> {
    try {
      const { messageId, campaignId, phoneNumber, message, senderId, isUnicode, isFlash } = jobData;

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Prepare SMS
      const smsMessage: SMSMessage = {
        to: formattedPhone,
        from: senderId,
        body: message,
        isUnicode,
        isFlash,
      };

      // Send via gateway
      const result = await gatewayManager.sendSMS(smsMessage);

      // Update message status
      await Message.update(
        {
          status: result.success ? 'sent' : 'failed',
          gatewayMessageId: result.messageId,
          metadata: { result },
          sentAt: new Date(),
        },
        { where: { id: messageId } }
      );

      // Update campaign stats if needed
      if (campaignId) {
        const campaign = await Campaign.findByPk(campaignId);
        if (campaign) {
          if (result.success) {
            campaign.sentCount += 1;
            if (result.status === 'delivered') {
              campaign.deliveredCount += 1;
            }
          } else {
            campaign.failedCount += 1;
          }
          await campaign.save();
        }
      }

      console.log(`✅ Processed message ${messageId}: ${result.success ? 'sent' : 'failed'}`);
    } catch (error: any) {
      console.error(`❌ Failed to process message ${jobData.messageId}:`, error);
      
      // Mark as failed
      await Message.update(
        {
          status: 'failed',
          error: error.message,
        },
        { where: { id: jobData.messageId } }
      );
    }
  }
}

export const smsService = SMSService.getInstance();
export default smsService;