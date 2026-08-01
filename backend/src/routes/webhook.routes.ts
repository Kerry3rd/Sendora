import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// Public webhooks (no authentication - called by Twilio/AfricasTalking)
router.post('/twilio/status', WebhookController.twilioStatus);
router.post('/africastalking/delivery', WebhookController.africastalkingStatus);
router.post('/test', WebhookController.testWebhook);

export default router;
