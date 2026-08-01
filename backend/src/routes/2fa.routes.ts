import { Router } from 'express';
import { TwoFactorController } from '../controllers/2fa.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate 2FA secret
router.post('/generate', TwoFactorController.generate);

// Enable 2FA
router.post('/enable', [
  body('token').notEmpty().withMessage('Verification code is required')
], validate, TwoFactorController.enable);

// Disable 2FA
router.post('/disable', TwoFactorController.disable);

// Get 2FA status
router.get('/status', TwoFactorController.status);

export default router;