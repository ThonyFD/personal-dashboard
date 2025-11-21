// Hashing utilities for idempotency
import crypto from 'crypto';

export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateEmailBodyHash(body: string): string {
  // Remove whitespace variations for consistent hashing
  const normalized = body.trim().replace(/\s+/g, ' ');
  return sha256(normalized);
}

export function generateIdempotencyKey(
  emailId: number,
  txnDate: Date,
  amount: number,
  merchant: string
): string {
  const data = `${emailId}|${txnDate.toISOString()}|${amount}|${merchant.toLowerCase()}`;
  return sha256(data);
}

export function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function simpleNormalizeMerchantName(name: string): string {
  return name.toLowerCase().trim();
}
