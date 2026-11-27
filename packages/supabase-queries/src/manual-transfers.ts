import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Transfers the owner types in by hand: bank-app transfers that send no email, so
 * the Gmail sync never sees them. They live in `transactions` like any other row
 * (same budgets, categories and lists), with no email and provider 'manual'.
 */
export const MANUAL_PROVIDER = 'manual';

export interface ManualTransferInput {
  merchantId: number;
  /** Shown in the transaction lists, which read transactions.merchant_name. */
  merchantName: string;
  amount: number;
  /** YYYY-MM-DD, America/Panama. */
  txnDate: string;
  description?: string;
  /** Generated once per form, so a double submit saves a single row. */
  idempotencyKey: string;
}

export function isManualTransaction(provider: string | null | undefined): boolean {
  return provider === MANUAL_PROVIDER;
}

function validate(input: ManualTransferInput): void {
  if (!Number.isInteger(input.merchantId) || input.merchantId <= 0) {
    throw new Error('Elige un comercio válido.');
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('El monto debe ser mayor que cero.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.txnDate)) {
    throw new Error('La fecha debe tener el formato AAAA-MM-DD.');
  }
  if (!input.idempotencyKey.trim()) {
    throw new Error('Falta la clave de la transferencia.');
  }
}

/** Saves the transfer and returns its id (the existing id on a repeated submit). */
export async function recordManualTransfer(
  client: SupabaseClient,
  input: ManualTransferInput,
): Promise<number> {
  validate(input);

  const idempotencyKey = `${MANUAL_PROVIDER}:${input.idempotencyKey}`;
  const merchantName = input.merchantName.trim();
  const description = input.description?.trim() || null;

  const { data, error } = await client
    .from('transactions')
    .insert({
      email_id: null,
      merchant_id: input.merchantId,
      merchant_name: merchantName,
      merchant_raw: merchantName,
      txn_type: 'TRANSFER',
      channel: 'BANK_TRANSFER',
      amount: Math.round(input.amount * 100) / 100,
      currency: 'USD',
      txn_date: input.txnDate,
      provider: MANUAL_PROVIDER,
      description,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (!error) return Number((data as { id: number }).id);

  if ((error as { code?: string }).code !== '23505') throw error;

  const { data: existing, error: lookupError } = await client
    .from('transactions')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!existing) throw error;
  return Number((existing as { id: number }).id);
}

/** Deletes a manual entry. Rows that came from an email are never touched. */
export async function deleteManualTransfer(client: SupabaseClient, id: number): Promise<void> {
  const { error } = await client
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('provider', MANUAL_PROVIDER);
  if (error) throw error;
}
