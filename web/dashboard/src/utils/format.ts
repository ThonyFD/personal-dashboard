import { DEBIT_TYPES } from '@personal-dashboard/supabase-queries'

/**
 * Whether a transaction type represents money coming in (INCOME, REFUND, …).
 * Everything in DEBIT_TYPES is money going out.
 */
export function isCredit(txnType: string): boolean {
  return !DEBIT_TYPES.has(txnType)
}

/**
 * Format a transaction amount with a leading +/- sign based on its direction.
 * Credits (income/refunds) get "+", debits (spending) get "-".
 */
export function formatSignedAmount(txnType: string, amount: number, decimals: number = 2): string {
  const sign = isCredit(txnType) ? '+' : '-'
  return `${sign}$${formatCurrency(Math.abs(amount), decimals)}`
}

/**
 * Accent color for a transaction amount. INCOME uses the brand positive green;
 * other types fall back to the default text color (undefined → inherit).
 */
export function amountColor(txnType: string): string | undefined {
  return txnType === 'INCOME' ? '#39FF14' : undefined
}

/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with commas
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a number as compact currency (e.g., 1.2K, 1.5M)
 * @param value - The number to format
 * @returns Compact formatted string
 */
export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
