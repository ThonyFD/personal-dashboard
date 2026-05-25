import type { SupabaseClient } from '@supabase/supabase-js';

export interface SystemAlert {
  id: number;
  type: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  details: Record<string, unknown> | null;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

export async function fetchUnresolvedAlerts(client: SupabaseClient): Promise<SystemAlert[]> {
  const { data, error } = await client
    .from('system_alerts')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SystemAlert[];
}

export async function resolveAlert(client: SupabaseClient, id: number): Promise<void> {
  const { error } = await client
    .from('system_alerts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
