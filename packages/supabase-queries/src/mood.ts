import type { SupabaseClient } from '@supabase/supabase-js';
import type { MoodLog, MoodTag } from './types.js';

export async function fetchMoodTags(
  client: SupabaseClient,
): Promise<MoodTag[]> {
  const { data, error } = await client
    .from('mood_tags')
    .select('*')
    .order('category')
    .order('name');

  if (error) throw error;
  return (data ?? []).map(mapMoodTag);
}

export async function fetchMoodLogByDate(
  client: SupabaseClient,
  logDate: string,
): Promise<MoodLog | null> {
  const { data, error } = await client
    .from('mood_logs')
    .select('*')
    .eq('log_date', logDate)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const tagIds = await fetchMoodTagIds(client, [data.id]);
  return mapMoodLog(data, tagIds.get(data.id) ?? []);
}

export async function fetchMoodLogsInRange(
  client: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<MoodLog[]> {
  const { data, error } = await client
    .from('mood_logs')
    .select('*')
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const tagIds = await fetchMoodTagIds(client, rows.map(row => row.id));
  return rows.map(row => mapMoodLog(row, tagIds.get(row.id) ?? []));
}

export async function upsertMoodLog(
  client: SupabaseClient,
  params: {
    logDate: string;
    moodScore: number;
    journalText?: string | null;
    tagIds: number[];
  },
): Promise<number> {
  const timestamp = new Date().toISOString();
  const { data, error } = await client
    .from('mood_logs')
    .upsert(
      {
        log_date: params.logDate,
        mood_score: params.moodScore,
        journal_text: params.journalText ?? null,
        updated_at: timestamp,
      },
      { onConflict: 'log_date' },
    )
    .select('id')
    .single();

  if (error) throw error;

  const moodLogId = data.id as number;
  const { error: deleteError } = await client
    .from('mood_log_tags')
    .delete()
    .eq('mood_log_id', moodLogId);

  if (deleteError) throw deleteError;

  if (params.tagIds.length > 0) {
    const { error: insertError } = await client.from('mood_log_tags').insert(
      params.tagIds.map(tagId => ({
        mood_log_id: moodLogId,
        tag_id: tagId,
      })),
    );
    if (insertError) throw insertError;
  }

  return moodLogId;
}

export async function deleteMoodLog(
  client: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await client.from('mood_logs').delete().eq('id', id);
  if (error) throw error;
}

function mapMoodTag(r: any): MoodTag {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
  };
}

function mapMoodLog(r: any, tagIds: number[]): MoodLog {
  return {
    id: r.id,
    logDate: r.log_date,
    moodScore: Number(r.mood_score),
    journalText: r.journal_text,
    tagIds,
  };
}

async function fetchMoodTagIds(
  client: SupabaseClient,
  moodLogIds: number[],
): Promise<Map<number, number[]>> {
  const byMoodLogId = new Map<number, number[]>();
  if (moodLogIds.length === 0) return byMoodLogId;

  const { data, error } = await client
    .from('mood_log_tags')
    .select('mood_log_id, tag_id')
    .in('mood_log_id', moodLogIds);

  if (error) throw error;

  for (const row of data ?? []) {
    const list = byMoodLogId.get(row.mood_log_id) ?? [];
    list.push(Number(row.tag_id));
    byMoodLogId.set(Number(row.mood_log_id), list);
  }

  return byMoodLogId;
}
