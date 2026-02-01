// Firebase Data Connect client for dashboard
import { dataConnect } from '../lib/firebase';
import {
  listTransactions,
  listMerchants,
  updateMerchantCategoryId,
} from '../generated/esm/index.esm.js';

// Types for dashboard
export interface Transaction {
  id: number;
  txn_type: string;
  channel: string;
  amount: number;
  currency: string | null;
  merchant_name: string | null;
  txn_date: string;
  txn_timestamp: string | null;
  provider: string;
  card_last4: string | null;
  description: string | null;
  merchant?: {
    name: string;
    categoryId: number | null;
    categoryRef?: {
      id: number;
      name: string;
      icon: string;
      color: string;
    };
  };
  email: {
    sender_email: string;
    subject: string | null;
    received_at: string;
  };
}

export interface Merchant {
  id: number;
  name: string;
  categoryId: number | null;
  categoryRef?: {
    id: number;
    name: string;
    icon: string;
    color: string;
  };
  transaction_count: number | null;
  total_amount: number | null;
  inDatabase?: boolean;
}

export interface Stats {
  total_transactions: number;
  total_amount: number;
  payment_amount: number;
  payment_count: number;
  purchase_amount: number;
  purchase_count: number;
  this_month_amount: number;
  this_month_transactions: number;
  top_merchant: string | null;
  top_merchant_amount: number;
  providers: { provider: string; count: number }[];
}

/**
 * Fetch all transactions
 */
export async function fetchTransactions(
  limit = 100,
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> {
  try {
    const result = await listTransactions(dataConnect, {
      limit,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    // Map Data Connect response to Transaction type
    return (result.data.transactions || []).map((edge) => ({
      id: edge.id,
      txn_type: edge.txnType,
      channel: edge.channel,
      amount: edge.amount,
      currency: edge.currency,
      merchant_name: edge.merchantName,
      txn_date: edge.txnDate,
      txn_timestamp: edge.txnTimestamp,
      provider: edge.provider,
      card_last4: edge.cardLast4,
      description: edge.description,
      merchant: edge.merchant ? {
        name: edge.merchant.name,
        categoryId: edge.merchant.categoryId,
        categoryRef: edge.merchant.categoryRef,
      } : undefined,
      email: {
        sender_email: edge.email.senderEmail,
        subject: edge.email.subject,
        received_at: edge.email.receivedAt,
      },
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Fetch merchants with pagination and search
 */
export async function fetchMerchantsPaginated(
  page = 1,
  pageSize = 50,
  searchTerm = '',
  categoryFilter = ''
): Promise<{ merchants: Merchant[]; totalCount: number; totalPages: number }> {
  try {
    // Get paginated merchants
    const offset = (page - 1) * pageSize;
    const merchantsResult = await listMerchants(dataConnect, {
      limit: pageSize,
      offset: offset,
      categoryId: categoryFilter ? parseInt(categoryFilter) : undefined,
      searchTerm: searchTerm || undefined,
    });

    const dbMerchants = merchantsResult.data.merchants || [];

    // Convert to our Merchant interface format
    const merchants: Merchant[] = dbMerchants.map((m: any) => ({
      id: m.id,
      name: m.name,
      categoryId: m.categoryId,
      categoryRef: m.categoryRef,
      transaction_count: m.transactionCount || 0,
      total_amount: m.totalAmount || 0,
      inDatabase: true, // All merchants from DB are in database
    }));

    // For now, estimate total count - in a real app you'd want a separate count query
    // This is a temporary solution until the generated SDK includes getMerchantsCount
    const totalCount = merchants.length < pageSize ? (page - 1) * pageSize + merchants.length : page * pageSize + 1;
    const totalPages = Math.ceil(totalCount / pageSize);

    console.log(`Fetched ${merchants.length} merchants (page ${page}, estimated total: ${totalCount})`);
    return { merchants, totalCount, totalPages };
  } catch (error) {
    console.error('Error fetching merchants:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility - returns all merchants without pagination
 * WARNING: This is expensive and should be replaced with fetchMerchantsPaginated
 */
export async function fetchMerchants(): Promise<Merchant[]> {
  try {
    // For backward compatibility, fetch all merchants in chunks
    const allMerchants: Merchant[] = [];
    let page = 1;
    const pageSize = 1000;

    while (true) {
      const { merchants, totalPages } = await fetchMerchantsPaginated(page, pageSize);
      allMerchants.push(...merchants);

      if (page >= totalPages) break;
      page++;
    }

    console.log(`Legacy fetch: Returning ${allMerchants.length} merchants`);
    return allMerchants;
  } catch (error) {
    console.error('Error fetching merchants:', error);
    throw error;
  }
}

/**
 * Fetch dashboard stats
 */
export async function fetchStats(startDate?: string, endDate?: string): Promise<Stats> {
  try {
    // Get transactions for the specified date range
    const allTransactions = await fetchTransactions(10000, startDate, endDate);

    console.log(`fetchStats: Got ${allTransactions.length} total transactions`);

    // Calculate stats
    const total_transactions = allTransactions.length;

    // Calculate separate totals for PAYMENT and PURCHASE
    let payment_amount = 0;
    let payment_count = 0;
    let purchase_amount = 0;
    let purchase_count = 0;

    allTransactions.forEach(txn => {
      if (txn.txn_type === 'PAYMENT') {
        payment_amount += txn.amount;
        payment_count += 1;
      } else if (txn.txn_type === 'PURCHASE') {
        purchase_amount += txn.amount;
        purchase_count += 1;
      }
    });

    const total_amount = payment_amount + purchase_amount;

    // Current month stats (only calculated if no date filter)
    let this_month_amount = 0;
    let this_month_transactions = 0;

    if (!startDate && !endDate) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthTransactions = allTransactions.filter(txn => {
        const txnDate = new Date(txn.txn_date);
        return txnDate >= firstDayOfMonth;
      });

      this_month_amount = monthTransactions.reduce((sum, txn) => {
        if (txn.txn_type === 'PURCHASE' || txn.txn_type === 'PAYMENT') {
          return sum + txn.amount;
        }
        return sum;
      }, 0);

      this_month_transactions = monthTransactions.length;
    } else {
      // When filtering by date, use the filtered amount as "period amount"
      this_month_amount = total_amount;
      this_month_transactions = total_transactions;
    }

    // Provider stats
    const providerMap = new Map<string, number>();
    allTransactions.forEach(txn => {
      providerMap.set(txn.provider, (providerMap.get(txn.provider) || 0) + 1);
    });

    const providers = Array.from(providerMap.entries()).map(([provider, count]) => ({
      provider,
      count,
    }));

    // Calculate top merchant by transaction count
    const merchantMap = new Map<string, { count: number; amount: number }>();
    allTransactions.forEach(txn => {
      const merchantName = txn.merchant_name || 'Unknown';
      if (!merchantMap.has(merchantName)) {
        merchantMap.set(merchantName, { count: 0, amount: 0 });
      }
      const merchant = merchantMap.get(merchantName)!;
      merchant.count += 1;
      if (txn.txn_type === 'PURCHASE' || txn.txn_type === 'PAYMENT') {
        merchant.amount += txn.amount;
      }
    });

    // Find merchant with most transactions
    let top_merchant: string | null = null;
    let top_merchant_amount = 0;
    let maxCount = 0;
    merchantMap.forEach((stats, merchantName) => {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        top_merchant = merchantName;
        top_merchant_amount = stats.amount;
      }
    });

    return {
      total_transactions,
      total_amount,
      payment_amount,
      payment_count,
      purchase_amount,
      purchase_count,
      this_month_amount,
      this_month_transactions,
      top_merchant,
      top_merchant_amount,
      providers,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}

/**
 * Update merchant category
 */
export async function updateMerchantCategoryById(merchantId: number, categoryId: number): Promise<void> {
  try {
    const result = await updateMerchantCategoryId(dataConnect, {
      id: merchantId,
      categoryId: categoryId,
    });
  } catch (error) {
    console.error('Error updating merchant category:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

// ============================================
// MONTHLY CONTROL FUNCTIONS
// ============================================

export interface MonthlyIncome {
  id: number;
  year: number;
  month: number;
  source: string;
  amount: number;
  notes?: string;
}

export interface ManualTransaction {
  id: number;
  year: number;
  month: number;
  day?: number;
  description: string;
  amount: number;
  transactionType?: string; // 'Inversión', 'Deuda', 'Ahorro', null
  paymentMethod?: string; // 'BG', 'TDC(BANISTMO)', etc
  isPaid: boolean;
  notes?: string;
  merchantId?: number;
  categoryId?: number;
}

/**
 * Fetch monthly incomes for a specific month
 */
export async function fetchMonthlyIncomes(year: number, month: number): Promise<MonthlyIncome[]> {
  try {
    const { getMonthlyIncomes } = await import('../generated/esm/index.esm.js');
    const result = await getMonthlyIncomes(dataConnect, { year, month });

    return (result.data.monthlyIncomes || []).map((income: any) => ({
      id: income.id,
      year: income.year,
      month: income.month,
      source: income.source,
      amount: income.amount,
      notes: income.notes,
    }));
  } catch (error) {
    console.error('Error fetching monthly incomes:', error);
    throw error;
  }
}

/**
 * Get the next available ID for monthly incomes
 * Queries the database for the max ID and returns max + 1
 */
async function getNextMonthlyIncomeId(): Promise<number> {
  try {
    const { getMaxMonthlyIncomeId } = await import('../generated/esm/index.esm.js');
    const result = await getMaxMonthlyIncomeId(dataConnect, {});

    const maxId = result.data.monthlyIncomes?.[0]?.id;
    // If no records exist, start from 1, otherwise increment max
    return maxId ? maxId + 1 : 1;
  } catch (error) {
    console.error('Error fetching max monthly income ID:', error);
    // Fallback to a safe starting ID if query fails
    return Date.now() % 1000000; // Use timestamp-based ID as fallback
  }
}

/**
 * Get the next available ID for manual transactions
 * Queries the database for the max ID and returns max + 1
 */
async function getNextManualTransactionId(): Promise<number> {
  try {
    const { getMaxManualTransactionId } = await import('../generated/esm/index.esm.js');
    const result = await getMaxManualTransactionId(dataConnect, {});

    const maxId = result.data.manualTransactions?.[0]?.id;
    // If no records exist, start from 1, otherwise increment max
    return maxId ? maxId + 1 : 1;
  } catch (error) {
    console.error('Error fetching max manual transaction ID:', error);
    // Fallback to a safe starting ID if query fails
    return Date.now() % 1000000; // Use timestamp-based ID as fallback
  }
}

/**
 * Create monthly income
 */
export async function createMonthlyIncome(income: Omit<MonthlyIncome, 'id'>): Promise<number> {
  try {
    const { createMonthlyIncome: createMutation } = await import('../generated/esm/index.esm.js');

    // Get the next available ID from the database
    const id = await getNextMonthlyIncomeId();

    await createMutation(dataConnect, {
      id,
      year: income.year,
      month: income.month,
      source: income.source,
      amount: income.amount,
      notes: income.notes || null,
    });

    return id;
  } catch (error) {
    console.error('Error creating monthly income:', error);
    throw error;
  }
}

/**
 * Update monthly income
 */
export async function updateMonthlyIncome(id: number, updates: Partial<MonthlyIncome>): Promise<void> {
  try {
    const { updateMonthlyIncome: updateMutation } = await import('../generated/esm/index.esm.js');

    await updateMutation(dataConnect, {
      id,
      source: updates.source || null,
      amount: updates.amount || null,
      notes: updates.notes || null,
    });
  } catch (error) {
    console.error('Error updating monthly income:', error);
    throw error;
  }
}

/**
 * Delete monthly income
 */
export async function deleteMonthlyIncome(id: number): Promise<void> {
  try {
    const { deleteMonthlyIncome: deleteMutation } = await import('../generated/esm/index.esm.js');

    await deleteMutation(dataConnect, { id });
  } catch (error) {
    console.error('Error deleting monthly income:', error);
    throw error;
  }
}

/**
 * Fetch manual transactions for a specific month
 */
export async function fetchManualTransactions(
  year: number,
  month: number,
  isPaid?: boolean
): Promise<ManualTransaction[]> {
  try {
    const { getManualTransactions } = await import('../generated/esm/index.esm.js');

    // Build variables - only include isPaid if it's explicitly set (not undefined)
    // Passing null causes the filter to not match any records
    const variables: any = { year, month };
    if (isPaid !== undefined) {
      variables.isPaid = isPaid;
    }

    const result = await getManualTransactions(dataConnect, variables);

    return (result.data.manualTransactions || []).map((txn: any) => ({
      id: txn.id,
      year: txn.year,
      month: txn.month,
      day: txn.day,
      description: txn.description,
      amount: txn.amount,
      transactionType: txn.transactionType,
      paymentMethod: txn.paymentMethod,
      isPaid: txn.isPaid,
      notes: txn.notes,
      merchantId: txn.merchantId,
      categoryId: txn.categoryId,
    }));
  } catch (error) {
    console.error('Error fetching manual transactions:', error);
    throw error;
  }
}

/**
 * Create manual transaction
 */
export async function createManualTransaction(transaction: Omit<ManualTransaction, 'id'>): Promise<number> {
  try {
    const { createManualTransaction: createMutation } = await import('../generated/esm/index.esm.js');

    // Get the next available ID from the database
    const id = await getNextManualTransactionId();

    await createMutation(dataConnect, {
      id,
      year: transaction.year,
      month: transaction.month,
      day: transaction.day || null,
      description: transaction.description,
      amount: transaction.amount,
      transactionType: transaction.transactionType || null,
      paymentMethod: transaction.paymentMethod || null,
      isPaid: transaction.isPaid,
      notes: transaction.notes || null,
      merchantId: transaction.merchantId || null,
      categoryId: transaction.categoryId || null,
    });

    return id;
  } catch (error) {
    console.error('Error creating manual transaction:', error);
    throw error;
  }
}

/**
 * Update manual transaction
 */
export async function updateManualTransaction(id: number, updates: Partial<ManualTransaction>): Promise<void> {
  try {
    const { updateManualTransaction: updateMutation } = await import('../generated/esm/index.esm.js');

    await updateMutation(dataConnect, {
      id,
      day: updates.day !== undefined ? updates.day : null,
      description: updates.description || null,
      amount: updates.amount || null,
      transactionType: updates.transactionType !== undefined ? updates.transactionType : null,
      paymentMethod: updates.paymentMethod !== undefined ? updates.paymentMethod : null,
      isPaid: updates.isPaid !== undefined ? updates.isPaid : null,
      notes: updates.notes !== undefined ? updates.notes : null,
      merchantId: updates.merchantId !== undefined ? updates.merchantId : null,
      categoryId: updates.categoryId !== undefined ? updates.categoryId : null,
    });
  } catch (error) {
    console.error('Error updating manual transaction:', error);
    throw error;
  }
}

/**
 * Delete manual transaction
 */
export async function deleteManualTransaction(id: number): Promise<void> {
  try {
    const { deleteManualTransaction: deleteMutation } = await import('../generated/esm/index.esm.js');

    await deleteMutation(dataConnect, { id });
  } catch (error) {
    console.error('Error deleting manual transaction:', error);
    throw error;
  }
}

/**
 * Toggle paid status of a manual transaction
 */
export async function toggleManualTransactionPaidStatus(id: number, isPaid: boolean): Promise<void> {
  try {
    const { updateManualTransactionPaidStatus } = await import('../generated/esm/index.esm.js');

    await updateManualTransactionPaidStatus(dataConnect, { id, isPaid });
  } catch (error) {
    console.error('Error toggling manual transaction paid status:', error);
    throw error;
  }
}

/**
 * Export transactions as CSV
 */
export async function exportTransactionsCSV(startDate?: string, endDate?: string): Promise<Blob> {
  try {
    const transactions = await fetchTransactions(1000);

    // Filter by date if provided
    let filtered = transactions;
    if (startDate || endDate) {
      filtered = transactions.filter(txn => {
        const txnDate = new Date(txn.txn_date);
        if (startDate && txnDate < new Date(startDate)) return false;
        if (endDate && txnDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Create CSV
    const headers = ['Date', 'Merchant', 'Type', 'Channel', 'Amount', 'Currency', 'Provider', 'Card', 'Description'];
    const rows = filtered.map(txn => [
      txn.txn_date,
      txn.merchant_name || '',
      txn.txn_type,
      txn.channel,
      txn.amount.toString(),
      txn.currency || 'USD',
      txn.provider,
      txn.card_last4 || '',
      txn.description || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  } catch (error) {
    console.error('Error exporting transactions:', error);
    throw error;
  }
}

// ============================================
// PUSH NOTIFICATION FUNCTIONS
// ============================================

/**
 * Create push subscription
 */
export async function createPushSubscription(data: {
  id: number;
  userEmail: string;
  endpoint: string;
  keys: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const { createPushSubscription: createMutation } = await import('../generated/esm/index.esm.js');

    await createMutation(dataConnect, {
      id: data.id,
      userEmail: data.userEmail,
      endpoint: data.endpoint,
      keys: data.keys,
      userAgent: data.userAgent || null,
    });
  } catch (error) {
    console.error('Error creating push subscription:', error);
    throw error;
  }
}

/**
 * Deactivate push subscription
 */
export async function deactivatePushSubscription(data: {
  id: number;
}): Promise<void> {
  try {
    const { deactivatePushSubscription: updateMutation } = await import('../generated/esm/index.esm.js');

    await updateMutation(dataConnect, {
      id: data.id,
    });
  } catch (error) {
    console.error('Error deactivating push subscription:', error);
    throw error;
  }
}

/**
 * Get active push subscriptions for a user
 */
export async function getActivePushSubscriptions(data: {
  userEmail: string;
}): Promise<any> {
  try {
    const { getActivePushSubscriptions: query } = await import('../generated/esm/index.esm.js');

    return await query(dataConnect, {
      userEmail: data.userEmail,
    });
  } catch (error) {
    console.error('Error getting active push subscriptions:', error);
    throw error;
  }
}

/**
 * Get maximum push subscription ID
 */
export async function getMaxPushSubscriptionId(): Promise<any> {
  try {
    const { getMaxPushSubscriptionId: query } = await import('../generated/esm/index.esm.js');

    return await query(dataConnect, {});
  } catch (error) {
    console.error('Error getting max push subscription ID:', error);
    // Fallback to a safe starting ID if query fails
    return { data: { pushSubscriptions: [{ id: Date.now() % 1000000 }] } };
  }
}
