import Notification from '../../models/Notification';
import { Op } from 'sequelize';
import User from '../../models/User';

export class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(data: {
    userId: string;
    type: Notification['type'];
    title: string;
    message: string;
    data?: Record<string, any>;
    link?: string;
    expiresIn?: number; // hours
  }): Promise<Notification> {
    try {
      const expiresAt = data.expiresIn 
        ? new Date(Date.now() + data.expiresIn * 60 * 60 * 1000) 
        : null;

      const notification = await Notification.create({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        link: data.link,
        expiresAt,
        isRead: false,
        isDeleted: false,
      });

      console.log(`📢 Notification created for user ${data.userId}: ${data.title}`);
      return notification;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users (broadcast)
   */
  static async broadcastNotification(data: {
    userIds: string[];
    type: Notification['type'];
    title: string;
    message: string;
    data?: Record<string, any>;
    link?: string;
    expiresIn?: number;
  }): Promise<number> {
    try {
      const notifications = [];
      const expiresAt = data.expiresIn 
        ? new Date(Date.now() + data.expiresIn * 60 * 60 * 1000) 
        : null;

      for (const userId of data.userIds) {
        notifications.push({
          userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          link: data.link,
          expiresAt,
          isRead: false,
          isDeleted: false,
        });
      }

      const created = await Notification.bulkCreate(notifications);
      console.log(`📢 Broadcast notification sent to ${data.userIds.length} users`);
      return created.length;
    } catch (error) {
      console.error('❌ Error broadcasting notifications:', error);
      throw error;
    }
  }

  /**
   * Get user's notifications with pagination
   */
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      includeExpired?: boolean;
    } = {}
  ) {
    try {
      const { limit = 20, offset = 0, unreadOnly = false, includeExpired = false } = options;

      console.log(`🔍 Getting notifications for user: ${userId}`);

      const where: any = { userId, isDeleted: false };
      
      if (unreadOnly) {
        where.isRead = false;
      }
      
      if (!includeExpired) {
        where[Op.or] = [
          { expiresAt: { [Op.gte]: new Date() } },
          { expiresAt: null },
        ];
      }

      const { count, rows } = await Notification.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      const unreadCount = await Notification.count({
        where: { userId, isRead: false, isDeleted: false },
      });

      console.log(`📊 Found ${count} notifications, ${unreadCount} unread`);

      return {
        total: count,
        notifications: rows,
        unreadCount,
      };
    } catch (error) {
      console.error('❌ Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const [updated] = await Notification.update(
        { isRead: true },
        { where: { id: notificationId, userId } }
      );
      return updated > 0;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const [updated] = await Notification.update(
        { isRead: true },
        { where: { userId, isRead: false, isDeleted: false } }
      );
      return updated;
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification (soft delete)
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const [updated] = await Notification.update(
        { isDeleted: true },
        { where: { id: notificationId, userId } }
      );
      return updated > 0;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpired(): Promise<number> {
    try {
      const deleted = await Notification.destroy({
        where: {
          expiresAt: { [Op.lt]: new Date() },
        },
      });
      console.log(`🧹 Cleaned up ${deleted} expired notifications`);
      return deleted;
    } catch (error) {
      console.error('❌ Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      console.log(`🔢 Getting unread count for user: ${userId}`);
      
      const count = await Notification.count({
        where: {
          userId,
          isRead: false,
          isDeleted: false,
          [Op.or]: [
            { expiresAt: { [Op.gte]: new Date() } },
            { expiresAt: null },
          ],
        },
      });
      
      console.log(`📊 Unread count: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      throw error;
    }
  }

  // ============ SPECIFIC NOTIFICATION TYPES ============

  /**
   * Campaign completed notification
   */
  static async campaignCompleted(userId: string, campaignId: string, campaignName: string, stats: any) {
    return this.createNotification({
      userId,
      type: 'campaign_complete',
      title: 'Campaign Complete 🎉',
      message: `Your campaign "${campaignName}" has finished sending. ${stats.delivered || 0} messages delivered.`,
      data: { campaignId, stats },
      link: `/campaigns/${campaignId}`,
      expiresIn: 168, // 7 days
    });
  }

  /**
   * Low credits alert
   */
  static async lowCredits(userId: string, credits: number, threshold: number = 100) {
    return this.createNotification({
      userId,
      type: 'credits_low',
      title: '⚠️ Low Credits Alert',
      message: `Your credit balance is low (${credits.toFixed(2)}). Please purchase more credits to continue sending.`,
      data: { credits, threshold },
      link: '/buy-credits',
      expiresIn: 72, // 3 days
    });
  }

  /**
   * SMS delivered notification
   */
  static async smsDelivered(userId: string, phoneNumber: string, campaignId?: string) {
    return this.createNotification({
      userId,
      type: 'sms_delivered',
      title: '✅ SMS Delivered',
      message: `Message to ${phoneNumber} was successfully delivered.`,
      data: { phoneNumber, campaignId },
      link: campaignId ? `/campaigns/${campaignId}` : undefined,
      expiresIn: 24, // 1 day
    });
  }

  /**
   * SMS failed notification
   */
  static async smsFailed(userId: string, phoneNumber: string, reason: string, campaignId?: string) {
    return this.createNotification({
      userId,
      type: 'sms_failed',
      title: '❌ SMS Failed',
      message: `Message to ${phoneNumber} failed: ${reason}`,
      data: { phoneNumber, reason, campaignId },
      link: campaignId ? `/campaigns/${campaignId}` : undefined,
      expiresIn: 24, // 1 day
    });
  }

  /**
   * Payment success notification
   */
  static async paymentSuccess(userId: string, amount: number, credits: number) {
    return this.createNotification({
      userId,
      type: 'payment_success',
      title: '💰 Payment Successful',
      message: `Your payment of $${amount.toFixed(2)} was successful. ${credits} credits added to your account.`,
      data: { amount, credits },
      link: '/transactions',
      expiresIn: 168, // 7 days
    });
  }

  /**
   * Payment failed notification
   */
  static async paymentFailed(userId: string, amount: number, reason: string) {
    return this.createNotification({
      userId,
      type: 'payment_failed',
      title: '❌ Payment Failed',
      message: `Your payment of $${amount.toFixed(2)} failed: ${reason}`,
      data: { amount, reason },
      link: '/buy-credits',
      expiresIn: 48, // 2 days
    });
  }
}

export default NotificationService;
