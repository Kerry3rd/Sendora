export interface SMSMessage {
  to: string;
  from: string;
  body: string;
  messageId?: string;
  isUnicode?: boolean;
  isFlash?: boolean;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  gateway: string;
  status: string;
  error?: string;
  cost?: number;
  remainingBalance?: number;
}

export interface GatewayHealth {
  gateway: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  balance?: number;
  lastChecked: Date;
}

export abstract class SMSGateway {
  protected name: string;
  protected config: Record<string, any>;
  protected isEnabled: boolean;

  constructor(name: string, config: Record<string, any>) {
    this.name = name;
    this.config = config;
    this.isEnabled = config.enabled !== false;
  }

  abstract sendSMS(message: SMSMessage): Promise<SMSResponse>;
  abstract checkBalance(): Promise<number>;
  abstract checkHealth(): Promise<GatewayHealth>;

  getName(): string {
    return this.name;
  }

  isGatewayEnabled(): boolean {
    return this.isEnabled;
  }

  disable(): void {
    this.isEnabled = false;
    console.log(`⚠️ Disabled ${this.name} gateway`);
  }

  enable(): void {
    this.isEnabled = true;
    console.log(`✅ Enabled ${this.name} gateway`);
  }

  protected validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}
