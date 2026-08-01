import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sequelize from '../config/sequelize';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  incrementFailedAttempts, 
  resetFailedAttempts,
  userAuthLimiter,
  ipAuthLimiter,
  twoFactorLimiter
} from '../middleware/rateLimit.middleware';
import { SessionService } from '../services/session.service';
import { TwoFactorService } from '../services/2fa.service';
import { TooManyRequestsError, BadRequestError } from '../utils/errors';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email, password, firstName, lastName, phone, company } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12); // Increased rounds for security

      // Create user with security fields
      const user = await User.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        company: company || null,
        role: 'user',
        isActive: true,
        isEmailVerified: false,
        credits: process.env.NODE_ENV === 'production' ? 0 : 100, // Give test credits in development
        tokenVersion: 1,
        lastLoginAt: null,
        twoFactorEnabled: false
      });

      // Generate tokens
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, version: user.tokenVersion },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' } // Short-lived access token
      );

      const refreshToken = jwt.sign(
        { id: user.id, version: user.tokenVersion },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: '7d' }
      );

      // Create session
      await SessionService.createSession(
        user.id,
        req.headers['user-agent'] || 'unknown',
        req.ip || 'unknown'
      );

      // Send verification email (implement this)
      // await EmailService.sendVerificationEmail(user.email, user.emailVerificationToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            credits: user.credits,
            isEmailVerified: user.isEmailVerified,
            twoFactorEnabled: user.twoFactorEnabled
          },
          token,
          refreshToken
        }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  // Login user with enhanced security
  static async login(req: Request, res: Response) {
    try {
      // Apply rate limiting
      await new Promise((resolve, reject) => {
        userAuthLimiter(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      await new Promise((resolve, reject) => {
        ipAuthLimiter(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find user with all fields needed for security
      const user = await User.findOne({ 
        where: { email },
        attributes: { include: ['password', 'twoFactorSecret', 'twoFactorEnabled', 'tokenVersion'] }
      });
      
      if (!user) {
        await incrementFailedAttempts(email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        await incrementFailedAttempts(email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Reset failed attempts on successful password verification
      await resetFailedAttempts(email);

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Return partial success, require 2FA
        return res.json({
          success: true,
          require2FA: true,
          userId: user.id,
          message: '2FA verification required'
        });
      }

      // Update last login
      await user.update({ 
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
        lastLoginUserAgent: req.headers['user-agent']
      });

      // Generate tokens
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, version: user.tokenVersion },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { id: user.id, version: user.tokenVersion },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: '7d' }
      );

      // Create session
      const sessionId = await SessionService.createSession(
        user.id,
        req.headers['user-agent'] || 'unknown',
        req.ip || 'unknown'
      );

      // Log successful login
      console.log(`✅ Successful login for ${email} from IP: ${req.ip}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            credits: user.credits,
            lastLoginAt: user.lastLoginAt,
            twoFactorEnabled: user.twoFactorEnabled
          },
          token,
          refreshToken,
          sessionId
        }
      });
    } catch (error: any) {
      if (error instanceof TooManyRequestsError) {
        return res.status(429).json({
          success: false,
          message: error.message
        });
      }

      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }

  // Verify 2FA during login
  static async verify2FA(req: Request, res: Response) {
    try {
      await new Promise((resolve, reject) => {
        twoFactorLimiter(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

      const { userId, token } = req.body;

      if (!userId || !token) {
        throw new BadRequestError('User ID and verification code are required');
      }

      // Verify 2FA token
      const isValid = await TwoFactorService.verifyToken(userId, token);
      
      if (!isValid) {
        // Try backup code
        const isBackupValid = await TwoFactorService.verifyBackupCode(userId, token);
        if (!isBackupValid) {
          await incrementFailedAttempts(`2fa:${userId}`);
          throw new BadRequestError('Invalid verification code');
        }
      }

      // Reset failed attempts
      await resetFailedAttempts(`2fa:${userId}`);

      // Get user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new BadRequestError('User not found');
      }

      // Update last login
      await user.update({ 
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
        lastLoginUserAgent: req.headers['user-agent']
      });

      // Generate tokens
      const token_jwt = jwt.sign(
        { id: user.id, email: user.email, role: user.role, version: user.tokenVersion },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { id: user.id, version: user.tokenVersion },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: '7d' }
      );

      // Create session
      const sessionId = await SessionService.createSession(
        user.id,
        req.headers['user-agent'] || 'unknown',
        req.ip || 'unknown'
      );

      res.json({
        success: true,
        message: '2FA verification successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            credits: user.credits,
            twoFactorEnabled: user.twoFactorEnabled
          },
          token: token_jwt,
          refreshToken,
          sessionId
        }
      });
    } catch (error: any) {
      if (error instanceof TooManyRequestsError) {
        return res.status(429).json({
          success: false,
          message: error.message
        });
      }

      console.error('2FA verification error:', error);
      res.status(500).json({
        success: false,
        message: error.message || '2FA verification failed'
      });
    }
  }

  // Get current user profile
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password', 'twoFactorSecret', 'passwordResetToken', 'passwordResetExpires'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get active sessions
      const sessions = await SessionService.getUserSessions(user.id);

      res.json({
        success: true,
        data: {
          user,
          activeSessions: sessions.length
        }
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update user profile
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const { firstName, lastName, phone, company } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.update({
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        phone: phone || user.phone,
        company: company !== undefined ? company : user.company
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          company: user.company,
          role: user.role,
          credits: user.credits
        }
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Change password with rate limiting
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      const user = await User.findByPk(req.user.id, {
        attributes: { include: ['password'] }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update password and increment token version (invalidates old tokens)
      await user.update({ 
        password: hashedPassword,
        tokenVersion: (user.tokenVersion || 0) + 1,
        lastPasswordChange: new Date()
      });

      // Invalidate all sessions except current one
      // await SessionService.destroyAllUserSessions(user.id, req.sessionId);

      res.json({
        success: true,
        message: 'Password changed successfully. You will need to login again on other devices.'
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Logout - destroy session
  static async logout(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      
      if (sessionId) {
        await SessionService.destroySession(sessionId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Logout from all devices
  static async logoutAll(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      // Increment token version to invalidate all tokens
      await User.update(
        { tokenVersion: sequelize.literal('"tokenVersion" + 1') },
        { where: { id: req.user.id } }
      );

      // Destroy all sessions
      await SessionService.destroyAllUserSessions(req.user.id);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error: any) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required',
        });
      }

      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
      ) as any;

      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      // Check if token version matches
      if (user.tokenVersion !== decoded.version) {
        return res.status(401).json({
          success: false,
          message: 'Token has been invalidated',
        });
      }

      // Generate new tokens
      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, version: user.tokenVersion },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { id: user.id, version: user.tokenVersion },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
  }

  // Get current user
  static async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      const user = req.user;

      res.json({
        success: true,
        data: {
          id: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          phone: user?.phone,
          credits: user?.credits,
          role: user?.role,
          twoFactorEnabled: user?.twoFactorEnabled,
          createdAt: user?.createdAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get active sessions
  static async getSessions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const sessions = await SessionService.getUserSessions(req.user.id);

      res.json({
        success: true,
        data: sessions
      });
    } catch (error: any) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Revoke session
  static async revokeSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const { sessionId } = req.params;

      // FIX: Handle case where sessionId might be an array
      const sessionIdStr = Array.isArray(sessionId) ? sessionId[0] : sessionId;

      if (!sessionIdStr) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const session = await SessionService.getSession(sessionIdStr);
      
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      await SessionService.destroySession(sessionIdStr);

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error: any) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}