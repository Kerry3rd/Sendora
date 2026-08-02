import { Op } from 'sequelize';
import Campaign from '../../models/Campaign';
import Message from '../../models/Message';
import Contact from '../../models/Contact';
import { addDays, addWeeks, addMonths, addYears, setHours, setMinutes, setSeconds, isBefore } from 'date-fns';
import { smsService } from '../sms/SMSService';

export class RecurringCampaignService {
  /**
   * Calculate next run date based on recurrence pattern
   */
  static calculateNextRun(campaign: any): Date | null {
    if (!campaign.isRecurring) return null;
    
    const baseDate = campaign.nextRecurrenceRun || campaign.scheduledFor || new Date();
    const pattern = campaign.recurrencePattern;
    const interval = campaign.recurrenceInterval || 1;
    const timeStr = campaign.recurrenceTime || '09:00';
    
    // Parse time (HH:MM)
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    let nextDate: Date;
    
    switch (pattern) {
      case 'daily':
        nextDate = addDays(baseDate, interval);
        break;
        
      case 'weekly':
        nextDate = addWeeks(baseDate, interval);
        break;
        
      case 'monthly':
        nextDate = addMonths(baseDate, interval);
        break;
        
      case 'yearly':
        nextDate = addYears(baseDate, interval);
        break;
        
      case 'custom':
        // Custom logic for specific days of week/month
        nextDate = this.calculateCustomNextRun(campaign, baseDate);
        break;
        
      default:
        return null;
    }
    
    // Set to specified time
    nextDate = setHours(nextDate, hours);
    nextDate = setMinutes(nextDate, minutes);
    nextDate = setSeconds(nextDate, 0);
    
    return nextDate;
  }
  
  /**
   * Calculate next run for custom patterns (specific weekdays)
   */
  static calculateCustomNextRun(campaign: any, baseDate: Date): Date {
    const daysOfWeek = campaign.recurrenceDayOfWeek || [];
    const daysOfMonth = campaign.recurrenceDayOfMonth || [];
    const monthsOfYear = campaign.recurrenceMonthOfYear || [];
    
    // Try next 60 days
    for (let i = 1; i <= 60; i++) {
      const testDate = addDays(baseDate, i);
      const dayOfWeek = testDate.getDay(); // 0-6, 0=Sunday
      const dayOfMonth = testDate.getDate();
      const month = testDate.getMonth() + 1; // 1-12
      
      const matchesWeekDay = daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek);
      const matchesDayOfMonth = daysOfMonth.length === 0 || daysOfMonth.includes(dayOfMonth);
      const matchesMonth = monthsOfYear.length === 0 || monthsOfYear.includes(month);
      
      if (matchesWeekDay && matchesDayOfMonth && matchesMonth) {
        return testDate;
      }
    }
    
    return addDays(baseDate, 7); // Default to 1 week if no match
  }
  
  /**
   * Check if campaign should be processed now
   */
  static async checkAndProcessRecurringCampaigns(): Promise<void> {
    console.log('🔄 Checking for recurring campaigns to process...');
    
    const now = new Date();
    
    const campaigns = await Campaign.findAll({
      where: {
        isRecurring: true,
        status: 'running',
        nextRunAt: { [Op.lte]: now },
        // [Op.or]: [
        //   { recurrenceEndDate: null },
        //   { recurrenceEndDate: { [Op.gte]: now } }
        // ],
      },
    });
    
    console.log(`Found ${campaigns.length} recurring campaigns to process`);
    
    for (const campaign of campaigns) {
      await this.processRecurringCampaign(campaign);
    }
  }
  
  /**
   * Process a single recurring campaign
   */
  static async processRecurringCampaign(campaign: any): Promise<void> {
    try {
      console.log(`📨 Processing recurring campaign: ${campaign.name}`);
      
      // Check end conditions
      if (campaign.recurrenceEndAfter && campaign.recurrenceCount >= campaign.recurrenceEndAfter) {
        campaign.status = 'completed';
        await campaign.save();
        console.log(`✅ Campaign ${campaign.name} completed after ${campaign.recurrenceCount} runs`);
        return;
      }
      
      // Get contacts for this campaign
      const contacts = await Contact.findAll({
        where: {
          userId: campaign.userId,
          isSubscribed: true,
          isBlacklisted: false,
        },
        limit: campaign.totalRecipients || 1000,
      });
      
      if (contacts.length === 0) {
        console.log(`⚠️ No contacts found for campaign ${campaign.name}`);
      } else {
        // Send SMS
        await smsService.sendBulkSMS({
          campaignId: campaign.id,
          userId: campaign.userId,
          contacts: contacts.map(c => ({ phoneNumber: c.phoneNumber })),
          message: campaign.message,
          senderId: campaign.senderId,
          isUnicode: campaign.isUnicode,
          isFlash: campaign.isFlash,
        });
      }
      
      // Update campaign stats
      campaign.recurrenceCount += 1;
      campaign.lastRecurrenceRun = new Date();
      campaign.nextRecurrenceRun = this.calculateNextRun(campaign);
      
      await campaign.save();
      
      console.log(`✅ Recurring campaign processed. Next run: ${campaign.nextRecurrenceRun}`);
      
    } catch (error) {
      console.error(`❌ Error processing recurring campaign ${campaign.id}:`, error);
    }
  }
}

export default RecurringCampaignService;
