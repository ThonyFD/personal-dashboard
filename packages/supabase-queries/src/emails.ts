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

const GMAIL_ID_CHUNK = 100;

/**
 * Which of these Gmail message ids are already stored with parsed = true.
 * The frequent sync skips them instead of fetching each message again.
 * Unparsed emails are not returned, so they keep being retried.
 */
export async function fetchParsedGmailMessageIds(
  client: SupabaseClient,
  gmailMessageIds: string[],
): Promise<Set<string>> {
  const parsed = new Set<string>();
  for (let i = 0; i < gmailMessageIds.length; i += GMAIL_ID_CHUNK) {
    const chunk = gmailMessageIds.slice(i, i + GMAIL_ID_CHUNK);
    const { data, error } = await client
      .from('emails')
      .select('gmail_message_id')
      .in('gmail_message_id', chunk)
      .eq('parsed', true);
    if (error) throw error;
    for (const row of data ?? []) parsed.add((row as { gmail_message_id: string }).gmail_message_id);
  }
  return parsed;
}
