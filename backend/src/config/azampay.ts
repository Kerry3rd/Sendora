export const azampayConfig = {
  // Authentication URLs
  authUrls: {
    sandbox: 'https://authenticator-sandbox.azampay.co.tz',
    production: 'https://authenticator.azampay.co.tz'
  },
  
  // Checkout URLs
  checkoutUrls: {
    sandbox: 'https://sandbox.azampay.co.tz',
    production: 'https://checkout.azampay.co.tz'
  },
  
  // Supported mobile providers
  mobileProviders: [
    { name: 'AzamPesa', value: 'Azampesa' },
    { name: 'TigoPesa', value: 'Tigo' },
    { name: 'Airtel Money', value: 'Airtel' },
    { name: 'M-Pesa', value: 'Mpesa' },
    { name: 'HaloPesa', value: 'Halopesa' }
  ],
  
  // Supported banks
  bankProviders: [
    { name: 'CRDB Bank', value: 'CRDB' },
    { name: 'NMB Bank', value: 'NMB' }
  ],
  
  currency: 'TZS'
};
