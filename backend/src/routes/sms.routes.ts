import { Router } from 'express';
import { SMSController } from '../controllers/sms.controller';
import { authenticate } from '../middleware/auth.middleware';
import { 
  validate, 
  smsValidation, 
  bulkSmsValidation,
  paginationValidation,
  idParamValidation,
  validateWithZod,
  paymentZodSchema
} from '../middleware/validation.middleware';
import { 
  smsLimiter,
  userSmsLimiter,
  dailySmsQuota,
  apiLimiter
} from '../middleware/rateLimit.middleware';

const router = Router();

// All SMS routes require authentication
router.use(authenticate);

// Single SMS - Multiple layers of rate limiting
router.post('/send',
  smsLimiter,           // Global SMS rate: 30 per minute
  userSmsLimiter,       // Per user: 100 per hour
  dailySmsQuota,        // Daily quota: 1000 per day
  validate(smsValidation),
  SMSController.sendSingleSMS
);

// Bulk SMS - Stricter limits
router.post('/bulk',
  smsLimiter,           // Global SMS rate: 30 per minute
  userSmsLimiter,       // Per user: 100 per hour
  dailySmsQuota,        // Daily quota: 1000 per day
  validate(bulkSmsValidation),
  SMSController.sendBulkSMS
);

// Delivery Reports - Standard API limits
router.get('/reports',
  apiLimiter,           // 100 API calls per minute
  validate(paginationValidation),
  SMSController.getDeliveryReports
);

router.get('/reports/:id',
  apiLimiter,           // 100 API calls per minute
  validate(idParamValidation),
  SMSController.getDeliveryReport
);

// SMS Statistics - Standard API limits
router.get('/stats',
  apiLimiter,           // 100 API calls per minute
  SMSController.getStats
);

// Balance - Less restrictive (users check balance frequently)
router.get('/balance',
  apiLimiter,           // Still apply API limits, but with higher threshold
  SMSController.getBalance
);

// Payment initialization - Stricter limits (financial transactions)
router.post('/pay',
  smsLimiter,           // Use SMS limiter for payment attempts
  validateWithZod(paymentZodSchema),
  SMSController.initiatePayment
);

export default router;