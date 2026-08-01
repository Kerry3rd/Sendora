/**
 * Currency utility for Tanzanian Shillings (TZS)
 * Uses centralized pricing configuration
 */

import { PRICING } from '../config/pricing';

// Exchange rate from pricing config
export const USD_TO_TZS_RATE = PRICING.exchangeRate.USD_TO_TZS;

// Format TZS with proper thousand separators
export const formatTZS = (amount: number): string => {
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('TZS', 'TSh').trim();
};

// Format TZS without currency symbol (for tables)
export const formatTZSCompact = (amount: number): string => {
  return new Intl.NumberFormat('sw-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' TSh';
};

// Convert USD to TZS using exchange rate from pricing
export const usdToTZS = (usdAmount: number): number => {
  return Math.round(usdAmount * USD_TO_TZS_RATE);
};

// Convert TZS to USD
export const tzsToUSD = (tzsAmount: number): number => {
  return tzsAmount / USD_TO_TZS_RATE;
};

// Format cost from USD
export const formatCostFromUSD = (usdAmount: number): string => {
  return formatTZS(usdToTZS(usdAmount));
};

// Format cost from USD for tables (compact)
export const formatCostFromUSDCompact = (usdAmount: number): string => {
  return formatTZSCompact(usdToTZS(usdAmount));
};

// Format cost directly in TZS (if amount is already in TZS)
export const formatCostInTZS = (tzsAmount: number): string => {
  return formatTZS(tzsAmount);
};

// Format cost directly in TZS compact (for tables)
export const formatCostInTZSCompact = (tzsAmount: number): string => {
  return formatTZSCompact(tzsAmount);
};

// Format average cost per message (for displaying rates)
export const formatAvgCost = (usdAmount: number): string => {
  const tzsAmount = usdToTZS(usdAmount);
  return `${new Intl.NumberFormat('sw-TZ').format(tzsAmount)} TSh`;
};

// Format average cost per message directly in TZS
export const formatAvgCostInTZS = (tzsAmount: number): string => {
  return `${new Intl.NumberFormat('sw-TZ').format(tzsAmount)} TSh`;
};

// Calculate SMS cost based on quantity using pricing tiers
export const calculateSMSCostInTZS = (quantity: number, isTanzania: boolean = true): number => {
  if (!isTanzania) {
    // For international, use the default international rate and convert to TZS
    return quantity * PRICING.international.default * USD_TO_TZS_RATE;
  }
  
  // Tanzania pricing tiers from PRICING config
  if (quantity <= PRICING.tanzania.tier1.max) {
    return quantity * PRICING.tanzania.tier1.price;
  }
  if (quantity <= PRICING.tanzania.tier2.max) {
    return quantity * PRICING.tanzania.tier2.price;
  }
  if (quantity <= PRICING.tanzania.tier3.max) {
    return quantity * PRICING.tanzania.tier3.price;
  }
  return quantity * PRICING.tanzania.tier4.price;
};

// Format SMS cost with breakdown (for tooltips/details)
export const formatSMSCostWithBreakdown = (quantity: number, isTanzania: boolean = true): string => {
  const totalCost = calculateSMSCostInTZS(quantity, isTanzania);
  const perMessageCost = Math.round(totalCost / quantity);
  
  return `${formatCostInTZS(totalCost)} (${formatAvgCostInTZS(perMessageCost)} × ${quantity.toLocaleString()} messages)`;
};

// Get price per SMS for a given quantity (in TZS)
export const getPricePerSMSInTZS = (quantity: number, isTanzania: boolean = true): number => {
  if (!isTanzania) {
    return PRICING.international.default * USD_TO_TZS_RATE;
  }
  
  if (quantity <= PRICING.tanzania.tier1.max) {
    return PRICING.tanzania.tier1.price;
  }
  if (quantity <= PRICING.tanzania.tier2.max) {
    return PRICING.tanzania.tier2.price;
  }
  if (quantity <= PRICING.tanzania.tier3.max) {
    return PRICING.tanzania.tier3.price;
  }
  return PRICING.tanzania.tier4.price;
};

// Format price per SMS
export const formatPricePerSMS = (quantity: number, isTanzania: boolean = true): string => {
  const price = getPricePerSMSInTZS(quantity, isTanzania);
  return formatAvgCostInTZS(price);
};