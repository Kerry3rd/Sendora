import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import AzamPayController from '../controllers/azampay.controller';

const router = Router();

// Public webhook (called by AzamPay)
router.post('/webhook', AzamPayController.webhook);

// Protected routes
router.use(authenticate);

// Get supported payment partners
router.get('/partners', AzamPayController.getPaymentPartners);

// Initiate mobile payment
router.post('/mobile/initiate', AzamPayController.initiateMobilePayment);

export default router;
