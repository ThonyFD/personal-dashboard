import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchIsOwner } from './account.js';

function rpcClient(result: { data: unknown; error: unknown }) {
  return { rpc: async () => result } as unknown as SupabaseClient;
}

describe('fetchIsOwner', () => {
  it('returns true only for data === true', async () => {
    expect(await fetchIsOwner(rpcClient({ data: true, error: null }))).toBe(true);
    expect(await fetchIsOwner(rpcClient({ data: false, error: null }))).toBe(false);
    expect(await fetchIsOwner(rpcClient({ data: null, error: null }))).toBe(false);
  });

  it('throws on rpc error', async () => {
    const error = new Error('permission denied');
    await expect(fetchIsOwner(rpcClient({ data: null, error }))).rejects.toBe(error);
  });
});
