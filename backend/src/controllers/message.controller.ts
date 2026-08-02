import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import ScheduledMessage, { MessageStatus, MessageType, RepeatType } from '../models/ScheduledMessage';
import MessageLog from '../models/MessageLog';
import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import sequelize from '../config/sequelize';
import { MessageSchedulerService } from '../services/message-scheduler.service';

export class MessageController {
  // Get all scheduled messages for user
  static async getMessages(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, type } = req.query;

      const where: any = { userId };

      if (status) where.status = status;
      if (type) where.messageType = type;

      const { count, rows } = await ScheduledMessage.findAndCountAll({
        where,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [['createdAt', 'DESC']],
      });

      res.json({
        success: true,
        data: {
          messages: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get single message
  static async getMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const message = await ScheduledMessage.findOne({
        where: { id, userId },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      // Get recent logs
      const logs = await MessageLog.findAll({
        where: { scheduledMessageId: id },
        limit: 50,
        order: [['createdAt', 'DESC']],
      });

      res.json({
        success: true,
        data: {
          ...message.toJSON(),
          recentLogs: logs,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Create scheduled message
  static async createMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const {
        name,
        subject,
        content,
        messageType,
        repeatType,
        repeatDay,
        repeatTime,
        startDate,
        endDate,
        targetType,
        targetIds,
      } = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Calculate next scheduled date
      const [hours, minutes] = repeatTime.split(':').map(Number);
      const nextDate = new Date(startDate);
      nextDate.setHours(hours, minutes, 0, 0);

      const message = await ScheduledMessage.create({
        name,
        subject,
        content,
        messageType,
        repeatType,
        repeatDay,
        repeatTime,
        startDate,
        endDate,
        targetType,
        targetIds,
        nextScheduledAt: nextDate,
        status: MessageStatus.PENDING,
        userId,
        sentCount: 0,
        failedCount: 0,
        // createdAt: new Date(),
      } as any);

      res.status(201).json({
        success: true,
        message: 'Message scheduled successfully',
        data: message,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update scheduled message
  static async updateMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;

      const message = await ScheduledMessage.findOne({
        where: { id, userId },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      // Recalculate next schedule if dates changed
      if (updates.startDate || updates.repeatTime || updates.repeatType || updates.repeatDay) {
        const [hours, minutes] = (updates.repeatTime || message.repeatTime).split(':').map(Number);
        const nextDate = new Date(updates.startDate || message.startDate);
        nextDate.setHours(hours, minutes, 0, 0);
        updates.nextScheduledAt = nextDate;
      }

      updates.updatedBy = userId;

      await message.update(updates);

      res.json({
        success: true,
        message: 'Message updated successfully',
        data: message,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Delete scheduled message
  static async deleteMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const message = await ScheduledMessage.findOne({
        where: { id, userId },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      await message.destroy();

      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Pause message
  static async pauseMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const message = await ScheduledMessage.findOne({
        where: { id, userId },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      await message.update({
        status: MessageStatus.PAUSED,
      });

      res.json({
        success: true,
        message: 'Message paused successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Resume message
  static async resumeMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const message = await ScheduledMessage.findOne({
        where: { id, userId },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      await message.update({
        status: MessageStatus.PENDING,
      });

      res.json({
        success: true,
        message: 'Message resumed successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get message logs
  static async getMessageLogs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { page = 1, limit = 50, status } = req.query;

      // First verify message belongs to user
      const message = await ScheduledMessage.findOne({
        where: { id, userId },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      const where: any = { scheduledMessageId: id };
      if (status) where.status = status;

      const { count, rows } = await MessageLog.findAndCountAll({
        where,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [['createdAt', 'DESC']],
      });

      // Get summary stats
      const stats = await MessageLog.findAll({
        where: { scheduledMessageId: id },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      res.json({
        success: true,
        data: {
          logs: rows,
          stats,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(count / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Manual trigger (for testing)
  static async triggerNow(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const message = await ScheduledMessage.findOne({
        where: { id, userId },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      const scheduler = MessageSchedulerService.getInstance();
      await scheduler.triggerNow(userId);

      res.json({
        success: true,
        message: 'Message triggered successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}