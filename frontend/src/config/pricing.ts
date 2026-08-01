export const PRICING = {
  // Tanzania pricing (in TZS)
  tanzania: {
    payg: 58,           // Pay-as-you-go per SMS
    tier1: { min: 1, max: 500, price: 58 },
    tier2: { min: 501, max: 2500, price: 54 },
    tier3: { min: 2501, max: 10000, price: 50 },
    tier4: { min: 10001, max: Infinity, price: 46 },
  },
  
  // Credit packages
  packages: [
    { id: 'basic', credits: 500, price: 26000, pricePerSMS: 52 },
    { id: 'popular', credits: 2000, price: 96000, pricePerSMS: 48 },
    { id: 'business', credits: 5000, price: 210000, pricePerSMS: 42 },
    { id: 'enterprise', credits: 20000, price: 760000, pricePerSMS: 38 },
  ],
  
  // International pricing (in USD)
  international: {
    africa: 0.03,
    americas: 0.025,
    europe: 0.03,
    asia: 0.03,
    oceania: 0.03,
    default: 0.04,
  },
  
  // Currency conversion (approximate)
  exchangeRate: {
    TZS_TO_USD: 0.00038,  // 1 TZS = $0.00038
    USD_TO_TZS: 2630,      // $1 = 2,630 TZS
  },
};

// Helper function to calculate SMS cost in TZS
export function calculateSMSCost(quantity: number, isTanzania: boolean): number {
  if (!isTanzania) {
    // For international, convert USD to TZS
    return quantity * PRICING.international.default * PRICING.exchangeRate.USD_TO_TZS;
  }
  
  // Tanzania pricing tiers
  if (quantity <= 500) return quantity * 52;
  if (quantity <= 2500) return quantity * 48;
  if (quantity <= 10000) return quantity * 42;
  return quantity * 38;
}

// Get package details
export function getPackage(packageId: string) {
  return PRICING.packages.find(p => p.id === packageId);
}
