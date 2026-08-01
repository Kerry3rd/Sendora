declare module 'africastalking' {
  interface SMSMessageOptions {
    to: string | string[];
    message: string;
    from?: string;
    enqueue?: boolean;
    keyword?: string;
    linkId?: string;
    retryDurationInHours?: number;
  }

  interface SMSResponse {
    SMSMessageData: {
      Message: string;
      Recipients?: Array<{
        messageId: string;
        number: string;
        cost: string;
        status: string;
        statusCode: number;
      }>;
    };
  }

  interface ApplicationResponse {
    UserData: {
      balance: string;
      name: string;
      description?: string;
    };
  }

  interface SMSClient {
    send(options: SMSMessageOptions): Promise<SMSResponse>;
    fetchMessages(options?: { lastReceivedId?: number }): Promise<any>;
    fetchSubscription(options: { shortCode: string; keyword: string; lastReceivedId?: number }): Promise<any>;
    createSubscription(options: { shortCode: string; keyword: string; phoneNumber: string; checkoutToken?: string }): Promise<any>;
  }

  interface AirtimeClient {
    send(options: {
      recipients: Array<{
        phoneNumber: string;
        amount: string | number;
        currencyCode?: string;
      }>;
    }): Promise<any>;
  }

  interface PaymentsClient {
    mobileCheckout(options: {
      productName: string;
      phoneNumber: string;
      currencyCode: string;
      amount: number;
      metadata?: Record<string, any>;
    }): Promise<any>;
    mobileB2C(options: {
      productName: string;
      recipients: Array<{
        phoneNumber: string;
        currencyCode: string;
        amount: number;
        metadata?: Record<string, any>;
      }>;
    }): Promise<any>;
    mobileData(options: {
      productName: string;
      recipients: Array<{
        phoneNumber: string;
        quantity: number;
        unit?: string;
        validity?: string;
        metadata?: Record<string, any>;
      }>;
    }): Promise<any>;
    walletTransfer(options: {
      productName: string;
      targetProductCode?: number;
      currencyCode: string;
      amount: number;
      metadata?: Record<string, any>;
    }): Promise<any>;
    topupStash(options: {
      productName: string;
      currencyCode: string;
      amount: number;
      metadata?: Record<string, any>;
    }): Promise<any>;
  }

  interface VoiceClient {
    call(options: { callFrom: string; callTo: string }): Promise<any>;
    fetchQueuedCalls(options: { phoneNumber: string }): Promise<any>;
    uploadMediaFile(options: { phoneNumber: string; url: string }): Promise<any>;
  }

  interface TokenClient {
    createCheckoutToken(phoneNumber: string): Promise<{ token: string }>;
    generateAuthToken(): Promise<{ token: string; lifetime: number }>;
  }

  interface AfricasTalkingClient {
    SMS: SMSClient;
    AIRTIME: AirtimeClient;
    PAYMENTS: PaymentsClient;
    VOICE: VoiceClient;
    TOKEN: TokenClient;
    fetchApplication(): Promise<ApplicationResponse>;
  }

  interface AfricasTalkingConfig {
    username: string;
    apiKey: string;
    environment?: 'sandbox' | 'production';
  }

  function africastalking(config: AfricasTalkingConfig): AfricasTalkingClient;

  export = africastalking;
}
