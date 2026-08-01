// @ts-ignore
const africastalking = require('africastalking');
import { SMSGateway, SMSMessage, SMSResponse, GatewayHealth } from '../SMSGatewayBase';

export class AfricasTalkingGateway extends SMSGateway {
  private client: any;
  private username: string;
  private apiKey: string;
  private fromNumber: string;

  constructor(config: Record<string, any>) {
    super('AfricasTalking', config);
    
    this.username = config.username || process.env.AFRICASTALKING_USERNAME || '';
    this.apiKey = config.apiKey || process.env.AFRICASTALKING_API_KEY || '';
    this.fromNumber = config.fromNumber || process.env.AFRICASTALKING_FROM || '';

    if (!this.username || !this.apiKey) {
      console.error('❌ AfricasTalking: Missing credentials');
      this.isEnabled = false;
      return;
    }

    try {
      const service = africastalking({
        username: this.username,
        apiKey: this.apiKey
      });
      this.client = service.SMS;
      console.log('📱 AfricasTalking gateway initialized');
    } catch (error: any) {
      console.error('❌ AfricasTalking init failed:', error.message);
      this.isEnabled = false;
    }
  }

  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    try {
      if (!this.isEnabled || !this.client) {
        throw new Error('Gateway not available');
      }

      const options: any = {
        to: [message.to],
        message: message.body,
        enqueue: true
      };

      // Only add from if it exists
      if (this.fromNumber) {
        options.from = this.fromNumber;
      }

      console.log(`📤 Sending via AfricasTalking to ${message.to}`);
      const result = await this.client.send(options);
      
      const recipient = result?.SMSMessageData?.Recipients?.[0];
      
      if (recipient?.status === 'Success') {
        // Parse cost (format: "TZS 22.0000")
        const costStr = recipient.cost || '0';
        const cost = parseFloat(costStr.replace(/[^0-9.-]+/g, '')) * 0.00038; // Convert TZS to USD
        
        return {
          success: true,
          messageId: recipient.messageId || `at_${Date.now()}`,
          gateway: this.name,
          status: 'sent',
          cost: cost || 0.004, // Fallback cost
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
    return 10.00; // Mock balance
  }

  async checkHealth(): Promise<GatewayHealth> {
    const startTime = Date.now();
    return {
      gateway: this.name,
      status: 'healthy',
      latency: Date.now() - startTime,
      balance: await this.checkBalance(),
      lastChecked: new Date(),
    };
  }

  isTanzanianNumber(phoneNumber: string): boolean {
    return phoneNumber.startsWith('+255') || phoneNumber.startsWith('255');
  }
}

export default AfricasTalkingGateway;
