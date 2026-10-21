// Hashing utilities for idempotency
import crypto from 'node:crypto';

export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateEmailBodyHash(body: string): string {
  // Remove whitespace variations for consistent hashing
  const normalized = body.trim().replace(/\s+/g, ' ');
  return sha256(normalized);
}

export function generateIdempotencyKey(
  provider: string,
  referenceNumber: string | null | undefined,
  emailId: number,
  txnDate: Date,
  amount: number,
  merchant: string
): string {
  // The bank's reference number is the true unique identity of a transaction.
  // A single payment can arrive as several emails (e.g. Banisi sends two
  // "Confirmación de Pago" messages), all sharing the same reference. Keying on
  // it deduplicates across distinct emails and across re-parses of the same email.
  const ref = referenceNumber?.trim();
  if (ref) {
    return sha256(`${provider}|ref|${ref}`);
  }
  // Fallback for transactions without a reference: deterministic key anchored to
  // the email and the calendar day. Note we use the DAY only (not the full
  // timestamp) — the parsed time-of-day can vary between runs/parsers and would
  // otherwise produce a different key for the same logical transaction.
  const day = txnDate.toISOString().split('T')[0];
  return sha256(`${provider}|${emailId}|${day}|${amount}|${merchant.toLowerCase()}`);
}

export function normalizeMerchantName(name: string): string {
  return name
    .normalize('NFD')                  // Decompose ñ → n + combining tilde (matches SQL unaccent)
    .replace(/[̀-ͯ]/g, '')   // Strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')       // Strip remaining special characters
    .replace(/\s+/g, ' ')
    .trim();
}

export function simpleNormalizeMerchantName(name: string): string {
  return name.toLowerCase().trim();
}
