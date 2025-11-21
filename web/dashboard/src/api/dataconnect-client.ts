// Firebase Data Connect client for dashboard
import { initializeApp, getApps } from 'firebase/app';
import { getDataConnect } from 'firebase/data-connect';
import {
  connectorConfig,
  listTransactions,
  listMerchants,
  updateMerchantCategoryId,
} from '../generated/esm/index.esm.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mail-reader-433802',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// Initialize Data Connect
const dataConnect = getDataConnect(connectorConfig);

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
