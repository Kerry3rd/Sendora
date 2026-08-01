import { Router } from 'express';
import { PasswordResetController } from '../controllers/passwordReset.controller'; // Fixed: Use named import
import { body } from 'express-validator';

const router = Router();

// Request password reset
router.post(
  '/request',
  [
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  PasswordResetController.requestReset
);

// Reset password with token
router.post(
  '/reset',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  PasswordResetController.resetPassword
);

// Verify reset token
router.get(
  '/verify/:token',
  PasswordResetController.verifyToken
);

export default router;