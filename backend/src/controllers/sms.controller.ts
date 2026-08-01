import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import smsService from '../services/sms/SMSService';
import { gatewayManager } from '../services/sms/SMSGatewayService';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class SMSController {
  // Send single SMS
  static async sendSingleSMS(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { phoneNumber, message, senderId, isUnicode, isFlash } = req.body;
      const userId = req.user.id;

      // Validate phone number format
      const phoneRegex = /^(?:\+255|0)[67][0-9]{8}$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new BadRequestError('Invalid phone number format. Use 0712345678 or +255712345678');
      }

      const result = await smsService.sendSingleSMS({
        userId,
        phoneNumber,
        message,
        senderId,
        isUnicode,
        isFlash,
      });

      res.status(200).json({
        success: true,
        message: 'SMS sent successfully',
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Send bulk SMS
  static async sendBulkSMS(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { contacts, message, senderId, isUnicode, isFlash, scheduleFor } = req.body;
      const userId = req.user.id;

      // Validate contacts array
      if (!Array.isArray(contacts) || contacts.length === 0) {
        throw new BadRequestError('Contacts array is required and must not be empty');
      }

      // Validate each contact has a valid phone number
      const phoneRegex = /^(?:\+255|0)[67][0-9]{8}$/;
      for (const contact of contacts) {
        if (!phoneRegex.test(contact.phoneNumber)) {
          throw new BadRequestError(`Invalid phone number format: ${contact.phoneNumber}. Use 0712345678 or +255712345678`);
        }
      }

      // Limit batch size
      if (contacts.length > 10000) {
        throw new BadRequestError('Maximum batch size is 10,000 contacts');
      }

      // Check user credits before sending
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Calculate estimated cost
      const messageParts = isUnicode 
        ? Math.ceil(message.length * 2 / 70)
        : Math.ceil(message.length / 160);
      const estimatedCost = contacts.length * messageParts * 50; // Using your pricing

      if (user.credits < estimatedCost) {
        throw new BadRequestError(`Insufficient credits. Need ${estimatedCost} credits, you have ${user.credits}`);
      }

      const result = await smsService.sendBulkSMS({
        userId,
        contacts,
        message,
        senderId,
        isUnicode,
        isFlash,
        scheduleFor: scheduleFor ? new Date(scheduleFor) : undefined,
      });

      res.status(200).json({
        success: true,
        message: scheduleFor ? 'Bulk SMS scheduled successfully' : 'Bulk SMS queued successfully',
        data: {
          ...result,
          estimatedCost,
          messageParts,
          totalMessages: contacts.length * messageParts
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get delivery reports
  static async getDeliveryReports(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { 
        campaignId, 
        startDate, 
        endDate, 
        status, 
        page = 1, 
        limit = 50 
      } = req.query;

      // Helper to safely convert any query param to string or undefined
      const toString = (param: any): string | undefined => {
        if (!param) return undefined;
        if (typeof param === 'string') return param;
        if (Array.isArray(param)) return param[0];
        if (typeof param === 'object') return JSON.stringify(param);
        return String(param);
      };

      // Convert all params safely
      const campaignIdStr = toString(campaignId);
      const statusStr = toString(status);
      
      // Handle dates
      let startDateObj: Date | undefined = undefined;
      let endDateObj: Date | undefined = undefined;

      const startDateStr = toString(startDate);
      const endDateStr = toString(endDate);

      if (startDateStr) {
        startDateObj = new Date(startDateStr);
        if (isNaN(startDateObj.getTime())) {
          startDateObj = undefined;
        }
      }

      if (endDateStr) {
        endDateObj = new Date(endDateStr);
        if (isNaN(endDateObj.getTime())) {
          endDateObj = undefined;
        }
      }

      // Ensure page and limit are numbers
      const pageNum = Number(page);
      const limitNum = Number(limit);

      const result = await smsService.getDeliveryReports({
        userId,
        campaignId: campaignIdStr,
        startDate: startDateObj,
        endDate: endDateObj,
        status: statusStr,
        limit: isNaN(limitNum) ? 50 : limitNum,
        offset: (isNaN(pageNum) ? 1 : pageNum - 1) * (isNaN(limitNum) ? 50 : limitNum),
      });

      res.status(200).json({
        success: true,
        data: {
          messages: result.messages,
          pagination: {
            page: isNaN(pageNum) ? 1 : pageNum,
            limit: isNaN(limitNum) ? 50 : limitNum,
            total: result.total,
            pages: Math.ceil(result.total / (isNaN(limitNum) ? 50 : limitNum)),
          },
          stats: result.stats,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get single delivery report
  static async getDeliveryReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Ensure id is a string
      const messageId = Array.isArray(id) ? id[0] : id;

      const report = await smsService.getDeliveryReport(messageId, userId);

      if (!report) {
        throw new NotFoundError('Delivery report not found');
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get SMS balance
  static async getBalance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      
      const user = await User.findByPk(userId, {
        attributes: ['id', 'credits', 'email', 'firstName', 'lastName'],
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get gateway health and balances
      const gatewayHealth = await gatewayManager.checkAllGatewaysHealth();

      // Calculate message estimates
      const paygRate = 50; // Your PAYG rate
      const messageEstimate = Math.floor(user.credits / paygRate);

      res.status(200).json({
        success: true,
        data: {
          user: {
            credits: user.credits,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            messageEstimate,
          },
          gateways: gatewayHealth,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Initiate payment (if you want to keep this in SMS controller)
  static async initiatePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { packageId, phoneNumber, provider } = req.body;
      const userId = req.user.id;

      // This would call your payment service
      // For now, return a placeholder
      res.status(200).json({
        success: true,
        message: 'Payment initiated',
        data: {
          reference: 'PAY' + Date.now(),
          packageId,
          phoneNumber,
          provider,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get SMS statistics
  static async getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;

      const stats = await smsService.getUserStats(userId, Number(days));

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      next(error);
    }
  }
}