import type { SupabaseClient } from '@supabase/supabase-js';
import type { MonthlyIncome, ManualTransaction } from './types.js';

// ─── Monthly Incomes ───────────────────────────────────────────────────────────

export async function fetchMonthlyIncomes(
  client: SupabaseClient,
  year: number,
  month: number,
): Promise<MonthlyIncome[]> {
  const { data, error } = await client
    .from('monthly_incomes')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('source');

  if (error) throw error;
  return (data ?? []).map(mapIncome);
}

export async function fetchMonthlyIncomesInRange(
  client: SupabaseClient,
  startDate?: string,
  endDate?: string,
): Promise<MonthlyIncome[]> {
  const { data, error } = await client
    .from('monthly_incomes')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('source');

  if (error) throw error;

  const startPeriod = toMonthPeriod(startDate);
  const endPeriod = toMonthPeriod(endDate);

  return (data ?? [])
    .map(mapIncome)
    .filter(income => {
      const period = income.year * 100 + income.month;
      if (startPeriod !== null && period < startPeriod) return false;
      if (endPeriod !== null && period > endPeriod) return false;
      return true;
    });
}

export async function createMonthlyIncome(
  client: SupabaseClient,
  income: Omit<MonthlyIncome, 'id'>,
): Promise<number> {
  const timestamp = new Date().toISOString();
  const { data, error } = await client
    .from('monthly_incomes')
    .insert({
      year: income.year, month: income.month,
      source: income.source, amount: income.amount,
      notes: income.notes ?? null,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateMonthlyIncome(
  client: SupabaseClient,
  id: number,
  updates: Partial<MonthlyIncome>,
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.source !== undefined) patch.source = updates.source;
  if (updates.amount !== undefined) patch.amount = updates.amount;
  if (updates.notes !== undefined) patch.notes = updates.notes;

  const { error } = await client.from('monthly_incomes').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteMonthlyIncome(
  client: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await client.from('monthly_incomes').delete().eq('id', id);
  if (error) throw error;
}

// ─── Manual Transactions ──────────────────────────────────────────────────────

export async function fetchManualTransactions(
  client: SupabaseClient,
  year: number,
  month: number,
  isPaid?: boolean,
): Promise<ManualTransaction[]> {
  let query = client
    .from('manual_transactions')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('day', { ascending: true, nullsFirst: false });

  if (isPaid !== undefined) query = query.eq('is_paid', isPaid);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(mapManualTxn);
}

export async function createManualTransaction(
  client: SupabaseClient,
  transaction: Omit<ManualTransaction, 'id'>,
): Promise<number> {
  const timestamp = new Date().toISOString();
  const { data, error } = await client
    .from('manual_transactions')
    .insert({
      year: transaction.year, month: transaction.month, day: transaction.day ?? null,
      description: transaction.description, amount: transaction.amount,
      transaction_type: transaction.transactionType ?? null,
      payment_method: transaction.paymentMethod ?? null,
      is_paid: transaction.isPaid, notes: transaction.notes ?? null,
      merchant_id: transaction.merchantId ?? null,
      category_id: transaction.categoryId ?? null,
      created_at: timestamp, updated_at: timestamp,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateManualTransaction(
  client: SupabaseClient,
  id: number,
  updates: Partial<ManualTransaction>,
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.day !== undefined) patch.day = updates.day;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.amount !== undefined) patch.amount = updates.amount;
  if (updates.transactionType !== undefined) patch.transaction_type = updates.transactionType;
  if (updates.paymentMethod !== undefined) patch.payment_method = updates.paymentMethod;
  if (updates.isPaid !== undefined) patch.is_paid = updates.isPaid;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.merchantId !== undefined) patch.merchant_id = updates.merchantId;
  if (updates.categoryId !== undefined) patch.category_id = updates.categoryId;

  const { error } = await client.from('manual_transactions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteManualTransaction(
  client: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await client.from('manual_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleManualTransactionPaid(
  client: SupabaseClient,
  id: number,
  isPaid: boolean,
): Promise<void> {
  const { error } = await client
    .from('manual_transactions')
    .update({ is_paid: isPaid })
    .eq('id', id);
  if (error) throw error;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapIncome(r: any): MonthlyIncome {
  return {
    id: r.id, year: r.year, month: r.month,
    source: r.source, amount: Number(r.amount), notes: r.notes,
  };
}

function mapManualTxn(r: any): ManualTransaction {
  return {
    id: r.id, year: r.year, month: r.month, day: r.day,
    description: r.description, amount: Number(r.amount),
    transactionType: r.transaction_type, paymentMethod: r.payment_method,
    isPaid: r.is_paid, notes: r.notes,
    merchantId: r.merchant_id, categoryId: r.category_id,
  };
}

function toMonthPeriod(value?: string): number | null {
  if (!value) return null;
  const [yearText, monthText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return year * 100 + month;
}
