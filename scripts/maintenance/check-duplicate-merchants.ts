#!/usr/bin/env tsx
/**
 * Check for duplicate merchants using Supabase.
 */

import { createClient } from '@supabase/supabase-js';

interface Merchant {
  id: number;
  name: string;
  normalized_name: string | null;
  category_id: number | null;
  transaction_count: number | null;
  total_amount: number | null;
}

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Checking for duplicate merchants...\n');

  const { data, error } = await supabase
    .from('merchants')
    .select('id, name, normalized_name, category_id, transaction_count, total_amount');

  if (error) {
    console.error('Failed to fetch merchants:', error.message);
    process.exit(1);
  }

  const merchants = (data ?? []) as Merchant[];

  if (merchants.length === 0) {
    console.log('No merchants found.');
    return;
  }

  const grouped = new Map<string, Merchant[]>();

  for (const merchant of merchants) {
    const normalized = merchant.normalized_name || merchant.name.toLowerCase().trim();
    const bucket = grouped.get(normalized) ?? [];
    bucket.push(merchant);
    grouped.set(normalized, bucket);
  }

  const duplicates = Array.from(grouped.entries())
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => {
      const countA = a[1].reduce((sum, merchant) => sum + (merchant.transaction_count ?? 0), 0);
      const countB = b[1].reduce((sum, merchant) => sum + (merchant.transaction_count ?? 0), 0);
      return countB - countA;
    });

  if (duplicates.length === 0) {
    console.log('No duplicate merchants found.');
    return;
  }

  console.log(`Duplicate normalized names: ${duplicates.length}\n`);

  for (const [normalizedName, list] of duplicates) {
    const totalTransactions = list.reduce((sum, merchant) => sum + (merchant.transaction_count ?? 0), 0);
    const totalAmount = list.reduce((sum, merchant) => sum + Number(merchant.total_amount ?? 0), 0);

    console.log(`Normalized: "${normalizedName}"`);
    console.log(`  Total transactions: ${totalTransactions}`);
    console.log(`  Total amount: $${totalAmount.toFixed(2)}`);

    for (const merchant of list) {
      console.log(
        `  - ID ${merchant.id} | ${merchant.name} | category=${merchant.category_id ?? 'null'} | txns=${merchant.transaction_count ?? 0} | amount=$${Number(merchant.total_amount ?? 0).toFixed(2)}`
      );
    }

    console.log('');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
