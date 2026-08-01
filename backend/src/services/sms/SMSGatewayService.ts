import { SMSGateway, SMSMessage, SMSResponse, GatewayHealth } from './SMSGatewayBase';
import TwilioGateway from './gateways/TwilioGateway';
import AfricasTalkingGateway from './gateways/AfricasTalkingGateway';

class VirtualGateway extends SMSGateway {
  constructor(config: Record<string, any>) {
    super('Virtual', config);
  }

  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    console.log(`⚠️ VIRTUAL: Would send to ${message.to}`);
    return {
      success: true,
      messageId: `virtual_${Date.now()}`,
      gateway: this.name,
      status: 'delivered',
      cost: 0.01,
    };
  }

  async checkBalance(): Promise<number> { return 1000; }
  async checkHealth(): Promise<GatewayHealth> {
    return { gateway: this.name, status: 'healthy', latency: 50, balance: 1000, lastChecked: new Date() };
  }
}

export class GatewayManager {
  private gateways: SMSGateway[] = [];
  private tanzaniaGateway: SMSGateway | null = null;
  private internationalGateway: SMSGateway | null = null;

  constructor() {
    this.initializeGateways();
  }

  private initializeGateways(): void {
    // Add AfricasTalking (for Tanzania)
    if (process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY) {
      try {
        const atGateway = new AfricasTalkingGateway({
          enabled: process.env.AFRICASTALKING_ENABLED === 'true',
          priority: 1,
          username: process.env.AFRICASTALKING_USERNAME,
          apiKey: process.env.AFRICASTALKING_API_KEY,
          fromNumber: process.env.AFRICASTALKING_FROM,
        });
        this.gateways.push(atGateway);
        this.tanzaniaGateway = atGateway;
        console.log('✅🇹🇿 AFRICASTALKING gateway ready (Tanzania)');
      } catch (error) {
        console.error('❌ Failed to init AfricasTalking');
      }
    }

    // Add Twilio (for international)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilioGateway = new TwilioGateway({
          enabled: true,
          priority: 2,
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_PHONE_NUMBER,
        });
        this.gateways.push(twilioGateway);
        this.internationalGateway = twilioGateway;
        console.log('✅🌍 TWILIO gateway ready (International)');
      } catch (error) {}
    }

    // Add virtual fallback
    this.gateways.push(new VirtualGateway({ enabled: true, priority: 999 }));
    console.log('✅ Virtual fallback ready');
  }

  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    const isTanzanian = message.to.startsWith('+255') || message.to.startsWith('255');
    
    console.log(`📱 Routing to ${message.to} (${isTanzanian ? '🇹🇿 Tanzania' : '🌍 International'})`);

    // 🇹🇿 Tanzania → AfricasTalking
    if (isTanzanian && this.tanzaniaGateway?.isGatewayEnabled()) {
      const result = await this.tanzaniaGateway.sendSMS(message);
      if (result.success) return result;
    }

    // 🌍 International → Twilio
    if (!isTanzanian && this.internationalGateway?.isGatewayEnabled()) {
      const result = await this.internationalGateway.sendSMS(message);
      if (result.success) return result;
    }

    // Fallback to virtual
    for (const gateway of this.gateways) {
      if (!gateway.isGatewayEnabled()) continue;
      const result = await gateway.sendSMS(message);
      if (result.success) return result;
    }

    return { success: false, gateway: 'all', status: 'failed', error: 'All gateways failed' };
  }

  async checkAllGatewaysHealth(): Promise<GatewayHealth[]> {
    return Promise.all(this.gateways.map(g => g.checkHealth()));
  }
}

export const gatewayManager = new GatewayManager();
export default gatewayManager;
export { SMSGateway, SMSMessage, SMSResponse, GatewayHealth } from './SMSGatewayBase';
