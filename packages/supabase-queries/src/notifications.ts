import type { SupabaseClient } from '@supabase/supabase-js';
import type { PendingPayment, PushSubscription } from './types.js';

export async function getPendingPaymentsNextDays(
  client: SupabaseClient,
  days = 4,
): Promise<PendingPayment[]> {
  const { data, error } = await client.rpc('get_pending_payments_next_days', { p_days: days });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    description: r.description,
    amount: Number(r.amount),
    due_date: r.due_date,
    days_ahead: r.days_ahead,
  }));
}

export async function getActiveSubscriptions(
  client: SupabaseClient,
): Promise<PushSubscription[]> {
  const { data, error } = await client
    .from('push_subscriptions')
    .select('id, user_email, endpoint, keys, is_active')
    .eq('is_active', true);

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    user_email: r.user_email,
    endpoint: r.endpoint,
    keys: typeof r.keys === 'string' ? JSON.parse(r.keys) : r.keys,
    is_active: r.is_active,
  }));
}

export async function deactivateSubscription(
  client: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await client
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function createPushSubscription(
  client: SupabaseClient,
  data: { userEmail: string; endpoint: string; keys: string; userAgent?: string },
): Promise<void> {
  const { error } = await client.from('push_subscriptions').insert({
    user_email: data.userEmail,
    endpoint: data.endpoint,
    keys: JSON.parse(data.keys),
    user_agent: data.userAgent ?? null,
    is_active: true,
  });
  if (error) throw error;
}

export async function getActivePushSubscriptionsByEmail(
  client: SupabaseClient,
  userEmail: string,
): Promise<PushSubscription[]> {
  const { data, error } = await client
    .from('push_subscriptions')
    .select('*')
    .eq('user_email', userEmail)
    .eq('is_active', true);

  if (error) throw error;
  return data ?? [];
}

export async function getMaxPushSubscriptionId(
  client: SupabaseClient,
): Promise<number | null> {
  const { data, error } = await client
    .from('push_subscriptions')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}
