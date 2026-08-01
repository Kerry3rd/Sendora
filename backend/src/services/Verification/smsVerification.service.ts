// @ts-ignore
const africastalking = require('africastalking');
import crypto from 'crypto';

class SmsVerificationService {
  private client: any;
  private fromNumber: string;

  constructor() {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    this.fromNumber = process.env.AFRICASTALKING_FROM || 'SENDORA';

    if (username && apiKey) {
      const service = africastalking({
        username: username,
        apiKey: apiKey
      });
      this.client = service.SMS;
      console.log('📱 SMS Verification service initialized');
    } else {
      console.warn('⚠️ SMS Verification: Missing AfricasTalking credentials');
    }
  }

  generateCode(): string {
    // Generate 6-digit code
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendVerificationSMS(phoneNumber: string, code: string): Promise<boolean> {
    try {
      if (!this.client) {
        console.warn('⚠️ SMS client not available - would send:', code);
        return true; // For development without SMS credits
      }

      const message = `Your SENDORA verification code is: ${code}. Valid for 10 minutes.`;

      const result = await this.client.send({
        to: [phoneNumber],
        message: message,
        from: this.fromNumber,
        enqueue: true
      });

      const success = result?.SMSMessageData?.Recipients?.[0]?.status === 'Success';
      
      if (success) {
        console.log(`✅ Verification SMS sent to ${phoneNumber}`);
      } else {
        console.error('❌ Failed to send SMS:', result);
      }

      return success;
    } catch (error) {
      console.error('❌ SMS verification error:', error);
      return false;
    }
  }

  async sendWelcomeSMS(phoneNumber: string, username: string): Promise<void> {
    try {
      if (!this.client) return;

      const message = `Welcome to SENDORA, ${username}! Your account is now verified. Start sending messages today.`;

      await this.client.send({
        to: [phoneNumber],
        message: message,
        from: this.fromNumber,
        enqueue: true
      });
    } catch (error) {
      console.error('Failed to send welcome SMS:', error);
    }
  }
}

export const smsVerificationService = new SmsVerificationService();
export default smsVerificationService;
