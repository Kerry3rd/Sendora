import sequelize from '../../config/sequelize';
import Message from '../../models/Message';
import Campaign from '../../models/Campaign';
import User from '../../models/User';
import RedisClient from '../../config/redis';
import { Op } from 'sequelize';

export interface AnalyticsData {
  overview: {
    totalMessages: number;
    totalCampaigns: number;
    totalContacts: number;
    totalCost: number;
    deliveryRate: number;
    averageCostPerMessage: number;
  };
  timeline: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }>;
  campaignPerformance: Array<{
    id: string;
    name: string;
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
    deliveryRate: number;
    costPerMessage: number;
  }>;
  gatewayPerformance: Array<{
    gateway: string;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
    averageCost: number;
  }>;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private redis: any;

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async getOverview(userId?: string): Promise<AnalyticsData['overview']> {
    const cacheKey = userId ? `analytics:overview:${userId}` : 'analytics:overview:global';
    
    // Try to get from cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const whereClause = userId ? { userId } : {};

    const [
      totalMessages,
      totalCampaigns,
      totalCostResult,
      deliveredMessages,
    ] = await Promise.all([
      Message.count({ where: whereClause }),
      Campaign.count({ where: whereClause }),
      Message.sum('cost', { where: whereClause }),
      Message.count({ where: { ...whereClause, status: 'delivered' } }),
    ]);

    const totalCost = totalCostResult || 0;
    const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;
    const averageCostPerMessage = totalMessages > 0 ? totalCost / totalMessages : 0;

    const result = {
      totalMessages,
      totalCampaigns,
      totalContacts: 0, // You'll need to fetch from contacts table
      totalCost,
      deliveryRate: parseFloat(deliveryRate.toFixed(2)),
      averageCostPerMessage: parseFloat(averageCostPerMessage.toFixed(4)),
    };

    // Cache for 5 minutes
    await this.setCache(cacheKey, result, 300);
    return result;
  }

  async getTimelineData(
    days: number = 30,
    userId?: string
  ): Promise<AnalyticsData['timeline']> {
    const cacheKey = userId 
      ? `analytics:timeline:${userId}:${days}` 
      : `analytics:timeline:global:${days}`;
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const timelineData: any[] = await Message.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'delivered' THEN 1 ELSE 0 END")), 'delivered'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'failed' THEN 1 ELSE 0 END")), 'failed'],
        [sequelize.fn('SUM', sequelize.col('cost')), 'cost'],
      ],
      where: {
        ...(userId && { userId }),
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true,
    });

    // Fill missing dates
    const result = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = timelineData.find(d => d.date === dateStr);
      
      result.push({
        date: dateStr,
        sent: parseInt(dayData?.total || 0),
        delivered: parseInt(dayData?.delivered || 0),
        failed: parseInt(dayData?.failed || 0),
        cost: parseFloat(dayData?.cost || 0),
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    await this.setCache(cacheKey, result, 300);
    return result;
  }

  async getCampaignPerformance(
    limit: number = 10,
    userId?: string
  ): Promise<AnalyticsData['campaignPerformance']> {
    const cacheKey = userId 
      ? `analytics:campaigns:${userId}:${limit}` 
      : `analytics:campaigns:global:${limit}`;
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const campaigns = await Campaign.findAll({
      where: userId ? { userId } : {},
      limit,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Message,
          as: 'messages',
          attributes: [],
        },
      ],
      attributes: [
        'id',
        'name',
        [sequelize.fn('COUNT', sequelize.col('messages.id')), 'totalMessages'],
        [
          sequelize.fn('SUM', 
            sequelize.literal("CASE WHEN messages.status = 'delivered' THEN 1 ELSE 0 END")
          ), 
          'delivered'
        ],
        [
          sequelize.fn('SUM',
            sequelize.literal("CASE WHEN messages.status = 'failed' THEN 1 ELSE 0 END")
          ),
          'failed'
        ],
        [sequelize.fn('SUM', sequelize.col('messages.cost')), 'totalCost'],
      ],
      group: ['Campaign.id'],
      raw: true,
    });

    const result = campaigns.map((campaign: any) => {
      const total = parseInt(campaign.totalMessages) || 0;
      const delivered = parseInt(campaign.delivered) || 0;
      const failed = parseInt(campaign.failed) || 0;
      const cost = parseFloat(campaign.totalCost) || 0;
      
      return {
        id: campaign.id,
        name: campaign.name,
        sent: total,
        delivered,
        failed,
        cost,
        deliveryRate: total > 0 ? parseFloat(((delivered / total) * 100).toFixed(2)) : 0,
        costPerMessage: total > 0 ? parseFloat((cost / total).toFixed(4)) : 0,
      };
    });

    await this.setCache(cacheKey, result, 300);
    return result;
  }

  async getGatewayPerformance(userId?: string): Promise<AnalyticsData['gatewayPerformance']> {
    const cacheKey = userId 
      ? `analytics:gateways:${userId}` 
      : `analytics:gateways:global`;
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const gatewayData = await Message.findAll({
      attributes: [
        'gateway',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [
          sequelize.fn('SUM',
            sequelize.literal("CASE WHEN status IN ('sent', 'delivered') THEN 1 ELSE 0 END")
          ),
          'success'
        ],
        [
          sequelize.fn('SUM',
            sequelize.literal("CASE WHEN status = 'failed' THEN 1 ELSE 0 END")
          ),
          'failed'
        ],
        [sequelize.fn('AVG', sequelize.col('cost')), 'averageCost'],
      ],
      where: {
        ...(userId && { userId }),
        gateway: {
          [Op.not]: null,
        },
      },
      group: ['gateway'],
      raw: true,
    });

    const result = gatewayData.map((data: any) => {
      const total = parseInt(data.total) || 0;
      const success = parseInt(data.success) || 0;
      const failed = parseInt(data.failed) || 0;
      
      return {
        gateway: data.gateway || 'unknown',
        sent: total,
        delivered: success,
        failed,
        successRate: total > 0 ? parseFloat(((success / total) * 100).toFixed(2)) : 0,
        averageCost: parseFloat(data.averageCost || 0),
      };
    });

    await this.setCache(cacheKey, result, 300);
    return result;
  }

  async getFullAnalytics(
    userId?: string,
    days: number = 30
  ): Promise<AnalyticsData> {
    const cacheKey = userId 
      ? `analytics:full:${userId}:${days}` 
      : `analytics:full:global:${days}`;
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const [overview, timeline, campaignPerformance, gatewayPerformance] = await Promise.all([
      this.getOverview(userId),
      this.getTimelineData(days, userId),
      this.getCampaignPerformance(10, userId),
      this.getGatewayPerformance(userId),
    ]);

    const result = {
      overview,
      timeline,
      campaignPerformance,
      gatewayPerformance,
    };

    await this.setCache(cacheKey, result, 300);
    return result;
  }

  async clearAnalyticsCache(userId?: string): Promise<void> {
    const redis = await this.getRedisClient();
    const pattern = userId ? `analytics:*:${userId}:*` : 'analytics:*';
    
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }

  private async getFromCache(key: string): Promise<any> {
    try {
      const redis = await this.getRedisClient();
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis cache error:', error);
      return null;
    }
  }

  private async setCache(key: string, data: any, ttl: number): Promise<void> {
    try {
      const redis = await this.getRedisClient();
      await redis.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (error) {
      console.error('Redis cache error:', error);
    }
  }

  private async getRedisClient(): Promise<any> {
    if (!this.redis) {
      this.redis = await RedisClient.getClient();
    }
    return this.redis;
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default analyticsService;
