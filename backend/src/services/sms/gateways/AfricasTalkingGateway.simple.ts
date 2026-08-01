import { SMSGateway, SMSMessage, SMSResponse, GatewayHealth } from '../SMSGatewayBase';

// Use require instead of import to avoid TypeScript issues
// @ts-ignore
const africastalking = require('africastalking');

export class AfricasTalkingGateway extends SMSGateway {
  private client: any;
  private username: string;
  private apiKey: string;
  private fromNumber: string;
  private isProduction: boolean;

  constructor(config: Record<string, any>) {
    super('AfricasTalking', config);
    
    this.username = config.username || process.env.AFRICASTALKING_USERNAME || '';
    this.apiKey = config.apiKey || process.env.AFRICASTALKING_API_KEY || '';
    this.fromNumber = config.fromNumber || process.env.AFRICASTALKING_FROM || 'SENDORA';
    this.isProduction = config.isProduction || process.env.NODE_ENV === 'production';

    if (!this.username || !this.apiKey) {
      console.error('❌ AfricasTalking: Missing username or API key');
      this.isEnabled = false;
      return;
    }

    try {
      const credentials: any = {
        username: this.username,
        apiKey: this.apiKey,
      };
      
      if (this.isProduction) {
        credentials.environment = 'production';
      } else {
        credentials.environment = 'sandbox';
      }

      const service = africastalking(credentials);
      this.client = service.SMS;
      console.log(`📱 AfricasTalking gateway initialized for ${this.isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
    } catch (error: any) {
      console.error('❌ AfricasTalking initialization failed:', error.message);
      this.isEnabled = false;
    }
  }

  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    try {
      if (!this.isEnabled || !this.client) {
        throw new Error('AfricasTalking gateway is not available');
      }

      if (!this.validatePhoneNumber(message.to)) {
        throw new Error(`Invalid phone number: ${message.to}`);
      }

      console.log(`📤 Sending via AfricasTalking to ${message.to}`);

      const result = await this.client.send({
        to: [message.to],
        message: message.body,
        from: this.fromNumber,
        enqueue: true
      });

      const recipient = result?.SMSMessageData?.Recipients?.[0];

      // Add webhook URL for delivery reports
      const options: any = {
        to: recipient,
        message: message.body,
        from: this.fromNumber,
        enqueue: true
      };

      // Add delivery report webhook
      if (this.isProduction) {
        options.retryDurationInHours = 1;
        // AfricasTalking calls webhook when status changes
        // They'll use the same webhook URL configured in your dashboard
      }

      // const result = await this.client.send(options);

      if (recipient?.status === 'Success' || recipient?.statusCode === 101) {
        return {
          success: true,
          messageId: recipient.messageId || `at_${Date.now()}`,
          gateway: this.name,
          status: 'sent',
          cost: 0.004,
        };
      }

      throw new Error(recipient?.status || 'Send failed');

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
    // For sandbox, always return mock balance
    return 10.00;
  }

  async checkHealth(): Promise<GatewayHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.client) throw new Error('Not initialized');
      
      return {
        gateway: this.name,
        status: 'healthy',
        latency: Date.now() - startTime,
        balance: await this.checkBalance(),
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        gateway: this.name,
        status: 'down',
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  isTanzanianNumber(phoneNumber: string): boolean {
    return phoneNumber.startsWith('+255') || phoneNumber.startsWith('255');
  }
}

export default AfricasTalkingGateway;
