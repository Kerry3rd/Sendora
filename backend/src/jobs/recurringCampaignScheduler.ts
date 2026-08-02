import { Op } from 'sequelize';
import Campaign from '../models/Campaign';
import Contact from '../models/Contact';
import Group from '../models/Group';
import { smsService } from '../services/sms/SMSService';
import { NotificationService } from '../services/notification/notification.service';
import sequelize from '../config/sequelize';

export class RecurringCampaignScheduler {
  /**
   * Check and run all due recurring campaigns
   */
  static async checkAndRunRecurringCampaigns() {
    console.log('🔄 Checking for recurring campaigns due...');
    
    const now = new Date();
    
    // Find all active recurring campaigns that are due
    const campaigns = await Campaign.findAll({
      where: {
        isRecurring: true,
        status: 'running',
        nextRunAt: { [Op.lte]: now },
      },
    });

    console.log(`📊 Found ${campaigns.length} recurring campaigns due`);

    for (const campaign of campaigns) {
      try {
        await this.runRecurringCampaign(campaign);
      } catch (error) {
        console.error(`❌ Failed to run recurring campaign ${campaign.id}:`, error);
      }
    }
  }

  /**
   * Run a single recurring campaign instance
   */
  static async runRecurringCampaign(campaign: Campaign) {
    console.log(`🚀 Running recurring campaign: ${campaign.name}`);

    // Create a new campaign instance (child campaign)
    const instance = await Campaign.create({
      userId: campaign.userId,
      name: `${campaign.name} (${new Date().toLocaleDateString()})`,
      description: campaign.description,
      message: campaign.message,
      senderId: campaign.senderId,
      isUnicode: campaign.isUnicode,
      isFlash: campaign.isFlash,
      status: 'running',
      parentCampaignId: campaign.id,
      targetType: campaign.targetType,
      groupId: campaign.groupId,
      segmentRules: campaign.segmentRules,
      includedContacts: campaign.includedContacts,
      excludedContacts: campaign.excludedContacts,
      isBirthdayCampaign: campaign.isBirthdayCampaign,
      birthdayField: campaign.birthdayField,
    });

    // Get recipients based on targeting rules
    const recipients = await this.getRecipientsForCampaign(campaign);
    
    if (recipients.length === 0) {
      console.log(`⚠️ No recipients for campaign ${campaign.name}`);
      instance.status = 'completed';
      instance.completedAt = new Date();
      await instance.save();
      return;
    }

    // Send SMS
    await smsService.sendBulkSMS({
      campaignId: instance.id,
      userId: campaign.userId,
      contacts: recipients.map(phone => ({ phoneNumber: phone })),
      message: campaign.message,
      senderId: campaign.senderId,
      isUnicode: campaign.isUnicode,
      isFlash: campaign.isFlash,
    });

    // Update campaign stats
    campaign.occurrencesCount += 1;
    campaign.lastRunAt = new Date();
    campaign.nextRunAt = campaign.calculateNextRunDate();
    
    // Check if campaign should end
    if (!campaign.nextRunAt) {
      campaign.status = 'completed';
      campaign.completedAt = new Date();
      
      // Notify user
      await NotificationService.campaignCompleted(
        campaign.userId,
        campaign.name,
        campaign.id,
        { total: recipients.length, delivered: 0, failed: 0 }
      );
    }
    
    await campaign.save();

    console.log(`✅ Recurring campaign instance created: ${instance.id}`);
  }

  /**
   * Get recipients based on campaign targeting rules
   */
  static async getRecipientsForCampaign(campaign: Campaign): Promise<string[]> {
    const where: any = { userId: campaign.userId, isSubscribed: true };
    
    // Apply targeting rules
    switch (campaign.targetType) {
      case 'all':
        // All subscribed contacts
        break;
        
      case 'group':
        if (campaign.groupId) {
          const group = await Group.findByPk(campaign.groupId, {
            include: [{ model: Contact, as: 'contacts' }]
          });
          // return group?.contacts?.map((c: Contact) => c.phoneNumber) || [];
          // return group?.get('contacts')?.map((c: Contact) => c.phoneNumber) || [];
          return ( group as any )?.get('contacts')?.map((c: Contact) => c.phoneNumber) || [];
        }
        break;
        
      case 'segment':
        if (campaign.segmentRules) {
          const query = this.buildSegmentQuery(campaign.segmentRules);
          where[Op.and] = query;
        }
        break;
        
      case 'manual':
        if (campaign.includedContacts && campaign.includedContacts.length > 0) {
          where.id = { [Op.in]: campaign.includedContacts };
        }
        break;
    }
    
    // Handle birthday campaigns
    if (campaign.isBirthdayCampaign && campaign.birthdayField) {
      const today = new Date();
      const monthDay = `${today.getMonth() + 1}-${today.getDate()}`;
      
      // This is simplified - in production you'd need proper date extraction
      where[`customFields.${campaign.birthdayField}`] = {
        [Op.like]: `%${monthDay}%`
      };
    }
    
    // Apply exclusions
    if (campaign.excludedContacts && campaign.excludedContacts.length > 0) {
      where.id = { [Op.notIn]: campaign.excludedContacts };
    }
    
    const contacts = await Contact.findAll({
      where,
      attributes: ['phoneNumber'],
    });
    
    return contacts.map(c => c.phoneNumber);
  }

  /**
   * Build Sequelize query from segment rules
   */
  static buildSegmentQuery(rules: any[]): any[] {
    const conditions: any[] = [];
    
    for (const rule of rules) {
      const field = rule.field.startsWith('customFields.') 
        ? sequelize.literal(`"customFields"->>'${rule.field.split('.')[1]}'`)
        : rule.field;
      
      switch (rule.operator) {
        case 'eq':
          conditions.push({ [field]: rule.value });
          break;
        case 'neq':
          conditions.push({ [field]: { [Op.ne]: rule.value } });
          break;
        case 'gt':
          conditions.push({ [field]: { [Op.gt]: rule.value } });
          break;
        case 'gte':
          conditions.push({ [field]: { [Op.gte]: rule.value } });
          break;
        case 'lt':
          conditions.push({ [field]: { [Op.lt]: rule.value } });
          break;
        case 'lte':
          conditions.push({ [field]: { [Op.lte]: rule.value } });
          break;
        case 'contains':
          conditions.push({ [field]: { [Op.like]: `%${rule.value}%` } });
          break;
        case 'in':
          conditions.push({ [field]: { [Op.in]: rule.value } });
          break;
      }
    }
    
    return conditions;
  }
}

// Run every 5 minutes
const FIVE_MINUTES = 5 * 60 * 1000;
setInterval(() => RecurringCampaignScheduler.checkAndRunRecurringCampaigns(), FIVE_MINUTES);

// Run once at startup
RecurringCampaignScheduler.checkAndRunRecurringCampaigns();
