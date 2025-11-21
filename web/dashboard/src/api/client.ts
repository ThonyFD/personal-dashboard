// API client for Firebase Data Connect
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export interface Transaction {
  id: number
  txn_type: string
  channel: string
  amount: number
  currency: string
  merchant_name: string
  txn_date: string
  provider: string
  card_last4?: string
  description?: string
}

export interface Merchant {
  id: number
  name: string
  category?: string
  transaction_count: number
  total_amount: number
}

export interface Stats {
  total_transactions: number
  total_amount: number
  this_month_amount: number
  top_merchant: string
}

export async function fetchStats(): Promise<Stats> {
  const response = await fetch(`${API_URL}/api/stats`)
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}

export async function fetchTransactions(limit = 50): Promise<Transaction[]> {
  const response = await fetch(`${API_URL}/api/transactions?limit=${limit}`)
  if (!response.ok) throw new Error('Failed to fetch transactions')
  return response.json()
}

export async function fetchMerchants(): Promise<Merchant[]> {
  const response = await fetch(`${API_URL}/api/merchants`)
  if (!response.ok) throw new Error('Failed to fetch merchants')
  return response.json()
}

export async function exportTransactionsCSV(startDate?: string, endDate?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (startDate) params.append('start', startDate)
  if (endDate) params.append('end', endDate)

  const response = await fetch(`${API_URL}/api/transactions/export?${params}`)
  if (!response.ok) throw new Error('Failed to export transactions')
  return response.blob()
}
