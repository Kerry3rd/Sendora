import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import NotificationService from '../services/notification/notification.service';

export class NotificationController {
  /**
   * Get user's notifications
   */
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { 
        page = 1, 
        limit = 20, 
        unreadOnly = 'false',
        includeExpired = 'false'
      } = req.query;

      console.log(`📋 Fetching notifications for user: ${userId}`);

      const offset = (Number(page) - 1) * Number(limit);

      const result = await NotificationService.getUserNotifications(userId, {
        limit: Number(limit),
        offset,
        unreadOnly: unreadOnly === 'true',
        includeExpired: includeExpired === 'true',
      });

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          pagination: {
            total: result.total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(result.total / Number(limit)),
          },
          unreadCount: result.unreadCount,
        },
      });
    } catch (error: any) {
      console.error('❌ Get notifications error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        success: false,
        message: error.message,
        error: error.toString()
      });
    }
  }

  /**
   * Get unread count only
   */
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      console.log(`🔢 Fetching unread count for user: ${userId}`);
      
      const count = await NotificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error: any) {
      console.error('❌ Get unread count error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        success: false,
        message: error.message,
        error: error.toString()
      });
    }
  }

  /**
   * Mark notification as read - FIXED
   */
  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      // Handle case where notificationId might be an array
      const id = Array.isArray(notificationId) ? notificationId[0] : notificationId;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Notification ID is required',
        });
      }

      const marked = await NotificationService.markAsRead(id, userId);

      if (!marked) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error: any) {
      console.error('❌ Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const marked = await NotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: `${marked} notifications marked as read`,
        data: { marked },
      });
    } catch (error: any) {
      console.error('❌ Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete notification - FIXED
   */
  static async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      // Handle case where notificationId might be an array
      const id = Array.isArray(notificationId) ? notificationId[0] : notificationId;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Notification ID is required',
        });
      }

      const deleted = await NotificationService.deleteNotification(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error: any) {
      console.error('❌ Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default NotificationController;