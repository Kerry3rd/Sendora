import twilio from 'twilio';
import { SMSGateway, SMSMessage, SMSResponse, GatewayHealth } from '../SMSGatewayBase';

export class TwilioGateway extends SMSGateway {
  private client: any;
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config: Record<string, any>) {
    super('Twilio', config);
    
    this.accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config.fromNumber || process.env.TWILIO_PHONE_NUMBER;
    
    this.client = twilio(this.accountSid, this.authToken);
    console.log('📱 Twilio gateway initialized');
  }

  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    try {
      if (!this.isEnabled) throw new Error('Twilio gateway is disabled');
      if (!this.validatePhoneNumber(message.to)) throw new Error(`Invalid phone number: ${message.to}`);

      console.log(`📤 Sending SMS via Twilio to ${message.to}`);
      
      const twilioMessage = await this.client.messages.create({
        body: message.body,
        from: this.fromNumber,
        to: message.to,
        statusCallback: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/v1/webhooks/twilio/status`,
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        gateway: this.name,
        status: twilioMessage.status,
        cost: 0.0075 * parseInt(twilioMessage.numSegments || '1'),
      };
    } catch (error: any) {
      return {
        success: false,
        gateway: this.name,
        status: 'failed',
        error: error.message,
      };
    }
  }

  async checkBalance(): Promise<number> {
    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();
      return parseFloat(account.balance || '0');
    } catch {
      return 0;
    }
  }

  async checkHealth(): Promise<GatewayHealth> {
    const start = Date.now();
    try {
      await this.client.api.accounts(this.accountSid).fetch();
      return {
        gateway: this.name,
        status: 'healthy',
        latency: Date.now() - start,
        balance: await this.checkBalance(),
        lastChecked: new Date(),
      };
    } catch {
      return {
        gateway: this.name,
        status: 'down',
        latency: Date.now() - start,
        lastChecked: new Date(),
      };
    }
  }
}

export default TwilioGateway;
