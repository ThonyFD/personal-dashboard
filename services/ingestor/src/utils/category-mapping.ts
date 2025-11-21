/**
 * Category mapping from legacy string categories to category IDs
 * Maps the Category type strings to the categories table primary keys
 */

import { Category } from './categories';

/**
 * Map of category names to their database IDs
 * These IDs correspond to the records in the categories table
 */
export const CATEGORY_ID_MAP: Record<Category, number> = {
  'Food & Dining': 1,
  'Groceries': 2,
  'Transportation': 3,
  'Entertainment': 4,
  'Shopping': 5,
  'Bills & Utilities': 6,
  'Healthcare': 7,
  'Travel': 8,
  'Education': 9,
  'Services': 10,
  'Subscriptions': 11,
  'Transfers': 12,
  'Investment': 13,
  'Pago Mensual': 14,
  'Other': 15,
};

/**
 * Get the category ID for a given category string
 */
export function getCategoryId(category: Category): number {
  return CATEGORY_ID_MAP[category];
}

/**
 * Get the category ID for a merchant name (auto-categorize + convert to ID)
 */
export function autoCategorizeMerchantId(merchantName: string): number {
  const { autoCategorizeMerchant } = require('./categories');
  const category = autoCategorizeMerchant(merchantName);
  return getCategoryId(category);
}
