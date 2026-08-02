import { Op } from 'sequelize';
// import cron from 'node-cron';
import { ScheduledTask } from 'node-cron';
import * as cron from 'node-cron'; // for the schedule function
import ScheduledMessage, { MessageStatus, RepeatType, MessageType } from '../models/ScheduledMessage';
import MessageLog, { MessageLogStatus } from '../models/MessageLog';
import Contact from '../models/Contact';
import Group from '../models/Group';
// import GroupContact from '../models/GroupContact';
import GroupContact from '../models/GroupMembership';
import { EmailService } from '../services/email/email.service';
import { smsService } from '../services/sms/SMSService';
import { logger } from '../utils/logger';

export class MessageSchedulerService {
  private static instance: MessageSchedulerService;
  private isRunning = false;
  private cronJob: ScheduledTask;

  private constructor() {
    // Run every minute to check for messages to send
    this.cronJob = cron.schedule('* * * * *', () => {
      this.processScheduledMessages();
    });
  }

  public static getInstance(): MessageSchedulerService {
    if (!MessageSchedulerService.instance) {
      MessageSchedulerService.instance = new MessageSchedulerService();
    }
    return MessageSchedulerService.instance;
  }

  public start() {
    this.cronJob.start();
    logger.info('Message scheduler started');
  }

  public stop() {
    this.cronJob.stop();
    logger.info('Message scheduler stopped');
  }

  private async processScheduledMessages() {
    if (this.isRunning) {
      logger.debug('Scheduler already running, skipping');
      return;
    }

    this.isRunning = true;
    const now = new Date();

    try {
      // Find all pending messages that are due
      const messages = await ScheduledMessage.findAll({
        where: {
          status: {
            [Op.in]: [MessageStatus.PENDING, MessageStatus.PROCESSING],
          },
          nextScheduledAt: {
            [Op.lte]: now,
          },
          [Op.or]: [ 
            { endDate: null },
            { endDate: { [Op.gte]: now } },
          ],
        },
      } as any);

      logger.info(`Found ${messages.length} messages to process`);

      for (const message of messages) {
        await this.processMessage(message);
      }
    } catch (error) {
      logger.error('Error processing scheduled messages:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processMessage(message: ScheduledMessage) {
    try {
      // Update status to processing
      await message.update({
        status: MessageStatus.PROCESSING,
        lastSentAt: new Date(),
      });

      // Get target contacts
      const contacts = await this.getTargetContacts(message);
      
      logger.info(`Sending message "${message.name}" to ${contacts.length} contacts via ${message.messageType}`);

      // Send messages based on type
      let sentCount = 0;
      let failedCount = 0;

      if (message.messageType === MessageType.EMAIL) {
        const result = await this.sendEmails(message, contacts);
        sentCount = result.sent;
        failedCount = result.failed;
      } else if (message.messageType === MessageType.SMS) {
        const result = await this.sendSMSs(message, contacts);
        sentCount = result.sent;
        failedCount = result.failed;
      }

      // Update message stats
      await message.update({
        sentCount: message.sentCount + sentCount,
        failedCount: message.failedCount + failedCount,
      });

      // Calculate next schedule
      if (message.repeatType === RepeatType.ONCE) {
        await message.update({
          status: MessageStatus.COMPLETED,
        });
      } else {
        const nextScheduledAt = this.calculateNextSchedule(message);
        
        // Check if we should stop (end date reached)
        if (message.endDate && nextScheduledAt > message.endDate) {
          await message.update({
            status: MessageStatus.COMPLETED,
          });
        } else {
          await message.update({
            status: MessageStatus.PENDING,
            nextScheduledAt,
          });
        }
      }

    } catch (error) {
      logger.error(`Error processing message ${message.id}:`, error);
      await message.update({
        status: MessageStatus.FAILED,
      });
    }
  }

  private async getTargetContacts(message: ScheduledMessage) {
    let contactIds: string[] = [];

    switch (message.targetType) {
      case 'all':
        const allContacts = await Contact.findAll({
          where: { userId: message.userId },
          attributes: ['id', 'email', 'phone', 'firstName', 'lastName'],
        });
        contactIds = allContacts.map(c => c.id);
        break;

      case 'group':
        const groupContacts = await GroupContact.findAll({
          where: { groupId: { [Op.in]: message.targetIds } },
          include: [{
            model: Contact,
            where: { userId: message.userId },
            required: true,
          }],
        });
        contactIds = [...new Set(groupContacts.map(gc => gc.contactId))];
        break;

      case 'contacts':
        contactIds = message.targetIds;
        break;
    }

    // Get full contact details
    return Contact.findAll({
      where: {
        id: { [Op.in]: contactIds },
        userId: message.userId,
      },
    });
  }

  private async sendEmails(message: ScheduledMessage, contacts: Contact[]) {
    const emailService = EmailService.getInstance();
    let sent = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        if (!contact.email) {
          throw new Error('Contact has no email');
        }

        const result = await emailService.sendEmail(
          {
            to: contact.email,
            subject: message.subject,
            template: 'default',
            data: {
              firstName: contact.firstName,
              lastName: contact.lastName,
              fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
              email: contact.email,
              phone: contact.phoneNumber,
              message: this.processTemplate(message.content, contact),
              subject: message.subject,
              unsubscribeUrl: `${process.env.APP_URL}/unsubscribe?email=${encodeURIComponent(contact.email)}`,
            },
          },
          message.userId
        );

        await MessageLog.create({
          scheduledMessageId: message.id,
          contactId: contact.id,
          contactEmail: contact.email,
          status: result.success ? MessageLogStatus.SENT : MessageLogStatus.FAILED,
          error: result.error?.message,
          sentAt: new Date(),
          metadata: { messageId: result.messageId },
        } as any);

        if (result.success) {
          sent++;
        } else {
          failed++;
        }

      } catch (error: any) {
        failed++;
        await MessageLog.create({
          scheduledMessageId: message.id,
          contactId: contact.id,
          contactEmail: contact.email || undefined,
          status: MessageLogStatus.FAILED,
          error: error.message,
          sentAt: new Date(),
        } as any);
      }
    }

    return { sent, failed };
  }

  private async sendSMSs(message: ScheduledMessage, contacts: Contact[]) {
    let sent = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        if (!contact.phoneNumber) {
          throw new Error('Contact has no phone number');
        }

        // Use your existing SMS service
        const result = await smsService.sendSingleSMS({
          userId: message.userId,
          phoneNumber: contact.phoneNumber,
          message: this.processTemplate(message.content, contact),
          senderId: process.env.SMS_SENDER_ID || 'SENDORA',
          isUnicode: false,
          isFlash: false,
        });

        await MessageLog.create({
          scheduledMessageId: message.id,
          contactId: contact.id,
          contactPhone: contact.phoneNumber,
          status: result.success ? MessageLogStatus.SENT : MessageLogStatus.FAILED,
          error: result.error,
          sentAt: new Date(),
          metadata: { messageId: result.messageId, gateway: result.gateway },
        } as any);

        if (result.success) {
          sent++;
        } else {
          failed++;
        }

      } catch (error: any) {
        failed++;
        await MessageLog.create({
          scheduledMessageId: message.id,
          contactId: contact.id,
          contactPhone: contact.phoneNumber,
          status: MessageLogStatus.FAILED,
          error: error.message,
          sentAt: new Date(),
        } as any);
      }
    }

    return { sent, failed };
  }

  private processTemplate(content: string, contact: Contact): string {
    // Simple template replacement
    return content
      .replace(/{{firstName}}/g, contact.firstName || '')
      .replace(/{{lastName}}/g, contact.lastName || '')
      .replace(/{{fullName}}/g, `${contact.firstName || ''} ${contact.lastName || ''}`.trim())
      .replace(/{{email}}/g, contact.email || '')
      .replace(/{{phone}}/g, contact.phoneNumber || '');
  }

  private calculateNextSchedule(message: ScheduledMessage): Date {
    const now = new Date();
    const nextDate = new Date(message.startDate);
    
    const [hours, minutes] = message.repeatTime.split(':').map(Number);
    nextDate.setHours(hours, minutes, 0, 0);

    switch (message.repeatType) {
      case RepeatType.DAILY:
        while (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;
      
      case RepeatType.WEEKLY:
        while (nextDate <= now || (message.repeatDay !== undefined && nextDate.getDay() !== message.repeatDay)) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;
      
      case RepeatType.MONTHLY:
        while (nextDate <= now || (message.repeatDay !== undefined && nextDate.getDate() !== message.repeatDay)) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;
    }

    return nextDate;
  }

  // Manual trigger for testing
  public async triggerNow(messageId: string) {
    const message = await ScheduledMessage.findByPk(messageId);
    if (!message) throw new Error('Message not found');
    
    await this.processMessage(message);
  }
}