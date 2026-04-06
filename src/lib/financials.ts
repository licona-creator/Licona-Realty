/**
 * Financial constants and helper functions for Licona Realty.
 * Single source of truth for commission math, goals, and expenses.
 */

export const FINANCIALS = {
  ANNUAL_COMMISSION_GOAL: 63000,
  DEALS_GOAL: 7,
  AVG_COMMISSION: 9000,
  CMR_MONTHLY_FEE: 100,
  CMR_TRANSACTION_FEE: 100,
  ANA_REFERRAL_OVER_250K: 1000,
  ANA_REFERRAL_UNDER_250K: 500,
  ANNUAL_EXPENSES: {
    cmr_broker: { amount: 1200, label: 'Central Metro Realty (monthly)', frequency: 'yearly' },
    metrotex: { amount: 570, label: 'MetroTex Dues (MLS + Supra Key)', frequency: 'yearly' },
    trec: { amount: 110, label: 'TREC License Renewal', frequency: 'every 2 years' },
    everlance: { amount: 75, label: 'Everlance', frequency: 'yearly' },
    supabase: { amount: 300, label: 'Supabase Pro', frequency: 'yearly' },
    vercel: { amount: 240, label: 'Vercel Pro', frequency: 'yearly' },
    anthropic: { amount: 144, label: 'Anthropic API', frequency: 'yearly' },
    canva: { amount: 240, label: 'Canva Business', frequency: 'yearly' },
  },
  TOTAL_FIXED_ANNUAL: 2879,
  PER_DEAL_COST: 100,
} as const;

export function calculateTrueNet(grossCommission: number, referralFee: number): number {
  return grossCommission - referralFee - FINANCIALS.CMR_TRANSACTION_FEE;
}

export function getAnaReferralFee(salePrice: number): number {
  return salePrice >= 250000 ? FINANCIALS.ANA_REFERRAL_OVER_250K : FINANCIALS.ANA_REFERRAL_UNDER_250K;
}

export function getYTDCommission(transactions: Array<{ status: string; closing_date: string | null; commission_net?: number | string | null }>): number {
  const currentYear = new Date().getFullYear();
  return transactions
    .filter(t => t.status === 'closed' && t.closing_date && new Date(t.closing_date).getFullYear() === currentYear)
    .reduce((sum, t) => sum + (parseFloat(String(t.commission_net || '0')) - FINANCIALS.CMR_TRANSACTION_FEE), 0);
}

export function getDealsClosedCount(transactions: Array<{ status: string; closing_date: string | null }>): number {
  const currentYear = new Date().getFullYear();
  return transactions.filter(t => t.status === 'closed' && t.closing_date && new Date(t.closing_date).getFullYear() === currentYear).length;
}

export function getPendingIncome(transactions: Array<{ status: string; commission_net?: number | string | null }>): number {
  return transactions
    .filter(t => t.status !== 'closed' && t.status !== 'cancelled' && t.status !== 'lost')
    .reduce((sum, t) => sum + Math.max(0, parseFloat(String(t.commission_net || '0')) - FINANCIALS.CMR_TRANSACTION_FEE), 0);
}

export function getActiveDealsCount(transactions: Array<{ status: string }>): number {
  return transactions.filter(t => t.status !== 'closed' && t.status !== 'cancelled' && t.status !== 'lost').length;
}
