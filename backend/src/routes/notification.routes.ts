import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import NotificationController from '../controllers/notification.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get notifications
router.get('/', NotificationController.getNotifications);

// Get unread count
router.get('/unread/count', NotificationController.getUnreadCount);

// Mark as read
router.patch('/:notificationId/read', NotificationController.markAsRead);

// Mark all as read
router.post('/mark-all-read', NotificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', NotificationController.deleteNotification);

export default router;
