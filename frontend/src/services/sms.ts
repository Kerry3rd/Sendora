import api from './api';
import { PRICING } from '../config/pricing';
import { usdToTZS } from '../utils/currency';

// Helper to calculate message parts
const calculateMessageParts = (message: string, isUnicode: boolean = false): number => {
  if (!message) return 1;
  return isUnicode
    ? Math.ceil(message.length * 2 / 70)
    : Math.ceil(message.length / 160);
};

// Helper to calculate estimated cost in TZS based on quantity and message
const calculateEstimatedCost = (quantity: number, message: string, isUnicode: boolean = false): number => {
  const parts = calculateMessageParts(message, isUnicode);
  const totalMessages = quantity * parts;
  
  // Apply volume pricing tiers
  if (totalMessages <= PRICING.tanzania.tier1.max) {
    return totalMessages * PRICING.tanzania.tier1.price;
  } else if (totalMessages <= PRICING.tanzania.tier2.max) {
    return totalMessages * PRICING.tanzania.tier2.price;
  } else if (totalMessages <= PRICING.tanzania.tier3.max) {
    return totalMessages * PRICING.tanzania.tier3.price;
  } else {
    return totalMessages * PRICING.tanzania.tier4.price;
  }
};

class SMSService {
  // Send SINGLE SMS
  async sendSingleSMS(data: {
    phoneNumber: string;
    message: string;
    senderId: string;
    isUnicode?: boolean;
    isFlash?: boolean;
  }) {
    try {
      // Validate phone number (basic validation)
      if (!data.phoneNumber || data.phoneNumber.trim() === '') {
        throw new Error('Phone number is required');
      }

      // Calculate cost for logging
      const parts = calculateMessageParts(data.message, data.isUnicode);
      const estimatedCost = parts * PRICING.tanzania.payg;
      
      console.log('📤 Sending single SMS:', {
        to: data.phoneNumber,
        parts,
        estimatedCost: `${estimatedCost} TSh`
      });

      const response = await api.post('/sms/send', data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      throw error;
    }
  }

  // Send BULK SMS
  async sendBulkSMS(data: {
    contacts: Array<{ phoneNumber: string; variables?: Record<string, string> }>;
    message: string;
    senderId: string;
    isUnicode?: boolean;
    isFlash?: boolean;
    scheduleFor?: string;
    name?: string;
  }) {
    try {
      // Validate contacts
      if (!data.contacts || data.contacts.length === 0) {
        throw new Error('At least one contact is required');
      }

      // Calculate estimated cost
      const parts = calculateMessageParts(data.message, data.isUnicode);
      const totalMessages = data.contacts.length * parts;
      
      // Determine pricing tier
      let pricePerMessage = PRICING.tanzania.payg;
      let tier = 'PAYG';
      
      if (totalMessages <= PRICING.tanzania.tier1.max) {
        pricePerMessage = PRICING.tanzania.tier1.price;
        tier = 'Tier 1';
      } else if (totalMessages <= PRICING.tanzania.tier2.max) {
        pricePerMessage = PRICING.tanzania.tier2.price;
        tier = 'Tier 2';
      } else if (totalMessages <= PRICING.tanzania.tier3.max) {
        pricePerMessage = PRICING.tanzania.tier3.price;
        tier = 'Tier 3';
      } else {
        pricePerMessage = PRICING.tanzania.tier4.price;
        tier = 'Tier 4';
      }
      
      const estimatedCost = totalMessages * pricePerMessage;

      console.log('📤 Sending bulk SMS:', {
        contactsCount: data.contacts.length,
        messagePreview: data.message.substring(0, 50),
        senderId: data.senderId,
        scheduled: data.scheduleFor ? 'yes' : 'no',
        messageParts: parts,
        totalMessages,
        pricePerMessage: `${pricePerMessage} TSh`,
        estimatedCost: `${estimatedCost} TSh`,
        pricingTier: tier
      });

      // FIXED: Create metadata object without spreading non-existent data.metadata
      const payload = {
        ...data,
        metadata: {
          estimatedCostTZS: estimatedCost,
          pricePerMessageTZS: pricePerMessage,
          messageParts: parts,
          pricingTier: tier.toLowerCase().replace(' ', ''),
          timestamp: new Date().toISOString()
        }
      };

      const response = await api.post('/sms/bulk', payload);
      
      console.log('📦 Bulk SMS response:', response.data);
      
      return {
        success: true,
        data: response.data?.data || response.data,
        metadata: {
          estimatedCost,
          pricePerMessage,
          totalMessages,
          messageParts: parts,
          tier
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to send bulk SMS:', error.response?.data || error.message);
      throw error;
    }
  }

  // Schedule bulk SMS
  async scheduleBulkSMS(data: {
    contacts: Array<{ phoneNumber: string; variables?: Record<string, string> }>;
    message: string;
    senderId: string;
    isUnicode?: boolean;
    isFlash?: boolean;
    scheduledFor: string;
    name?: string;
  }) {
    try {
      return this.sendBulkSMS({
        ...data,
        scheduleFor: data.scheduledFor
      });
    } catch (error) {
      console.error('❌ Failed to schedule bulk SMS:', error);
      throw error;
    }
  }

  // Get delivery reports
  async getDeliveryReports(params: {
    campaignId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const response = await api.get('/sms/reports', { params });
      
      // Parse any cost values in the reports
      const data = response.data?.data || response.data;
      if (data.messages) {
        data.messages = data.messages.map((msg: any) => ({
          ...msg,
          costTZS: msg.cost ? usdToTZS(msg.cost) : 0
        }));
      }
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('❌ Failed to fetch delivery reports:', error);
      throw error;
    }
  }

  // Get single delivery report
  async getDeliveryReport(id: string) {
    try {
      const response = await api.get(`/sms/reports/${id}`);
      return {
        success: true,
        data: response.data?.data || response.data
      };
    } catch (error) {
      console.error('❌ Failed to fetch delivery report:', error);
      throw error;
    }
  }

  // Get user SMS statistics
  async getUserStats(days: number = 30) {
    try {
      const response = await api.get(`/sms/stats?days=${days}`);
      return {
        success: true,
        data: response.data?.data || response.data
      };
    } catch (error) {
      console.error('❌ Failed to fetch user stats:', error);
      throw error;
    }
  }

  // Get balance
  async getBalance() {
    try {
      const response = await api.get('/sms/balance');
      
      const data = response.data?.data || response.data;
      
      // Calculate message estimate based on current credits
      const credits = Number(data?.user?.credits || 0);
      const messageEstimate = Math.floor(credits / PRICING.tanzania.payg);
      const discountedEstimate = Math.floor(credits / PRICING.tanzania.tier4.price);
      
      return {
        success: true,
        data: {
          user: {
            credits,
            creditsValueTZS: credits, // Already in TZS
            email: data?.user?.email || '',
            name: data?.user?.name || '',
            messageEstimate,
            messageEstimateWithDiscount: discountedEstimate
          },
          gateways: data?.gateways || []
        }
      };
    } catch (error) {
      console.error('❌ Failed to fetch balance:', error);
      return {
        success: false,
        data: { 
          user: { 
            credits: 0, 
            creditsValueTZS: 0,
            email: '', 
            name: '',
            messageEstimate: 0,
            messageEstimateWithDiscount: 0
          }, 
          gateways: [] 
        }
      };
    }
  }

  // Helper method to get pricing info
  getPricingInfo(quantity: number, message?: string, isUnicode: boolean = false) {
    const parts = message ? calculateMessageParts(message, isUnicode) : 1;
    const totalMessages = quantity * parts;
    
    let pricePerMessage = PRICING.tanzania.payg;
    let tier = 'PAYG';
    
    if (totalMessages <= PRICING.tanzania.tier1.max) {
      pricePerMessage = PRICING.tanzania.tier1.price;
      tier = 'Tier 1';
    } else if (totalMessages <= PRICING.tanzania.tier2.max) {
      pricePerMessage = PRICING.tanzania.tier2.price;
      tier = 'Tier 2';
    } else if (totalMessages <= PRICING.tanzania.tier3.max) {
      pricePerMessage = PRICING.tanzania.tier3.price;
      tier = 'Tier 3';
    } else {
      pricePerMessage = PRICING.tanzania.tier4.price;
      tier = 'Tier 4';
    }
    
    const totalCost = totalMessages * pricePerMessage;
    const paygCost = totalMessages * PRICING.tanzania.payg;
    
    return {
      quantity,
      messageParts: parts,
      totalMessages,
      pricePerMessage,
      totalCost,
      tier,
      paygRate: PRICING.tanzania.payg,
      paygCost,
      savings: paygCost - totalCost,
      savingsPercentage: paygCost > 0 ? Math.round(((paygCost - totalCost) / paygCost) * 100) : 0
    };
  }

  // Validate phone number format (Tanzanian)
  validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^(?:\+255|0)[67][0-9]{8}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Format phone number to international format
  formatPhoneNumber(phoneNumber: string): string {
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
}

const smsService = new SMSService();
export default smsService;