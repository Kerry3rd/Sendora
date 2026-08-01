import api from './api';
import { PRICING } from '../config/pricing';
import { usdToTZS } from '../utils/currency';

// Match backend RecurrenceType
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type MonthDay = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;
export type MonthOption = 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december';
export type SendOnOption = 'same_day' | 'day_before' | 'week_before';
export type TargetType = 'all' | 'group' | 'segment' | 'manual';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';

// Match backend RecurrenceRule interface
export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number; // e.g., every 2 weeks, every 3 months
  weekDays?: WeekDay[]; // for weekly recurrence
  monthDay?: MonthDay; // for monthly recurrence
  month?: MonthOption; // for yearly recurrence
  endType: 'never' | 'after' | 'on';
  endAfter?: number; // number of occurrences
  endDate?: string; // end on specific date
  timezone: string; // e.g., 'Africa/Dar_es_Salaam'
}

// Match backend SegmentRule interface
export interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

// Campaign statistics interface
export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  cost: number;
  deliveryRate: number;
}

// Match backend CampaignAttributes
export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  message: string;
  status: CampaignStatus;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  estimatedCost: number;
  actualCost: number;
  senderId: string;
  isUnicode: boolean;
  isFlash: boolean;
  variables: string[];
  
  // Recurring Campaign Fields
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  occurrencesCount: number;
  maxOccurrences: number | null;
  parentCampaignId: string | null;
  
  // Group / Segment Fields
  targetType: TargetType;
  groupId: string | null;
  segmentRules: SegmentRule[] | null;
  includedContacts: string[] | null; // Contact IDs
  excludedContacts: string[] | null; // Contact IDs to exclude
  
  // Birthday Campaign Fields
  isBirthdayCampaign: boolean;
  birthdayField: string | null;
  birthdayMessageTemplate: string | null;
  sendOn: SendOnOption;
  sendTime: string | null;
  
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  
  // Optional stats (added by frontend)
  stats?: CampaignStats;
}

// Helper to parse campaign numbers and dates
const parseCampaign = (campaign: any): Campaign => {
  if (!campaign) return campaign;
  
  // Convert USD to TZS if needed
  const estimatedCostUSD = Number(campaign.estimatedCost) || 0;
  const actualCostUSD = Number(campaign.actualCost) || 0;
  
  return {
    ...campaign,
    totalRecipients: Number(campaign.totalRecipients) || 0,
    sentCount: Number(campaign.sentCount) || 0,
    deliveredCount: Number(campaign.deliveredCount) || 0,
    failedCount: Number(campaign.failedCount) || 0,
    estimatedCost: usdToTZS(estimatedCostUSD),
    actualCost: usdToTZS(actualCostUSD),
    occurrencesCount: Number(campaign.occurrencesCount) || 0,
    maxOccurrences: campaign.maxOccurrences ? Number(campaign.maxOccurrences) : null,
    isUnicode: campaign.isUnicode || false,
    isFlash: campaign.isFlash || false,
    isRecurring: campaign.isRecurring || false,
    isBirthdayCampaign: campaign.isBirthdayCampaign || false,
    variables: campaign.variables || [],
    metadata: campaign.metadata || {},
    targetType: campaign.targetType || 'manual',
    groupId: campaign.groupId || null,
    segmentRules: campaign.segmentRules || null,
    includedContacts: campaign.includedContacts || null,
    excludedContacts: campaign.excludedContacts || null,
    recurrenceRule: campaign.recurrenceRule || null,
    birthdayField: campaign.birthdayField || null,
    birthdayMessageTemplate: campaign.birthdayMessageTemplate || null,
    sendOn: campaign.sendOn || 'same_day',
    sendTime: campaign.sendTime || null,
    parentCampaignId: campaign.parentCampaignId || null,
  };
};

class CampaignService {
  // Get all campaigns
  async getCampaigns(page = 1, limit = 20, status?: string, type?: 'standard' | 'recurring' | 'birthday') {
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (type) params.type = type;

      console.log(`📥 Fetching campaigns with params:`, params);
      const response = await api.get('/campaigns', { params });
      
      const data = response.data?.data || response.data;
      const campaigns = (data?.campaigns || []).map(parseCampaign);
      
      return {
        success: true,
        data: {
          campaigns,
          pagination: data?.pagination || { total: 0, page, limit, pages: 0 }
        }
      };
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      return {
        success: false,
        data: { campaigns: [], pagination: { total: 0, page, limit, pages: 0 } }
      };
    }
  }

  // Get recurring campaigns
  async getRecurringCampaigns(page = 1, limit = 20) {
    return this.getCampaigns(page, limit, undefined, 'recurring');
  }

  // Get birthday campaigns
  async getBirthdayCampaigns(page = 1, limit = 20) {
    return this.getCampaigns(page, limit, undefined, 'birthday');
  }

  // Get single campaign
  async getCampaign(id: string) {
    try {
      const response = await api.get(`/campaigns/${id}`);
      const campaign = response.data?.data || response.data;
      return {
        success: true,
        data: parseCampaign(campaign)
      };
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
      throw error;
    }
  }

  // Create campaign
  async createCampaign(data: Partial<Campaign>) {
    try {
      console.log('📦 Creating campaign with payload:', data);
      const response = await api.post('/campaigns', data);
      console.log('📦 Create campaign response:', response.data);
      
      return {
        success: true,
        data: parseCampaign(response.data?.data || response.data)
      };
    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw error;
    }
  }

  // Update campaign
  async updateCampaign(id: string, data: Partial<Campaign>) {
    try {
      const response = await api.put(`/campaigns/${id}`, data);
      return {
        success: true,
        data: parseCampaign(response.data?.data || response.data)
      };
    } catch (error) {
      console.error('Failed to update campaign:', error);
      throw error;
    }
  }

  // Delete campaign
  async deleteCampaign(id: string) {
    try {
      const response = await api.delete(`/campaigns/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  // Start campaign (send to manual contacts)
  async startCampaign(id: string, contacts?: Array<{ phoneNumber: string; variables?: Record<string, string> }>) {
    try {
      const response = await api.post(`/campaigns/${id}/start`, { contacts });
      return response.data;
    } catch (error) {
      console.error('Failed to start campaign:', error);
      throw error;
    }
  }

  // Pause campaign
  async pauseCampaign(id: string) {
    try {
      const response = await api.post(`/campaigns/${id}/pause`);
      return response.data;
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      throw error;
    }
  }

  // Resume campaign
  async resumeCampaign(id: string) {
    try {
      const response = await api.post(`/campaigns/${id}/resume`);
      return response.data;
    } catch (error) {
      console.error('Failed to resume campaign:', error);
      throw error;
    }
  }

  // Cancel campaign
  async cancelCampaign(id: string) {
    try {
      const response = await api.post(`/campaigns/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Failed to cancel campaign:', error);
      throw error;
    }
  }

  // Get campaign stats
  async getCampaignStats(id: string) {
    try {
      const response = await api.get(`/campaigns/${id}/stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get campaign stats:', error);
      throw error;
    }
  }

  // Get campaign logs (messages)
  async getCampaignLogs(id: string, page = 1, limit = 50) {
    try {
      const response = await api.get(`/campaigns/${id}/logs`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get campaign logs:', error);
      throw error;
    }
  }

  // Get next scheduled runs for recurring campaigns
  async getRecurringSchedule(id: string) {
    try {
      const response = await api.get(`/campaigns/${id}/schedule`);
      return response.data;
    } catch (error) {
      console.error('Failed to get recurring schedule:', error);
      throw error;
    }
  }

  // Get campaign instances (for recurring campaigns)
  async getCampaignInstances(parentId: string) {
    try {
      const response = await api.get(`/campaigns/${parentId}/instances`);
      return response.data;
    } catch (error) {
      console.error('Failed to get campaign instances:', error);
      throw error;
    }
  }
}

const campaignService = new CampaignService();
export default campaignService;