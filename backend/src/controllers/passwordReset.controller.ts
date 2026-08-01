import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User';
import { EmailService } from '../services/email/email.service';
import { Op } from 'sequelize';
import { 
  passwordResetLimiter, 
  passwordResetTokenLimiter,
  incrementFailedAttempts,
  resetFailedAttempts,
  getRateLimitStatus
} from '../middleware/rateLimit.middleware';
import { BadRequestError, TooManyRequestsError } from '../utils/errors';

export class PasswordResetController {
  // Request password reset with rate limiting
  static async requestReset(req: Request, res: Response): Promise<void> {
    try {
      // Apply rate limiting
      await new Promise((resolve, reject) => {
        passwordResetLimiter(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      
      // Always return success even if user not found (security best practice)
      if (!user) {
        // Still increment rate limit to prevent email enumeration
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Add delay
        res.status(200).json({
          success: true,
          message: 'If your email is registered, you will receive a password reset link',
        });
        return;
      }

      // Check if there's already a recent reset request
      if (user.passwordResetExpires && user.passwordResetExpires > new Date()) {
        const timeLeft = Math.ceil((user.passwordResetExpires.getTime() - Date.now()) / 60000);
        res.status(200).json({
          success: true,
          message: `A reset link was already sent. It will expire in ${timeLeft} minutes.`,
        });
        return;
      }

      // Generate reset token (stronger random bytes)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to user
      await user.update({
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry,
      });

      // Send reset email
      const emailService = EmailService.getInstance();
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;

      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'password-reset',
        data: {
          firstName: user.firstName,
          resetUrl,
          expiresIn: '1 hour',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      // Log the request (for audit)
      console.log(`🔐 Password reset requested for ${email} from IP: ${req.ip}`);

      res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link',
      });
    } catch (error: any) {
      if (error instanceof TooManyRequestsError) {
        res.status(429).json({
          success: false,
          message: error.message,
        });
        return;
      }

      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
      });
    }
  }

  // Verify reset token with rate limiting
  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      // Apply rate limiting for token verification
      await new Promise((resolve, reject) => {
        passwordResetTokenLimiter(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      const { token } = req.params;

      // FIXED: Ensure token is a string
      const tokenString = Array.isArray(token) ? token[0] : token;

      // Track failed attempts by token
      const tokenKey = `reset:token:${tokenString}`;
      const status = await getRateLimitStatus(tokenKey);
      
      if (status.current >= 5) {
        throw new TooManyRequestsError('Too many verification attempts. Please request a new reset link.');
      }

      // Find user with valid token
      const user = await User.findOne({
        where: {
          passwordResetToken: tokenString,
          passwordResetExpires: { [Op.gt]: new Date() },
        },
        attributes: ['id', 'email', 'firstName'],
      });

      if (!user) {
        // Increment failed attempts
        await incrementFailedAttempts(tokenString);
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
        return;
      }

      // Reset failed attempts on success
      await resetFailedAttempts(tokenString);

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          email: user.email,
          firstName: user.firstName,
        },
      });
    } catch (error: any) {
      if (error instanceof TooManyRequestsError) {
        res.status(429).json({
          success: false,
          message: error.message,
        });
        return;
      }

      console.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify token',
      });
    }
  }

  // Reset password with token
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // Apply rate limiting for password reset
      await new Promise((resolve, reject) => {
        passwordResetLimiter(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { token, newPassword } = req.body;

      // FIXED: Ensure token is a string
      const tokenString = Array.isArray(token) ? token[0] : token;

      // Validate password strength
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
        return;
      }

      if (!/[A-Z]/.test(newPassword)) {
        res.status(400).json({
          success: false,
          message: 'Password must contain at least one uppercase letter',
        });
        return;
      }

      if (!/[a-z]/.test(newPassword)) {
        res.status(400).json({
          success: false,
          message: 'Password must contain at least one lowercase letter',
        });
        return;
      }

      if (!/[0-9]/.test(newPassword)) {
        res.status(400).json({
          success: false,
          message: 'Password must contain at least one number',
        });
        return;
      }

      // Track failed attempts by token
      const tokenKey = `reset:password:${tokenString}`;
      const status = await getRateLimitStatus(tokenKey);
      
      if (status.current >= 3) {
        throw new TooManyRequestsError('Too many reset attempts. Please request a new reset link.');
      }

      // Find user with valid token
      const user = await User.findOne({
        where: {
          passwordResetToken: tokenString,
          passwordResetExpires: { [Op.gt]: new Date() },
        },
      });

      if (!user) {
        // Increment failed attempts
        await incrementFailedAttempts(tokenString);
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
        return;
      }

      // Check if password was already changed recently
      if (user.lastPasswordChange && 
          user.lastPasswordChange > new Date(Date.now() - 5 * 60 * 1000)) {
        res.status(400).json({
          success: false,
          message: 'Password was recently changed. Please wait before trying again.',
        });
        return;
      }

      // Update password and clear reset fields
      await user.update({
        password: newPassword, // Will be hashed by model hook
        passwordResetToken: null,
        passwordResetExpires: null,
        lastPasswordChange: new Date(),
      });

      // Invalidate all existing sessions (force logout from other devices)
      await user.update({
        tokenVersion: (user.tokenVersion || 0) + 1
      });

      // Reset failed attempts on success
      await resetFailedAttempts(tokenString);

      // Send confirmation email
      const emailService = EmailService.getInstance();
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Changed Successfully',
        template: 'password-changed',
        data: {
          firstName: user.firstName,
          time: new Date().toLocaleString(),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      // Log the password change
      console.log(`🔐 Password changed for ${user.email} from IP: ${req.ip}`);

      res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
      });
    } catch (error: any) {
      if (error instanceof TooManyRequestsError) {
        res.status(429).json({
          success: false,
          message: error.message,
        });
        return;
      }

      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
      });
    }
  }

  // Cancel reset request
  static async cancelReset(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      // FIXED: Ensure token is a string
      const tokenString = Array.isArray(token) ? token[0] : token;

      const user = await User.findOne({
        where: {
          passwordResetToken: tokenString,
        },
      });

      if (user) {
        await user.update({
          passwordResetToken: null,
          passwordResetExpires: null,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Reset request cancelled',
      });
    } catch (error: any) {
      console.error('Cancel reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel reset request',
      });
    }
  }

  // Get reset request status (for debugging)
  static async getResetStatus(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      // FIXED: Ensure token is a string
      const tokenString = Array.isArray(token) ? token[0] : token;

      const user = await User.findOne({
        where: {
          passwordResetToken: tokenString,
        },
        attributes: ['passwordResetExpires', 'email'],
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Reset token not found',
        });
        return;
      }

      // FIXED: Handle null passwordResetExpires
      const isValid = user.passwordResetExpires && user.passwordResetExpires > new Date();
      const expiresIn = isValid && user.passwordResetExpires
        ? Math.ceil((user.passwordResetExpires.getTime() - Date.now()) / 60000)
        : 0;

      res.status(200).json({
        success: true,
        data: {
          valid: isValid,
          expiresIn,
          email: user.email,
        },
      });
    } catch (error: any) {
      console.error('Get reset status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reset status',
      });
    }
  }
}