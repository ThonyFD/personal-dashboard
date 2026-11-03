import type { SupabaseClient } from '@supabase/supabase-js';

/** True when the signed-in account is the app owner (finance access). */
export async function fetchIsOwner(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc('is_owner');
  if (error) throw error;
  return data === true;
}
