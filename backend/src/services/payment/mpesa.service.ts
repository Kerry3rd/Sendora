import axios from 'axios';
import crypto from 'crypto';

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

class MpesaService {
  private config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: MpesaConfig) {
    this.config = config;
  }

  // Get OAuth token
  async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    const url = this.config.environment === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}` },
      });

      this.accessToken = response.data.access_token;
      // Token expires in 1 hour
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
      
      return this.accessToken as string; // ✅ Type assertion since we know it's not null
    } catch (error) {
      console.error('Failed to get M-Pesa token:', error);
      throw new Error('M-Pesa authentication failed');
    }
  }

  // Generate password for STK push
  generatePassword(timestamp: string): string {
    const shortCode = this.config.businessShortCode;
    const passkey = this.config.passkey;
    const data = shortCode + passkey + timestamp;
    return Buffer.from(data).toString('base64');
  }

  // Initiate STK Push (Lipa Na M-Pesa Online)
  async stkPush(phoneNumber: string, amount: number, accountReference: string, description: string) {
    try {
      const token = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = this.generatePassword(timestamp);

      const url = this.config.environment === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

      // Format phone number (remove + and ensure 254 format)
      const formattedPhone = phoneNumber.replace('+', '');
      const mpesaPhone = formattedPhone.startsWith('0') 
        ? '254' + formattedPhone.slice(1) 
        : formattedPhone;

      const payload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: mpesaPhone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: mpesaPhone,
        CallBackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/v1/payments/mpesa/callback`,
        AccountReference: accountReference.slice(0, 12),
        TransactionDesc: description.slice(0, 13),
      };

      const response = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        success: true,
        checkoutRequestID: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
      };
    } catch (error: any) {
      console.error('M-Pesa STK push failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'Payment initiation failed',
      };
    }
  }

  // Query STK push status
  async queryStatus(checkoutRequestID: string) {
    try {
      const token = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = this.generatePassword(timestamp);

      const url = this.config.environment === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

      const payload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        success: true,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Failed to query M-Pesa status:', error);
      return {
        success: false,
        error: error.message || 'Status query failed',
      };
    }
  }
}

// Export singleton instance
export const mpesaService = new MpesaService({
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  businessShortCode: process.env.MPESA_SHORTCODE || '',
  passkey: process.env.MPESA_PASSKEY || '',
  environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
});

export default mpesaService;
