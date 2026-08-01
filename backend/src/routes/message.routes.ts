import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { MessageController } from '../controllers/message.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Validation rules
const messageValidation = [
  body('name').notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('subject').notEmpty().withMessage('Subject is required').isLength({ max: 500 }),
  body('content').notEmpty().withMessage('Content is required'),
  body('messageType').isIn(['email', 'sms', 'notification']).withMessage('Invalid message type'),
  body('repeatType').isIn(['once', 'daily', 'weekly', 'monthly', 'custom']).withMessage('Invalid repeat type'),
  body('repeatTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('targetType').isIn(['all', 'group', 'contacts']).withMessage('Invalid target type'),
  body('targetIds').isArray().withMessage('Target IDs must be an array'),
  body('repeatDay').optional().isInt({ min: 0, max: 31 }).withMessage('Repeat day must be between 0-31'),
];

// Routes
router.get('/', MessageController.getMessages);
router.get('/:id', param('id').isUUID().withMessage('Invalid message ID'), MessageController.getMessage);
router.post('/', messageValidation, MessageController.createMessage);
router.put('/:id', param('id').isUUID(), messageValidation, MessageController.updateMessage);
router.delete('/:id', param('id').isUUID(), MessageController.deleteMessage);
router.post('/:id/pause', param('id').isUUID(), MessageController.pauseMessage);
router.post('/:id/resume', param('id').isUUID(), MessageController.resumeMessage);
router.get('/:id/logs', param('id').isUUID(), MessageController.getMessageLogs);
router.post('/:id/trigger', param('id').isUUID(), MessageController.triggerNow); // For testing

export default router;