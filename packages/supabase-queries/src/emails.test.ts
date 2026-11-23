import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchParsedGmailMessageIds } from './emails.js';

function client(parsedIds: Set<string>, calls: string[][]) {
  return {
    from: () => ({
      select: () => ({
        in: (_col: string, ids: string[]) => ({
          eq: async () => {
            calls.push(ids);
            return { data: ids.filter((id) => parsedIds.has(id)).map((gmail_message_id) => ({ gmail_message_id })), error: null };
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('fetchParsedGmailMessageIds', () => {
  it('returns only the parsed ids, querying in chunks of 100', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `m${i}`);
    const calls: string[][] = [];
    const parsed = await fetchParsedGmailMessageIds(client(new Set(['m0', 'm150', 'm249']), calls), ids);

    expect([...parsed].sort()).toEqual(['m0', 'm150', 'm249']);
    expect(calls.map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it('does nothing for an empty list', async () => {
    const calls: string[][] = [];
    expect((await fetchParsedGmailMessageIds(client(new Set(), calls), [])).size).toBe(0);
    expect(calls).toEqual([]);
  });
});
