import type { SupabaseClient } from '@supabase/supabase-js';

export async function getLastProcessedEmail(
  client: SupabaseClient,
): Promise<{ receivedAt: string } | null> {
  const { data, error } = await client
    .from('emails')
    .select('received_at')
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? { receivedAt: (data as { received_at: string }).received_at } : null;
}
