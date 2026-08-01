import { initAzamPay } from '../services/payment/azampay.service';
import dotenv from 'dotenv';

dotenv.config();

export const initializeAzamPay = () => {
  const credentials = {
    appName: process.env.AZAMPAY_APP_NAME || 'SENDORA',
    clientId: process.env.AZAMPAY_CLIENT_ID || '',
    clientSecret: process.env.AZAMPAY_CLIENT_SECRET || '',
    apiKey: process.env.AZAMPAY_API_KEY || '',
    environment: (process.env.AZAMPAY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
  };

  if (!credentials.clientId || !credentials.clientSecret || !credentials.apiKey) {
    console.warn('⚠️ AzamPay credentials not fully configured');
    return null;
  }

  return initAzamPay(credentials);
};
