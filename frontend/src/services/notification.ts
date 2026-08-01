import api from './api';

export interface Notification {
  id: string;
  type: 'campaign_complete' | 'credits_low' | 'sms_delivered' | 'sms_failed' | 'announcement' | 'payment_success' | 'payment_failed';
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

class NotificationService {
  /**
   * Get user's notifications
   */
  async getNotifications(params: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  } = {}) {
    try {
      const response = await api.get('/notifications', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount() {
    try {
      const response = await api.get('/notifications/unread/count');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return { data: { unreadCount: 0 } };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw error;
    }
  }

  /**
   * Mark all as read
   */
  async markAllAsRead() {
    try {
      const response = await api.post('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string) {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }
}

export default new NotificationService();
