import axios from 'axios';
import { azampayConfig } from '../../config/azampay';
import { wsService } from '../websocket.service'; // Import WebSocket service
import Transaction from '../../models/Transaction';
import User from '../../models/User';

interface AzamPayCredentials {
  appName: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  environment: 'sandbox' | 'production';
}

interface MobileCheckoutParams {
  accountNumber: string;  // Customer's phone number
  amount: number;
  externalId: string;     // Your unique transaction ID
  provider: string;       // 'Airtel', 'Tigo', 'Halopesa', 'Mpesa', 'Azampesa'
}

interface BankCheckoutParams {
  amount: number;
  currency: string;
  merchantAccountNumber: string;
  merchantMobileNumber: string;
  merchantName: string;
  otp: string;
  provider: string;       // 'CRDB' or 'NMB'
  referenceId: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  data?: any;
  errors?: any;
}

class AzamPayService {
  private credentials: AzamPayCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(credentials: AzamPayCredentials) {
    this.credentials = credentials;
    console.log(`📱 AzamPay service initialized for ${credentials.environment}`);
  }

  // Get OAuth2 token
  async getAccessToken(): Promise<string | null> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const authUrl = this.credentials.environment === 'production'
      ? 'https://authenticator.azampay.co.tz'
      : 'https://authenticator-sandbox.azampay.co.tz';

    try {
      console.log('🔑 Requesting AzamPay access token...');
      
      const response = await axios.post(`${authUrl}/AppRegistration/GenerateToken`, {
        appName: this.credentials.appName,
        clientId: this.credentials.clientId,
        clientSecret: this.credentials.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/json',
          'apiKey': this.credentials.apiKey
        },
        timeout: 30000,
        validateStatus: (status) => status < 500
      });

      if (!response.data?.data?.accessToken) {
        console.error('❌ Invalid response from AzamPay:', response.data);
        return null;
      }

      this.accessToken = response.data.data.accessToken;
      // Token expires in 1 hour
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
      
      console.log('✅ AzamPay access token obtained');
      return this.accessToken;
      
    } catch (error: any) {
      if (error.code === 'ECONNRESET') {
        console.error('❌ Connection reset by AzamPay - possible network issue');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('❌ Connection timed out - AzamPay sandbox may be slow');
      } else if (error.response) {
        console.error('❌ AzamPay responded with error:', error.response.status);
        console.error('   Response data:', error.response.data);
      } else {
        console.error('❌ Failed to get AzamPay token:', error.message);
      }

      // Return null instead of throwing
      return null;
    }
  }

  // Mobile money checkout
  async mobileCheckout(params: MobileCheckoutParams): Promise<PaymentResult> {
    try {
      const token = await this.getAccessToken();
      
      if (!token) {
        // For development, return mock success
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Using mock AzamPay response for development');
          return {
            success: true,
            transactionId: 'MOCK' + Date.now(),
            message: 'Payment initiated (MOCK MODE)',
            data: {
              transactionId: 'MOCK' + Date.now(),
              status: 'pending'
            }
          };
        }
        
        return {
          success: false,
          message: 'Failed to authenticate with AzamPay'
        };
      }

      const checkoutUrl = this.credentials.environment === 'production'
        ? 'https://checkout.azampay.co.tz'
        : 'https://sandbox.azampay.co.tz';

      // Format phone number (remove + and ensure 255 format)
      let accountNumber = params.accountNumber.replace('+', '');
      if (accountNumber.startsWith('0')) {
        accountNumber = '255' + accountNumber.slice(1);
      }

      console.log(`📲 Initiating AzamPay mobile checkout:`, {
        provider: params.provider,
        amount: params.amount,
        accountNumber,
        externalId: params.externalId
      });

      const payload = {
        accountNumber,
        amount: params.amount.toString(),
        currency: 'TZS',
        externalId: params.externalId,
        provider: params.provider
      };

      const response = await axios.post(
        `${checkoutUrl}/api/v1/Checkout/MobileCheckout`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'apiKey': this.credentials.apiKey
          }
        }
      );

      console.log('✅ AzamPay mobile checkout response:', response.data);

      return {
        success: true,
        transactionId: response.data.transactionId || response.data.data?.transactionId,
        message: response.data.message || 'Payment initiated',
        data: response.data
      };

    } catch (error: any) {
      console.error('❌ AzamPay mobile checkout failed:', error.response?.data || error.message);
      
      // For development, return mock success on error
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Using mock AzamPay response due to error');
        return {
          success: true,
          transactionId: 'MOCK' + Date.now(),
          message: 'Payment initiated (MOCK MODE)',
          data: {
            transactionId: 'MOCK' + Date.now(),
            status: 'pending'
          }
        };
      }
      
      // Handle validation errors
      if (error.response?.status === 400) {
        return {
          success: false,
          errors: error.response.data.errors || {},
          message: 'Validation failed'
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Payment initiation failed'
      };
    }
  }

  // Bank checkout
  async bankCheckout(params: BankCheckoutParams): Promise<PaymentResult> {
    try {
      const token = await this.getAccessToken();
      
      if (!token) {
        return {
          success: false,
          message: 'Failed to authenticate with AzamPay'
        };
      }

      const checkoutUrl = this.credentials.environment === 'production'
        ? 'https://checkout.azampay.co.tz'
        : 'https://sandbox.azampay.co.tz';

      console.log(`🏦 Initiating AzamPay bank checkout:`, {
        provider: params.provider,
        amount: params.amount
      });

      const payload = {
        amount: params.amount,
        currency: params.currency,
        merchantAccountNumber: params.merchantAccountNumber,
        merchantMobileNumber: params.merchantMobileNumber,
        merchantName: params.merchantName,
        otp: params.otp,
        provider: params.provider,
        referenceId: params.referenceId
      };

      const response = await axios.post(
        `${checkoutUrl}/api/v1/Checkout/BankCheckout`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'apiKey': this.credentials.apiKey
          }
        }
      );

      console.log('✅ AzamPay bank checkout response:', response.data);

      return {
        success: true,
        transactionId: response.data.transactionId,
        message: response.data.message,
        data: response.data
      };

    } catch (error: any) {
      console.error('❌ AzamPay bank checkout failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Bank payment initiation failed'
      };
    }
  }

  // Get supported payment providers
  async getPaymentPartners(): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      if (!token) {
        return {
          success: false,
          data: []
        };
      }

      const checkoutUrl = this.credentials.environment === 'production'
        ? 'https://checkout.azampay.co.tz'
        : 'https://sandbox.azampay.co.tz';

      const response = await axios.get(
        `${checkoutUrl}/api/v1/Partner/GetPaymentPartners`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'apiKey': this.credentials.apiKey
          }
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error: any) {
      console.error('❌ Failed to get payment partners:', error.message);
      return {
        success: false,
        data: []
      };
    }
  }

  // Handle successful payment
  async handleSuccessfulPayment(transactionId: string, paymentData: any): Promise<void> {
    try {
      // Find transaction
      const transaction = await Transaction.findByPk(transactionId);
      if (!transaction) {
        console.error(`❌ Transaction not found: ${transactionId}`);
        return;
      }

      // Find user
      const user = await User.findByPk(transaction.userId);
      if (!user) {
        console.error(`❌ User not found: ${transaction.userId}`);
        return;
      }

      // Calculate new balance
      const creditsToAdd = transaction.metadata?.package?.credits || 0;
      const oldBalance = Number(user.credits);
      const newBalance = oldBalance + creditsToAdd;

      // Update user credits
      user.credits = newBalance;
      await user.save();

      // Update transaction
      await transaction.update({
        status: 'completed',
        paymentReference: paymentData.transactionId,
        creditsAfter: newBalance,
        metadata: {
          ...transaction.metadata,
          completedAt: new Date().toISOString(),
          paymentData
        }
      });

      console.log(`✅ Payment completed for user ${user.id}: +${creditsToAdd} credits`);

      // Send real-time updates via WebSocket
      
      // 1. Balance update
      wsService.emitBalanceUpdate(user.id, newBalance, creditsToAdd);

      // 2. Credit purchase complete notification
      wsService.emitCreditPurchaseComplete(user.id, {
        id: transaction.id,
        credits: creditsToAdd,
        newBalance,
        package: transaction.metadata?.package
      });

      // 3. Send notification
      wsService.emitNotification(user.id, {
        type: 'payment_success',
        title: 'Payment Successful',
        message: `${creditsToAdd} credits added to your account`,
        data: {
          transactionId: transaction.id,
          credits: creditsToAdd,
          newBalance
        }
      });

    } catch (error) {
      console.error('❌ Error handling successful payment:', error);
    }
  }

  // Handle failed payment
  async handleFailedPayment(transactionId: string, error: string): Promise<void> {
    try {
      // Find transaction
      const transaction = await Transaction.findByPk(transactionId);
      if (!transaction) {
        console.error(`❌ Transaction not found: ${transactionId}`);
        return;
      }

      // Update transaction
      await transaction.update({
        status: 'failed',
        metadata: {
          ...transaction.metadata,
          error,
          failedAt: new Date().toISOString()
        }
      });

      console.log(`❌ Payment failed for transaction ${transactionId}: ${error}`);

      // Send real-time notification
      wsService.emitNotification(transaction.userId, {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: error || 'Your payment could not be processed',
        data: {
          transactionId: transaction.id
        }
      });

    } catch (error) {
      console.error('❌ Error handling failed payment:', error);
    }
  }

  // Helper to detect provider from phone number
  detectProvider(phoneNumber: string): string | null {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Tanzanian numbers: detect by prefix
    if (cleaned.startsWith('2557') || cleaned.startsWith('07')) {
      return 'Mpesa';
    }
    if (cleaned.startsWith('2556') || cleaned.startsWith('06')) {
      return 'Tigo';
    }
    if (cleaned.startsWith('2555') || cleaned.startsWith('05')) {
      return 'Airtel';
    }
    
    return null;
  }

  // Helper to format phone number
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('6'))) {
      return `255${cleaned}`;
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `255${cleaned.substring(1)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('255')) {
      return cleaned;
    }
    return cleaned;
  }
}

// Create a variable to hold the service instance
let azamPayServiceInstance: AzamPayService | null = null;

// Function to initialize the service
export const initAzamPay = (credentials: AzamPayCredentials): AzamPayService => {
  azamPayServiceInstance = new AzamPayService(credentials);
  return azamPayServiceInstance;
};

// Getter function to retrieve the service instance
export const getAzamPayService = (): AzamPayService | null => {
  return azamPayServiceInstance;
};

// Default export for convenience (will be null if not initialized)
export default azamPayServiceInstance;