import nodemailer from 'nodemailer';
import { emailConfig } from '../../config/email';
import { EmailTemplatesService, TemplateData } from './email-templates.service';
import { logger } from '../../utils/logger';

export interface EmailOptions {
  to: string | string[];
  subject?: string;
  template?: string;
  data?: TemplateData;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    cid?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: Error;
  to: string;
  subject: string;  // This is required
  timestamp: Date;
}

export class EmailService {
  private static instance: EmailService;
  private transporter!: nodemailer.Transporter; // Fixed: Added definite assignment assertion
  private templatesService: EmailTemplatesService;
  private rateLimitQueue: Map<string, number[]> = new Map();
  private isConnected: boolean = false;

  private constructor() {
    this.templatesService = EmailTemplatesService.getInstance();
    this.createTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      pool: true, // Use pooled connections
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000, // 1 second between messages
      rateLimit: emailConfig.rateLimit?.max || 50,
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.isConnected = false;
        logger.error('Email service connection failed:', error);
      } else {
        this.isConnected = true;
        logger.info('Email service ready to send messages');
      }
    });
  }

  private async checkRateLimit(userId: string): Promise<boolean> {
    if (!emailConfig.rateLimit) return true;

    const now = Date.now();
    const userRequests = this.rateLimitQueue.get(userId) || [];
    
    // Remove old requests
    const recentRequests = userRequests.filter(
      time => now - time < emailConfig.rateLimit!.period
    );

    if (recentRequests.length >= emailConfig.rateLimit.max) {
      return false;
    }

    recentRequests.push(now);
    this.rateLimitQueue.set(userId, recentRequests);
    return true;
  }

  public async sendEmail(options: EmailOptions, userId?: string): Promise<EmailResult> {
    try {
      // Check rate limit if userId provided
      if (userId && !(await this.checkRateLimit(userId))) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Prepare email content
      let html = options.html;
      let text = options.text;
      let subject = options.subject || 'New message'; // Fixed: Provide default subject

      // Use template if provided
      if (options.template) {
        const template = await this.templatesService.renderTemplate(
          options.template,
          options.data || {}
        );
        html = template.html;
        text = template.text;
        subject = subject || template.subject;
      }

      // Validate content
      if (!html && !text) {
        throw new Error('Either html or text content is required');
      }

      // Prepare mail options
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
        to: options.to,
        subject: subject,
        html,
        text,
        attachments: options.attachments,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo || emailConfig.replyTo || emailConfig.from,
        priority: options.priority || 'normal',
        headers: {
          'X-Priority': options.priority === 'high' ? '1' : '3',
          'X-MSMail-Priority': options.priority === 'high' ? 'High' : 'Normal',
        },
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully to ${options.to}:`, info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: subject, // Now guaranteed to be string
        timestamp: new Date(),
      };

    } catch (error) {
      logger.error('Failed to send email:', error);
      
      return {
        success: false,
        error: error as Error,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject || 'Unknown', // Fixed: Provide fallback
        timestamp: new Date(),
      };
    }
  }

  public async sendBulkEmails(
    emails: EmailOptions[],
    userId: string
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    // Process in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => this.sendEmail(email, userId));
      
      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason,
            to: batch[index].to as string,
            subject: batch[index].subject || 'Unknown', // Fixed: Provide fallback
            timestamp: new Date(),
          });
        }
      });

      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.error('Email connection test failed:', error);
      return false;
    }
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      config: {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        from: emailConfig.from,
        rateLimit: emailConfig.rateLimit,
      },
    };
  }
}