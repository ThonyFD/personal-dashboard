import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertMoodLog } from './mood.js';

function recordingClient() {
  const calls: { table: string; options?: { onConflict?: string } }[] = [];
  const chain = {
    select: () => chain,
    single: async () => ({ data: { id: 7 }, error: null }),
    eq: async () => ({ error: null }),
  };
  const client = {
    from: (table: string) => ({
      upsert: (_row: unknown, options?: { onConflict?: string }) => {
        calls.push({ table, options });
        return chain;
      },
      delete: () => chain,
      insert: async () => ({ error: null }),
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('upsertMoodLog', () => {
  it('uses user_id,log_date as conflict target', async () => {
    const { client, calls } = recordingClient();
    await upsertMoodLog(client, { logDate: '2026-11-02', moodScore: 4, tagIds: [] });
    expect(calls).toEqual([{ table: 'mood_logs', options: { onConflict: 'user_id,log_date' } }]);
  });
});
