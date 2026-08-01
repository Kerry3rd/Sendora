import nodemailer from 'nodemailer';
import crypto from 'crypto';

class EmailVerificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure your email service (Gmail, SendGrid, etc.)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  generateCode(): string {
    // Generate 6-digit code
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const mailOptions = {
      from: `"SENDORA" <${process.env.SMTP_FROM || 'noreply@sendora.co.tz'}>`,
      to: email,
      subject: 'Verify Your Email - SENDORA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0B1F3A;">SENDORA</h1>
          </div>
          <div style="background-color: #E6F7F5; padding: 20px; border-radius: 5px;">
            <h2 style="color: #00C2A8; margin-top: 0;">Email Verification</h2>
            <p style="color: #1A1F2B; font-size: 16px;">Your verification code is:</p>
            <div style="background-color: white; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0B1F3A; border-radius: 5px;">
              ${code}
            </div>
            <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
            <p style="color: #6B7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">
            © 2025 SENDORA. All rights reserved.
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const mailOptions = {
      from: `"SENDORA" <${process.env.SMTP_FROM || 'noreply@sendora.co.tz'}>`,
      to: email,
      subject: 'Welcome to SENDORA!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0B1F3A;">SENDORA</h1>
          </div>
          <div style="background-color: #E6F7F5; padding: 20px; border-radius: 5px;">
            <h2 style="color: #00C2A8; margin-top: 0;">Welcome, ${username}! 🎉</h2>
            <p style="color: #1A1F2B; font-size: 16px;">Your email has been successfully verified.</p>
            <p style="color: #1A1F2B;">You can now start sending messages through SENDORA.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #0B1F3A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">
            © 2025 SENDORA. All rights reserved.
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
}

export const emailVerificationService = new EmailVerificationService();
export default emailVerificationService;
