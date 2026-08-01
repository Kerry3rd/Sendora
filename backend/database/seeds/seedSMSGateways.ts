import SMSGateway from '../../src/models/SMSGateway';

type GatewayStatus = 'active' | 'inactive' | 'maintenance';
type GatewayType = 'http' | 'smpp' | 'api';

const seedSMSGateways = async (): Promise<void> => {
  console.log('🌱 Seeding SMS Gateways...');

  const gateways = [
    // ==================== TIER 1: GLOBAL PROVIDERS ====================
    {
      name: 'Twilio Global Gateway',
      provider: 'Twilio',
      type: 'http' as GatewayType,
      priority: 1,
      isEnabled: process.env.TWILIO_ACCOUNT_SID ? true : false,
      status: (process.env.TWILIO_ACCOUNT_SID ? 'active' : 'inactive') as GatewayStatus,
      config: {
        baseUrl: 'https://api.twilio.com/2010-04-01',
        timeout: 10000,
        retryAttempts: 3,
        maxConcurrentRequests: 10,
        requestDelay: 100,
        useSSL: true,
        validateSSL: true,
        encoding: 'utf-8',
        logLevel: 'info',
        enableCompression: true,
      },
      credentials: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
        messagingServiceSid: '',
        statusCallbackUrl: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/v1/webhooks/twilio`,
      },
      balance: 500,
      currency: 'USD',
      smsCost: 0.0079,
      mmsCost: 0.02,
      unicodeCostMultiplier: 2.0,
      region: 'global',
      supportsDeliveryReports: true,
      supportsUnicode: true,
      supportsFlash: true,
      supportsLongMessages: true,
      supportsScheduledSMS: true,
      maxMessageLength: 1600,
      maxMessagesPerSecond: 1,
      dailyMessageLimit: 10000,
      metadata: {
        website: 'https://www.twilio.com',
        documentation: 'https://www.twilio.com/docs/sms',
        apiVersion: '2010-04-01',
        features: [
          'Two-way SMS',
          'MMS',
          'Voice',
          'WhatsApp',
          'Alphanumeric Sender ID',
          'SMS Forwarding',
          'Short Codes',
          'Toll-free Numbers'
        ],
        supportedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'DK', 'SE', 'NO', 'FI'],
        reliability: '99.95%',
        setupRequired: true,
        verificationRequired: true,
        notes: 'Best for global coverage and advanced features',
      },
    },
    {
      name: 'MessageBird International',
      provider: 'MessageBird',
      type: 'http' as GatewayType,
      priority: 2,
      isEnabled: process.env.MESSAGEBIRD_API_KEY ? true : false,
      status: (process.env.MESSAGEBIRD_API_KEY ? 'active' : 'inactive') as GatewayStatus,
      config: {
        baseUrl: 'https://rest.messagebird.com',
        timeout: 10000,
        retryAttempts: 3,
        maxConcurrentRequests: 20,
        requestDelay: 50,
        useSSL: true,
        validateSSL: true,
        encoding: 'utf-8',
        logLevel: 'info',
      },
      credentials: {
        apiKey: process.env.MESSAGEBIRD_API_KEY || '',
        fromName: 'SENDORA',
        fromNumber: '',
        reportUrl: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/v1/webhooks/messagebird`,
        validity: 3600,
      },
      balance: 1000,
      currency: 'EUR',
      smsCost: 0.005,
      mmsCost: 0.015,
      unicodeCostMultiplier: 1.5,
      region: 'global',
      supportsDeliveryReports: true,
      supportsUnicode: true,
      supportsFlash: false,
      supportsLongMessages: true,
      supportsScheduledSMS: true,
      maxMessageLength: 459,
      maxMessagesPerSecond: 10,
      dailyMessageLimit: 50000,
      metadata: {
        website: 'https://messagebird.com',
        documentation: 'https://developers.messagebird.com/docs',
        apiVersion: 'v1',
        features: [
          'Two-way SMS',
          'MMS',
          'Voice',
          'Chat API',
          'Verify API',
          'Lookup API',
          'Alphanumeric Sender ID'
        ],
        supportedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'AU', 'SG', 'HK'],
        reliability: '99.9%',
        setupRequired: true,
        verificationRequired: false,
        notes: 'Good for Europe and Asia with competitive pricing',
      },
    },
    // ==================== TIER 2: REGIONAL PROVIDERS ====================
    {
      name: 'Africas Talking - East Africa',
      provider: 'AfricasTalking',
      type: 'http' as GatewayType,
      priority: 3,
      isEnabled: false,
      status: 'inactive' as GatewayStatus,
      config: {
        baseUrl: 'https://api.africastalking.com/version1',
        timeout: 15000,
        retryAttempts: 5,
        maxConcurrentRequests: 5,
        requestDelay: 200,
        useSSL: true,
        validateSSL: true,
        encoding: 'utf-8',
      },
      credentials: {
        apiKey: '',
        username: '',
        from: 'SENDORA',
        bulkSMSMode: 1,
        enqueue: 0,
      },
      balance: 0,
      currency: 'KES',
      smsCost: 0.008,
      mmsCost: 0.03,
      unicodeCostMultiplier: 1.0,
      region: 'east-africa',
      supportsDeliveryReports: true,
      supportsUnicode: true,
      supportsFlash: false,
      supportsLongMessages: true,
      supportsScheduledSMS: false,
      maxMessageLength: 160,
      maxMessagesPerSecond: 10,
      dailyMessageLimit: 100000,
      metadata: {
        website: 'https://africastalking.com',
        documentation: 'https://developers.africastalking.com',
        features: [
          'SMS',
          'Voice',
          'Airtime',
          'USSD',
          'Payments',
          'Voice Calls'
        ],
        supportedCountries: ['KE', 'UG', 'TZ', 'RW', 'NG', 'GH', 'ET', 'ZM', 'MW'],
        coverage: 'Best for East African countries',
        reliability: '99.8%',
        setupRequired: true,
        verificationRequired: true,
        notes: 'Excellent for Tanzania, Kenya, Uganda, Rwanda',
      },
    },
    {
      name: 'Vonage (Nexmo) Global',
      provider: 'Vonage',
      type: 'http' as GatewayType,
      priority: 4,
      isEnabled: process.env.NEXMO_API_KEY ? true : false,
      status: 'inactive' as GatewayStatus,
      config: {
        baseUrl: 'https://rest.nexmo.com',
        timeout: 10000,
        retryAttempts: 3,
        maxConcurrentRequests: 15,
        requestDelay: 100,
        useSSL: true,
        validateSSL: true,
      },
      credentials: {
        apiKey: process.env.NEXMO_API_KEY || '',
        apiSecret: process.env.NEXMO_API_SECRET || '',
        fromNumber: '',
        statusReportReq: 1,
        callbackUrl: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/v1/webhooks/nexmo`,
      },
      balance: 0,
      currency: 'USD',
      smsCost: 0.0055,
      mmsCost: 0.025,
      unicodeCostMultiplier: 1.8,
      region: 'global',
      supportsDeliveryReports: true,
      supportsUnicode: true,
      supportsFlash: true,
      supportsLongMessages: true,
      supportsScheduledSMS: true,
      maxMessageLength: 160,
      maxMessagesPerSecond: 1,
      dailyMessageLimit: 20000,
      metadata: {
        website: 'https://vonage.com',
        documentation: 'https://developer.nexmo.com',
        features: [
          'SMS',
          'Voice',
          'Video',
          'Verify API',
          'Number Insight',
          'Messages API'
        ],
        supportedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'AU', 'JP', 'SG'],
        reliability: '99.95%',
        setupRequired: true,
        verificationRequired: true,
      },
    },
    {
      name: 'Plivo International',
      provider: 'Plivo',
      type: 'http' as GatewayType,
      priority: 5,
      isEnabled: process.env.PLIVO_AUTH_ID ? true : false,
      status: 'inactive' as GatewayStatus,
      config: {
        baseUrl: 'https://api.plivo.com/v1/Account',
        timeout: 10000,
        retryAttempts: 3,
        maxConcurrentRequests: 20,
        requestDelay: 50,
        useSSL: true,
        validateSSL: true,
      },
      credentials: {
        authId: process.env.PLIVO_AUTH_ID || '',
        authToken: process.env.PLIVO_AUTH_TOKEN || '',
        fromNumber: '',
        answerMethod: 'POST',
        answerUrl: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/v1/webhooks/plivo`,
      },
      balance: 0,
      currency: 'USD',
      smsCost: 0.0035,
      mmsCost: 0.015,
      unicodeCostMultiplier: 1.2,
      region: 'global',
      supportsDeliveryReports: true,
      supportsUnicode: true,
      supportsFlash: false,
      supportsLongMessages: true,
      supportsScheduledSMS: true,
      maxMessageLength: 1600,
      maxMessagesPerSecond: 20,
      dailyMessageLimit: 100000,
      metadata: {
        website: 'https://www.plivo.com',
        documentation: 'https://www.plivo.com/docs',
        features: [
          'SMS',
          'Voice',
          'Two-factor authentication',
          'Phone Numbers',
          'Call Tracking'
        ],
        supportedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'AU'],
        reliability: '99.9%',
        setupRequired: true,
        verificationRequired: false,
        notes: 'Very competitive pricing for bulk SMS',
      },
    },
    // ==================== TIER 3: LOCAL TANZANIAN PROVIDERS ====================
    {
      name: 'Tigo Tanzania Direct',
      provider: 'Tigo',
      type: 'smpp' as GatewayType,
      priority: 10,
      isEnabled: false,
      status: 'inactive' as GatewayStatus,
      config: {
        host: 'smpp.tigo.co.tz',
        port: 2775,
        systemType: 'smpp',
        interfaceVersion: '3.4',
        sourceAddrTon: 5,
        sourceAddrNpi: 0,
        destAddrTon: 1,
        destAddrNpi: 1,
        encoding: 'gsm',
        enquireLinkInterval: 30000,
        reconnectInterval: 5000,
      },
      credentials: {
        systemId: 'your_tigo_system_id',
        password: 'your_tigo_password',
        systemType: 'SMPP',
        fromNumber: '',
        serviceType: '',
      },
      balance: 0,
      currency: 'TZS',
      smsCost: 0.02,
      mmsCost: 0.10,
      unicodeCostMultiplier: 1.0,
      region: 'tanzania',
      supportsDeliveryReports: true,
      supportsUnicode: false,
      supportsFlash: false,
      supportsLongMessages: false,
      supportsScheduledSMS: false,
      maxMessageLength: 160,
      maxMessagesPerSecond: 100,
      dailyMessageLimit: 1000000,
      metadata: {
        website: 'https://www.tigo.co.tz',
        features: ['Direct SMPP Connection'],
        supportedCountries: ['TZ'],
        coverage: 'Tanzania only',
        reliability: '99.5%',
        setupRequired: true,
        verificationRequired: true,
        contractRequired: true,
        notes: 'Direct connection for lowest cost in Tanzania',
      },
    },
    {
      name: 'Vodacom Tanzania SMPP',
      provider: 'Vodacom',
      type: 'smpp' as GatewayType,
      priority: 11,
      isEnabled: false,
      status: 'inactive' as GatewayStatus,
      config: {
        host: 'smpp.vodacom.co.tz',
        port: 2775,
        systemType: 'smpp',
        interfaceVersion: '3.4',
        sourceAddrTon: 5,
        sourceAddrNpi: 0,
        destAddrTon: 1,
        destAddrNpi: 1,
        encoding: 'gsm',
        enquireLinkInterval: 30000,
        reconnectInterval: 5000,
      },
      credentials: {
        systemId: 'your_vodacom_system_id',
        password: 'your_vodacom_password',
        systemType: 'SMPP',
        fromNumber: '',
        serviceType: '',
      },
      balance: 0,
      currency: 'TZS',
      smsCost: 0.021,
      mmsCost: 0.11,
      unicodeCostMultiplier: 1.0,
      region: 'tanzania',
      supportsDeliveryReports: true,
      supportsUnicode: false,
      supportsFlash: false,
      supportsLongMessages: false,
      supportsScheduledSMS: false,
      maxMessageLength: 160,
      maxMessagesPerSecond: 100,
      dailyMessageLimit: 1000000,
      metadata: {
        website: 'https://www.vodacom.co.tz',
        features: ['Direct SMPP Connection'],
        supportedCountries: ['TZ'],
        coverage: 'Tanzania only',
        reliability: '99.6%',
        setupRequired: true,
        verificationRequired: true,
        contractRequired: true,
        notes: 'Largest network in Tanzania',
      },
    },
    {
      name: 'Airtel Tanzania Direct',
      provider: 'Airtel',
      type: 'smpp' as GatewayType,
      priority: 12,
      isEnabled: false,
      status: 'inactive' as GatewayStatus,
      config: {
        host: 'smpp.airtel.co.tz',
        port: 2775,
        systemType: 'smpp',
        interfaceVersion: '3.4',
        sourceAddrTon: 5,
        sourceAddrNpi: 0,
        destAddrTon: 1,
        destAddrNpi: 1,
        encoding: 'gsm',
        enquireLinkInterval: 30000,
        reconnectInterval: 5000,
      },
      credentials: {
        systemId: 'your_airtel_system_id',
        password: 'your_airtel_password',
        systemType: 'SMPP',
        fromNumber: '',
        serviceType: '',
      },
      balance: 0,
      currency: 'TZS',
      smsCost: 0.019,
      mmsCost: 0.09,
      unicodeCostMultiplier: 1.0,
      region: 'tanzania',
      supportsDeliveryReports: true,
      supportsUnicode: false,
      supportsFlash: false,
      supportsLongMessages: false,
      supportsScheduledSMS: false,
      maxMessageLength: 160,
      maxMessagesPerSecond: 80,
      dailyMessageLimit: 800000,
      metadata: {
        website: 'https://www.airtel.co.tz',
        features: ['Direct SMPP Connection'],
        supportedCountries: ['TZ'],
        coverage: 'Tanzania only',
        reliability: '99.4%',
        setupRequired: true,
        verificationRequired: true,
        contractRequired: true,
        notes: 'Competitive pricing for Tanzanian market',
      },
    },
    // ==================== TIER 999: TESTING & DEVELOPMENT ====================
    {
      name: 'Virtual Test Gateway',
      provider: 'Virtual',
      type: 'api' as GatewayType,
      priority: 999,
      isEnabled: true,
      status: 'active' as GatewayStatus,
      config: {
        simulatedDelay: 100,
        successRate: 0.95,
        responseTime: 50,
        simulateFailures: true,
        failureRate: 0.05,
        simulateDeliveryReports: true,
        deliveryReportDelay: 5000,
        simulateBalance: true,
        initialBalance: 10000,
        costPerSMS: 0.01,
      },
      credentials: {},
      balance: 10000,
      currency: 'USD',
      smsCost: 0.01,
      mmsCost: 0.05,
      unicodeCostMultiplier: 1.0,
      region: 'global',
      supportsDeliveryReports: true,
      supportsUnicode: true,
      supportsFlash: true,
      supportsLongMessages: true,
      supportsScheduledSMS: true,
      maxMessageLength: 1000,
      maxMessagesPerSecond: 1000,
      dailyMessageLimit: 1000000,
      metadata: {
        description: 'Virtual gateway for testing and development purposes',
        features: [
          'Testing',
          'Development',
          'No real SMS sent',
          'Simulated responses',
          'Cost simulation',
          'Delivery report simulation'
        ],
        supportedCountries: ['ALL'],
        reliability: '100%',
        setupRequired: false,
        verificationRequired: false,
        notes: 'Use this gateway for testing. No real SMS will be sent.',
        warning: 'FOR DEVELOPMENT AND TESTING ONLY',
      },
    },
    {
      name: 'Dev Null Gateway',
      provider: 'DevNull',
      type: 'api' as GatewayType,
      priority: 1000,
      isEnabled: true,
      status: 'active' as GatewayStatus,
      config: {
        immediateResponse: true,
        alwaysSucceed: true,
        noDelay: true,
        logMessages: true,
        storeInDatabase: true,
      },
      credentials: {},
      balance: 999999,
      currency: 'USD',
      smsCost: 0,
      mmsCost: 0,
      unicodeCostMultiplier: 1.0,
      region: 'global',
      supportsDeliveryReports: true,
      supportsUnicode: true,
      supportsFlash: true,
      supportsLongMessages: true,
      supportsScheduledSMS: true,
      maxMessageLength: 10000,
      maxMessagesPerSecond: 10000,
      dailyMessageLimit: 10000000,
      metadata: {
        description: 'Development gateway that immediately succeeds',
        features: [
          'Instant success',
          'No cost',
          'Unlimited messages',
          'Perfect for development'
        ],
        supportedCountries: ['ALL'],
        reliability: '100%',
        setupRequired: false,
        notes: 'All messages immediately marked as delivered',
      },
    },
  ];

  try {
    // Clear existing gateways
    const deletedCount = await SMSGateway.destroy({ where: {} });
    console.log(`🗑️  Cleared ${deletedCount} existing gateways`);
    
    // Create new gateways
    for (const gateway of gateways) {
      await SMSGateway.create(gateway);
      const status = gateway.isEnabled ? '✅' : '⏸️';
      console.log(`${status} Created gateway: ${gateway.name} (${gateway.provider})`);
    }
    
    console.log(`✅ SMS Gateways seeded: ${gateways.length} gateways created`);
    
    // Print summary
    console.log('\n📊 Gateway Configuration Summary:');
    console.log('=' .repeat(70));
    
    const enabledGateways = gateways.filter(g => g.isEnabled);
    const disabledGateways = gateways.filter(g => !g.isEnabled);
    
    console.log(`\n🔵 ENABLED GATEWAYS (${enabledGateways.length}):`);
    enabledGateways.forEach((gateway, index) => {
      console.log(`\n${index + 1}. ${gateway.name}`);
      console.log(`   Provider: ${gateway.provider}`);
      console.log(`   Priority: ${gateway.priority}`);
      console.log(`   Region: ${gateway.region}`);
      console.log(`   Cost/SMS: ${gateway.smsCost} ${gateway.currency}`);
      console.log(`   Status: ${gateway.status}`);
      if (gateway.metadata.notes) {
        console.log(`   Note: ${gateway.metadata.notes}`);
      }
    });
    
    console.log(`\n⚫ DISABLED GATEWAYS (${disabledGateways.length}):`);
    disabledGateways.forEach((gateway, index) => {
      console.log(`\n${index + 1}. ${gateway.name}`);
      console.log(`   Provider: ${gateway.provider}`);
      console.log(`   Reason: ${gateway.metadata.notes || 'Not configured'}`);
    });
    
    console.log('\n' + '=' .repeat(70));
    console.log('\n💡 Configuration Tips:');
    console.log('1. Virtual Gateway is enabled by default for testing');
    console.log('2. Enable Twilio/MessageBird by adding credentials to .env');
    console.log('3. For Tanzania, configure local SMPP connections');
    console.log('4. Priority 1 is highest, 999 is lowest');
    
  } catch (error) {
    console.error('❌ Error seeding SMS gateways:', error);
    throw error;
  }
};

export default seedSMSGateways;
