import { Cache } from '../../utils/cache';
import Campaign from '../../models/Campaign';
import Message from '../../models/Message';
import User from '../../models/User';
import { Op } from 'sequelize';
import sequelize from '../../config/sequelize';
import { smsService } from '../sms/SMSService';
import { wsService } from '../websocket.service';
import { 
  NotFoundError, 
  BadRequestError, 
  InsufficientCreditsError,
  ForbiddenError 
} from '../../utils/errors';
import { PRICING } from '../../config/pricing';

// Define a type for Campaign with stats
export interface CampaignWithStats extends Campaign {
  stats?: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    cost: number;
    deliveryRate: number;
  };
}

export interface CampaignFilters {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  type?: 'standard' | 'recurring' | 'birthday';
}

export interface PaginatedResult<T> {
  campaigns: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class CampaignService {
  // Find campaign by ID with caching - FIXED
  static async findById(id: string, userId: string): Promise<Campaign | null> {
    const cacheKey = `campaign:${id}:${userId}`;
    
    return Cache.remember(cacheKey, 300, async () => {
      const campaign = await Campaign.findOne({ 
        where: { id, userId } 
      });
      
      // FIXED: Convert Sequelize instance to plain object before caching
      return campaign ? campaign.toJSON() as Campaign : null;
    });
  }

  // Find all campaigns with filters
  static async findAll(userId: string, filters: CampaignFilters): Promise<PaginatedResult<CampaignWithStats>> {
    const { page, limit, status, search, type } = filters;
    const offset = (page - 1) * limit;

    const where: any = { userId };
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by campaign type
    if (type === 'recurring') {
      where.isRecurring = true;
    } else if (type === 'birthday') {
      where.isBirthdayCampaign = true;
    } else if (type === 'standard') {
      where.isRecurring = false;
      where.isBirthdayCampaign = false;
    }

    const cacheKey = `campaigns:${userId}:${page}:${limit}:${status || 'all'}:${search || ''}:${type || 'all'}`;
    
    return Cache.remember(cacheKey, 300, async () => {
      const { count, rows } = await Campaign.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      // Convert to plain objects BEFORE adding stats
      const plainCampaigns = rows.map(campaign => campaign.toJSON() as Campaign);

      // Get statistics for each campaign
      const campaignsWithStats = await Promise.all(
        plainCampaigns.map(async (campaign) => {
          const stats = await CampaignService.getCampaignStats(campaign.id, userId);
          return {
            ...campaign,
            stats
          } as CampaignWithStats;
        })
      );

      return {
        campaigns: campaignsWithStats,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      };
    });
  }

  // Find recurring campaigns
  static async findRecurring(userId: string, filters: { page: number; limit: number }): Promise<PaginatedResult<CampaignWithStats>> {
    return this.findAll(userId, {
      ...filters,
      type: 'recurring'
    });
  }

  // Find birthday campaigns
  static async findBirthday(userId: string, filters: { page: number; limit: number }): Promise<PaginatedResult<CampaignWithStats>> {
    return this.findAll(userId, {
      ...filters,
      type: 'birthday'
    });
  }

  // Create campaign
  static async create(userId: string, data: any): Promise<Campaign> {
    // Calculate estimated cost
    const messageParts = data.isUnicode 
      ? Math.ceil((data.message?.length || 0) * 2 / 70)
      : Math.ceil((data.message?.length || 0) / 160);
    
    const recipientCount = data.targetType === 'manual' 
      ? data.contacts?.length || 0
      : 0;

    const estimatedCost = this.calculateEstimatedCost(recipientCount, messageParts);

    // Create campaign
    const campaign = await Campaign.create({
      ...data,
      userId,
      estimatedCost,
      variables: this.extractVariables(data.message || ''),
    });

    // Clear cache
    await Cache.delPattern(`campaigns:${userId}:*`);
    
    // Notify user of new campaign
    wsService.emitToUser(userId, 'campaign:created', {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status
    });
    
    return campaign;
  }

  // Update campaign
  static async update(id: string, userId: string, data: any): Promise<Campaign | null> {
    const campaign = await this.findById(id, userId);
    if (!campaign) return null;

    // Check if campaign can be updated
    if (['running', 'completed'].includes(campaign.status)) {
      throw new BadRequestError(`Cannot update campaign with status: ${campaign.status}`);
    }

    // Update variables if message changed
    if (data.message && data.message !== campaign.message) {
      data.variables = this.extractVariables(data.message);
    }

    await campaign.update(data);
    
    // Clear cache
    await Cache.del(`campaign:${id}:${userId}`);
    await Cache.delPattern(`campaigns:${userId}:*`);
    
    // Notify user of campaign update
    wsService.emitToUser(userId, 'campaign:updated', {
      campaignId: campaign.id,
      ...campaign.toJSON()
    });
    
    return campaign;
  }

  // Delete campaign
  static async delete(id: string, userId: string): Promise<boolean> {
    const campaign = await this.findById(id, userId);
    if (!campaign) return false;

    // Check if campaign can be deleted
    if (campaign.status === 'running') {
      throw new BadRequestError('Cannot delete a running campaign');
    }

    await campaign.destroy();
    
    // Clear cache
    await Cache.del(`campaign:${id}:${userId}`);
    await Cache.delPattern(`campaigns:${userId}:*`);
    
    // Notify user of campaign deletion
    wsService.emitToUser(userId, 'campaign:deleted', {
      campaignId: id
    });
    
    return true;
  }

  // Start campaign
  static async start(id: string, userId: string, contacts?: any[]): Promise<any> {
    const campaign = await this.findById(id, userId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check if campaign can be started
    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      throw new BadRequestError(`Campaign cannot be started from status: ${campaign.status}`);
    }

    // Check user credits
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const messageParts = campaign.isUnicode 
      ? Math.ceil((campaign.message?.length || 0) * 2 / 70)
      : Math.ceil((campaign.message?.length || 0) / 160);

    // Determine recipient count based on target type
    let recipientCount = 0;
    let recipientContacts: any[] = [];

    if (campaign.targetType === 'manual' && contacts) {
      recipientCount = contacts.length;
      recipientContacts = contacts;
    } else if (campaign.targetType === 'group' && campaign.groupId) {
      // Get contacts from group - placeholder
      recipientCount = 100;
    } else if (campaign.targetType === 'all') {
      // Get all contacts for user - placeholder
      recipientCount = 500;
    }

    const estimatedCost = this.calculateEstimatedCost(recipientCount, messageParts);

    // Check if user has enough credits
    if (Number(user.credits) < estimatedCost) {
      throw new InsufficientCreditsError(
        `Insufficient credits. Need ${estimatedCost}, you have ${user.credits}`
      );
    }

    // Update campaign status
    await campaign.update({
      status: 'running',
      startedAt: new Date(),
      totalRecipients: recipientCount,
      estimatedCost,
    });

    // Deduct credits
    user.credits = Number(user.credits) - estimatedCost;
    await user.save();

    // Send real-time balance update
    wsService.emitBalanceUpdate(userId, user.credits, -estimatedCost);

    // Notify campaign status change
    wsService.emitCampaignStatus(campaign.id, 'running', campaign);
    wsService.emitToUser(userId, 'campaign:started', {
      campaignId: campaign.id,
      estimatedCost,
      recipientCount
    });

    // If manual campaign with contacts, send SMS
    let sendResult = null;
    if (campaign.targetType === 'manual' && recipientContacts.length > 0) {
      sendResult = await smsService.sendBulkSMS({
        campaignId: campaign.id,
        userId,
        contacts: recipientContacts.map(c => ({
          phoneNumber: c.phoneNumber,
          variables: c.variables
        })),
        message: campaign.message,
        senderId: campaign.senderId,
        isUnicode: campaign.isUnicode,
        isFlash: campaign.isFlash,
      });
    }

    // Clear cache
    await Cache.del(`campaign:${id}:${userId}`);
    await Cache.delPattern(`campaigns:${userId}:*`);

    return {
      campaign,
      sendResult,
      estimatedCost,
      recipientCount
    };
  }

  // Pause campaign
  static async pause(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.findById(id, userId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== 'running') {
      throw new BadRequestError(`Campaign cannot be paused from status: ${campaign.status}`);
    }

    await campaign.update({ status: 'paused' });

    // Clear cache
    await Cache.del(`campaign:${id}:${userId}`);
    await Cache.delPattern(`campaigns:${userId}:*`);

    // Send real-time update
    wsService.emitCampaignStatus(campaign.id, 'paused', campaign);
    wsService.emitToUser(userId, 'campaign:paused', {
      campaignId: campaign.id
    });

    return campaign;
  }

  // Resume campaign
  static async resume(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.findById(id, userId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.status !== 'paused') {
      throw new BadRequestError(`Campaign cannot be resumed from status: ${campaign.status}`);
    }

    await campaign.update({ status: 'running' });

    // Clear cache
    await Cache.del(`campaign:${id}:${userId}`);
    await Cache.delPattern(`campaigns:${userId}:*`);

    // Send real-time update
    wsService.emitCampaignStatus(campaign.id, 'running', campaign);
    wsService.emitToUser(userId, 'campaign:resumed', {
      campaignId: campaign.id
    });

    return campaign;
  }

  // Cancel campaign
  static async cancel(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.findById(id, userId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      throw new BadRequestError(`Campaign cannot be cancelled from status: ${campaign.status}`);
    }

    await campaign.update({ status: 'cancelled' });

    // Clear cache
    await Cache.del(`campaign:${id}:${userId}`);
    await Cache.delPattern(`campaigns:${userId}:*`);

    // Send real-time update
    wsService.emitCampaignStatus(campaign.id, 'cancelled', campaign);
    wsService.emitToUser(userId, 'campaign:cancelled', {
      campaignId: campaign.id
    });

    return campaign;
  }

  // Get campaign statistics
  static async getCampaignStats(id: string, userId: string): Promise<any> {
    const campaign = await this.findById(id, userId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Get message statistics
    const messageStats = await Message.findAll({
      where: { campaignId: id },
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
      deliveryRate: 0,
    };

    messageStats.forEach((item: any) => {
      const count = parseInt(item.count);
      const cost = parseFloat(item.totalCost || '0');
      
      stats.total += count;
      stats.cost += cost;

      switch (item.status) {
        case 'sent':
          stats.sent += count;
          break;
        case 'delivered':
          stats.delivered += count;
          break;
        case 'failed':
          stats.failed += count;
          break;
        case 'pending':
        case 'queued':
          stats.pending += count;
          break;
      }
    });

    // Calculate delivery rate
    if (stats.total > 0) {
      stats.deliveryRate = (stats.delivered / stats.total) * 100;
    }

    return stats;
  }

  // Update campaign progress (called when messages are processed)
  static async updateProgress(campaignId: string): Promise<void> {
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) return;

    // Get updated stats
    const stats = await this.getCampaignStats(campaignId, campaign.userId);
    
    // Calculate progress percentage
    const percentage = campaign.totalRecipients > 0 
      ? (stats.sent / campaign.totalRecipients) * 100 
      : 0;

    // Emit real-time progress update
    wsService.emitCampaignProgress(campaignId, {
      sent: stats.sent,
      delivered: stats.delivered,
      failed: stats.failed,
      total: campaign.totalRecipients,
      percentage,
      status: campaign.status
    });

    // Check if campaign is complete
    if (stats.sent >= campaign.totalRecipients && campaign.status === 'running') {
      await campaign.update({ 
        status: 'completed',
        completedAt: new Date()
      });
      
      wsService.emitCampaignStatus(campaignId, 'completed', campaign);
      wsService.emitToUser(campaign.userId, 'campaign:completed', {
        campaignId,
        name: campaign.name,
        stats
      });
    }
  }

  // Get campaign logs (messages)
  static async getLogs(id: string, userId: string, options: { page: number; limit: number }): Promise<any> {
    const campaign = await this.findById(id, userId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    const offset = (options.page - 1) * options.limit;

    const { count, rows } = await Message.findAndCountAll({
      where: { campaignId: id },
      limit: options.limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      messages: rows,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: count,
        pages: Math.ceil(count / options.limit)
      }
    };
  }

  // Get campaign instances (for recurring campaigns)
  static async getInstances(parentId: string, userId: string): Promise<Campaign[]> {
    const parent = await this.findById(parentId, userId);
    if (!parent) {
      throw new NotFoundError('Parent campaign not found');
    }

    if (!parent.isRecurring) {
      throw new BadRequestError('Campaign is not recurring');
    }

    const instances = await Campaign.findAll({
      where: { parentCampaignId: parentId },
      order: [['createdAt', 'DESC']],
    });

    return instances;
  }

  // Calculate next run date for recurring campaigns
  static calculateNextRunDate(campaign: Campaign): Date | null {
    if (!campaign.isRecurring || !campaign.recurrenceRule) return null;

    const rule = campaign.recurrenceRule;
    const now = new Date();
    let nextDate = new Date(campaign.nextRunAt || campaign.scheduledFor || now);

    switch (rule.type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + rule.interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (rule.interval * 7));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + rule.interval);
        if (rule.monthDay) {
          nextDate.setDate(rule.monthDay);
        }
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + rule.interval);
        break;
      default:
        return null;
    }

    // Check end conditions
    if (rule.endType === 'after' && rule.endAfter && campaign.occurrencesCount >= rule.endAfter) {
      return null;
    }

    if (rule.endType === 'on' && rule.endDate && nextDate > new Date(rule.endDate)) {
      return null;
    }

    return nextDate;
  }

  // Helper: Calculate estimated cost based on pricing tiers
  private static calculateEstimatedCost(recipientCount: number, messageParts: number): number {
    const totalMessages = recipientCount * messageParts;
    
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

  // Helper: Extract variables from message
  private static extractVariables(message: string): string[] {
    const matches = message.match(/\{\{([^}]+)\}\}/g) || [];
    return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
  }
}