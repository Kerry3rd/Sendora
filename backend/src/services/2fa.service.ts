import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import User from '../models/User';
import { BadRequestError } from '../utils/errors';

export class TwoFactorService {
  // Generate 2FA secret for user
  static async generateSecret(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `SENDORA:${user.email}`,
      issuer: 'SENDORA'
    });

    // Save secret to user (encrypted)
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl
    };
  }

  // Verify 2FA token
  static async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorSecret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 steps before/after for time drift
    });
  }

  // Enable 2FA after verification
  static async enable(userId: string, token: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const isValid = await this.verifyToken(userId, token);
    if (!isValid) {
      throw new BadRequestError('Invalid verification code');
    }

    user.twoFactorEnabled = true;
    await user.save();

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    // Save encrypted backup codes
    user.twoFactorBackupCodes = backupCodes.map(code => 
      require('crypto').createHash('sha256').update(code).digest('hex')
    );
    await user.save();

    return { backupCodes };
  }

  // Disable 2FA
  static async disable(userId: string, token?: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    // If 2FA is enabled, verify token before disabling
    if (user.twoFactorEnabled && token) {
      const isValid = await this.verifyToken(userId, token);
      if (!isValid) {
        throw new BadRequestError('Invalid verification code');
      }
    }

    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    user.twoFactorBackupCodes = null;
    await user.save();

    return { success: true };
  }

  // Generate backup codes
  private static generateBackupCodes(count: number = 8): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = require('crypto').randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.match(/.{1,4}/g)!.join('-'));
    }
    return codes;
  }

  // Verify backup code
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorBackupCodes) {
      return false;
    }

    const hashedCode = require('crypto').createHash('sha256').update(code.replace(/-/g, '')).digest('hex');
    const codeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    user.twoFactorBackupCodes.splice(codeIndex, 1);
    await user.save();

    return true;
  }
}