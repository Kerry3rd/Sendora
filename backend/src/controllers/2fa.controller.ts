import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TwoFactorService } from '../services/2fa.service';
import { BadRequestError } from '../utils/errors';

export class TwoFactorController {
  // Generate 2FA secret
  static async generate(req: AuthRequest, res: Response) {
    const userId = req.user.id;

    const result = await TwoFactorService.generateSecret(userId);

    res.json({
      success: true,
      data: result
    });
  }

  // Enable 2FA
  static async enable(req: AuthRequest, res: Response) {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      throw new BadRequestError('Verification code is required');
    }

    const result = await TwoFactorService.enable(userId, token);

    res.json({
      success: true,
      message: '2FA enabled successfully',
      data: result
    });
  }

  // Disable 2FA
  static async disable(req: AuthRequest, res: Response) {
    const userId = req.user.id;
    const { token } = req.body;

    await TwoFactorService.disable(userId, token);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  }

  // Verify 2FA during login
  static async verify(req: Request, res: Response) {
    const { userId, token } = req.body;

    if (!userId || !token) {
      throw new BadRequestError('User ID and verification code are required');
    }

    const isValid = await TwoFactorService.verifyToken(userId, token);
    
    if (!isValid) {
      // Try backup code
      const isBackupValid = await TwoFactorService.verifyBackupCode(userId, token);
      if (!isBackupValid) {
        throw new BadRequestError('Invalid verification code');
      }
    }

    res.json({
      success: true,
      message: '2FA verification successful'
    });
  }

  // Get 2FA status
  static async status(req: AuthRequest, res: Response) {
    const user = req.user;

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled || false,
        hasSecret: !!user.twoFactorSecret
      }
    });
  }
}