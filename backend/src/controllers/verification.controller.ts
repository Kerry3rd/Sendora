import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import crypto from 'crypto';

// Mock email service for now (you can add real email later)
const sendEmail = async (email: string, code: string) => {
  console.log(`📧 Email to ${email}: Your verification code is ${code}`);
  return true;
};

// Mock SMS service (using your existing AfricasTalking)
const sendSMS = async (phone: string, code: string) => {
  console.log(`📱 SMS to ${phone}: Your verification code is ${code}`);
  return true;
};

export class VerificationController {
  // Step 1: Initial registration
  static async initiateRegistration(req: Request, res: Response) {
    try {
      const { email, phone, password, firstName, lastName, company } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { phone }]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email or phone already exists',
        });
      }

      // Generate verification codes
      const emailCode = crypto.randomInt(100000, 999999).toString();
      const phoneCode = crypto.randomInt(100000, 999999).toString();

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        company: company || null,
        role: 'user',
        isActive: false,
        isEmailVerified: false,
        isPhoneVerified: false,
        emailVerificationCode: emailCode,
        phoneVerificationCode: phoneCode,
        credits: 10,
      });

      // Send verification codes
      await Promise.all([
        sendEmail(email, emailCode),
        sendSMS(phone, phoneCode)
      ]);

      res.status(201).json({
        success: true,
        message: 'Registration initiated. Check your email and phone for verification codes.',
        data: {
          userId: user.id,
          email: user.email,
          phone: user.phone,
        },
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  // Step 2: Verify email
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { userId, code } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (user.emailVerificationCode !== code) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
        });
      }

      user.isEmailVerified = true;
      user.emailVerificationCode = null;
      await user.save();

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          nextStep: user.isPhoneVerified ? 'create-username' : 'verify-phone',
          bothVerified: user.isPhoneVerified,
        },
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Step 3: Verify phone
  static async verifyPhone(req: Request, res: Response) {
    try {
      const { userId, code } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (user.phoneVerificationCode !== code) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
        });
      }

      user.isPhoneVerified = true;
      user.phoneVerificationCode = null;
      await user.save();

      res.json({
        success: true,
        message: 'Phone verified successfully',
        data: {
          nextStep: user.isEmailVerified ? 'create-username' : 'verify-email',
          bothVerified: user.isEmailVerified,
        },
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Step 4: Create username
  static async createUsername(req: Request, res: Response) {
    try {
      const { userId, username } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (!user.isEmailVerified || !user.isPhoneVerified) {
        return res.status(400).json({
          success: false,
          message: 'Please verify both email and phone first',
        });
      }

      // Check if username exists
      const existingUser = await User.findOne({
        where: { username }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username already taken',
        });
      }

      // Validate username
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores',
        });
      }

      user.username = username;
      user.isActive = true;
      await user.save();

      // Generate token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Registration complete! Welcome to SENDORA.',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            credits: user.credits,
          },
        },
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Resend verification code
  static async resendCode(req: Request, res: Response) {
    try {
      const { userId, type } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const newCode = crypto.randomInt(100000, 999999).toString();

      if (type === 'email') {
        user.emailVerificationCode = newCode;
        await user.save();
        await sendEmail(user.email, newCode);
      } else if (type === 'phone') {
        user.phoneVerificationCode = newCode;
        await user.save();
        await sendSMS(user.phone, newCode);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification type',
        });
      }

      res.json({
        success: true,
        message: `New verification code sent to your ${type}`,
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Step 5: Login with username/email/phone - FIXED VERSION
  static async login(req: Request, res: Response) {
    try {
      const { username, email, phone, password } = req.body;

      // Build the where condition dynamically without nulls
      const whereCondition: any = {};
      
      if (username) whereCondition.username = username;
      else if (email) whereCondition.email = email;
      else if (phone) whereCondition.phone = phone;
      else {
        return res.status(400).json({
          success: false,
          message: 'Please provide username, email, or phone',
        });
      }

      // Find user by the provided identifier
      const user = await User.findOne({
        where: whereCondition
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account not verified. Please check your email and phone.',
        });
      }

      const isValidPassword = await user.comparePassword(password);
      console.log('🔑 Password comparison result:', isValidPassword);
      console.log('📝 Input password length:', password.length);
      console.log('💾 Stored hash:', user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            credits: user.credits,
          },
        },
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default VerificationController;
