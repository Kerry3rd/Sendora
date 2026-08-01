import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { authenticate } from '../middleware/auth.middleware';
import { 
  validate, 
  campaignValidation,
  idParamValidation,
  paginationValidation,
  validateWithZod,
  campaignZodSchema 
} from '../middleware/validation.middleware';
import { 
  smsLimiter,
  apiLimiter,
  userSmsLimiter,
  concurrentCampaignsLimiter,
  strictLimiter
} from '../middleware/rateLimit.middleware';

const router = Router();

// All campaign routes require authentication
router.use(authenticate);

// GET routes - Read operations (standard API limits)
router.get('/',
  apiLimiter,                    // 100 requests per minute
  validate(paginationValidation),
  CampaignController.getCampaigns
);

router.get('/recurring',
  apiLimiter,                    // 100 requests per minute
  CampaignController.getRecurringCampaigns
);

router.get('/birthday',
  apiLimiter,                    // 100 requests per minute
  CampaignController.getBirthdayCampaigns
);

router.get('/:id',
  apiLimiter,                    // 100 requests per minute
  validate(idParamValidation),
  CampaignController.getCampaign
);

// POST routes - Create operations (stricter limits)
router.post('/',
  strictLimiter,                  // 10 requests per minute
  concurrentCampaignsLimiter,     // Max 5 concurrent campaigns
  smsLimiter,                     // SMS rate limit (30/minute)
  userSmsLimiter,                 // Per-user hourly limit
  validateWithZod(campaignZodSchema),
  CampaignController.createCampaign
);

// PUT routes - Update operations
router.put('/:id',
  strictLimiter,                  // 10 requests per minute
  validate(idParamValidation),
  validateWithZod(campaignZodSchema.partial()),
  CampaignController.updateCampaign
);

// DELETE routes
router.delete('/:id',
  strictLimiter,                  // 10 requests per minute
  validate(idParamValidation),
  CampaignController.deleteCampaign
);

// Action routes - Campaign operations that consume resources
router.post('/:id/start',
  strictLimiter,                  // 10 requests per minute
  concurrentCampaignsLimiter,     // Check concurrent campaigns
  smsLimiter,                     // SMS rate limit
  userSmsLimiter,                 // Per-user hourly limit
  validate(idParamValidation),
  CampaignController.startCampaign
);

router.post('/:id/pause',
  strictLimiter,                  // 10 requests per minute
  validate(idParamValidation),
  CampaignController.pauseCampaign
);

router.post('/:id/resume',
  strictLimiter,                  // 10 requests per minute
  validate(idParamValidation),
  CampaignController.resumeCampaign
);

router.post('/:id/cancel',
  strictLimiter,                  // 10 requests per minute
  validate(idParamValidation),
  CampaignController.cancelCampaign
);

// Stats and logs routes - Read operations
router.get('/:id/stats',
  apiLimiter,                     // 100 requests per minute
  validate(idParamValidation),
  CampaignController.getCampaignStats
);

router.get('/:id/logs',
  apiLimiter,                     // 100 requests per minute
  validate(idParamValidation),
  CampaignController.getCampaignLogs
);

router.get('/:id/instances',
  apiLimiter,                     // 100 requests per minute
  validate(idParamValidation),
  CampaignController.getCampaignInstances
);

export default router;