import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HabitDayCompletion,
  HabitLog,
  HabitStatus,
  HabitTemplate,
  UserHabit,
} from './types.js';

export const WEEKDAYS_MASK = 62;
export const ALL_DAYS_MASK = 127;

export async function fetchHabitTemplates(
  client: SupabaseClient,
): Promise<HabitTemplate[]> {
  const { data, error } = await client
    .from('habit_templates')
    .select('*')
    .order('category')
    .order('name');

  if (error) throw error;
  return (data ?? []).map(mapHabitTemplate);
}

export async function fetchUserHabits(
  client: SupabaseClient,
  opts?: { activeOnly?: boolean },
): Promise<UserHabit[]> {
  let query = client
    .from('user_habits')
    .select('*')
    .order('day_block')
    .order('sort_order');

  if (opts?.activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map(mapUserHabit);
}

export async function createUserHabit(
  client: SupabaseClient,
  habit: Omit<UserHabit, 'id'>,
): Promise<number> {
  const timestamp = new Date().toISOString();
  const { data, error } = await client
    .from('user_habits')
    .insert({
      template_id: habit.templateId,
      name: habit.name,
      icon_identifier: habit.iconIdentifier,
      color_hex: habit.colorHex,
      day_block: habit.dayBlock,
      frequency_type: habit.frequencyType,
      custom_days_mask: habit.customDaysMask,
      target_completions_per_period: habit.targetCompletionsPerPeriod,
      target_duration_minutes: habit.targetDurationMinutes,
      sort_order: habit.sortOrder,
      is_active: habit.isActive,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateUserHabit(
  client: SupabaseClient,
  id: number,
  updates: Partial<UserHabit>,
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.templateId !== undefined) patch.template_id = updates.templateId;
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.iconIdentifier !== undefined) patch.icon_identifier = updates.iconIdentifier;
  if (updates.colorHex !== undefined) patch.color_hex = updates.colorHex;
  if (updates.dayBlock !== undefined) patch.day_block = updates.dayBlock;
  if (updates.frequencyType !== undefined) patch.frequency_type = updates.frequencyType;
  if (updates.customDaysMask !== undefined) patch.custom_days_mask = updates.customDaysMask;
  if (updates.targetCompletionsPerPeriod !== undefined) {
    patch.target_completions_per_period = updates.targetCompletionsPerPeriod;
  }
  if (updates.targetDurationMinutes !== undefined) {
    patch.target_duration_minutes = updates.targetDurationMinutes;
  }
  if (updates.sortOrder !== undefined) patch.sort_order = updates.sortOrder;
  if (updates.isActive !== undefined) patch.is_active = updates.isActive;

  const { error } = await client.from('user_habits').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteUserHabit(
  client: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await client.from('user_habits').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchHabitLogsByDate(
  client: SupabaseClient,
  logDate: string,
): Promise<HabitLog[]> {
  const { data, error } = await client
    .from('habit_logs')
    .select('*')
    .eq('log_date', logDate)
    .order('completed_at');

  if (error) throw error;
  return (data ?? []).map(mapHabitLog);
}

export async function fetchHabitLogsInRange(
  client: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<HabitLog[]> {
  const { data, error } = await client
    .from('habit_logs')
    .select('*')
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: false })
    .order('completed_at');

  if (error) throw error;
  return (data ?? []).map(mapHabitLog);
}

export async function upsertHabitLog(
  client: SupabaseClient,
  params: {
    userHabitId: number;
    logDate: string;
    status: HabitStatus;
    actualDurationMinutes?: number;
  },
): Promise<void> {
  const timestamp = new Date().toISOString();
  const { error } = await client.from('habit_logs').upsert(
    {
      user_habit_id: params.userHabitId,
      log_date: params.logDate,
      status: params.status,
      actual_duration_minutes: params.actualDurationMinutes ?? 0,
      completed_at: timestamp,
      updated_at: timestamp,
    },
    { onConflict: 'user_habit_id,log_date' },
  );

  if (error) throw error;
}

export async function deleteHabitLog(
  client: SupabaseClient,
  userHabitId: number,
  logDate: string,
): Promise<void> {
  const { error } = await client
    .from('habit_logs')
    .delete()
    .eq('user_habit_id', userHabitId)
    .eq('log_date', logDate);

  if (error) throw error;
}

export async function fetchDailyCompletion(
  client: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<HabitDayCompletion[]> {
  const { data, error } = await client
    .from('v_habit_daily_completion')
    .select('*')
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date');

  if (error) throw error;
  return (data ?? []).map(mapHabitDayCompletion);
}

export function isHabitDueOnDate(habit: UserHabit, date: string): boolean {
  if (!habit.isActive) return false;

  if (habit.frequencyType === 'DAILY') return true;
  if (habit.frequencyType === 'WEEKLY') return true;
  if (habit.frequencyType === 'MONTHLY') return true;

  const weekdayIndex = getWeekdayIndex(date);
  if (habit.frequencyType === 'WEEKDAYS') return weekdayIndex <= 4;

  return ((habit.customDaysMask >> weekdayIndex) & 1) === 1;
}

export function getHabitCompletionLog(
  habit: UserHabit,
  date: string,
  logs: HabitLog[],
): HabitLog | undefined {
  return getHabitCompletionSummary(habit, date, logs).latestLog;
}

export function getHabitCompletionSummary(
  habit: UserHabit,
  date: string,
  logs: HabitLog[],
): {
  completedCount: number;
  targetCount: number;
  isComplete: boolean;
  latestLog?: HabitLog;
} {
  const targetCount = getHabitTargetCount(habit);
  if (!habit.isActive) {
    return { completedCount: 0, targetCount, isComplete: false };
  }

  const { startDate } = getHabitPeriodBounds(habit, date);
  const relevantLogs = logs
    .filter(log =>
      log.userHabitId === habit.id &&
      log.status === 'COMPLETED' &&
      log.logDate >= startDate &&
      log.logDate <= date)
    .sort((left, right) => right.logDate.localeCompare(left.logDate));

  const completedCount = isPeriodTargetHabit(habit)
    ? relevantLogs.length
    : relevantLogs.filter(log => log.logDate === date).length;

  return {
    completedCount,
    targetCount,
    isComplete: completedCount >= targetCount,
    latestLog: relevantLogs[0],
  };
}

export function isHabitCompletedOnDate(
  habit: UserHabit,
  date: string,
  logs: HabitLog[],
): boolean {
  return getHabitCompletionSummary(habit, date, logs).isComplete;
}

export function computeStreak(
  habits: UserHabit[],
  logs: HabitLog[],
  today: string,
): number {
  const activeHabits = habits.filter(habit => habit.isActive);
  if (activeHabits.length === 0) return 0;
  const completedLogs = logs.filter(log => log.status === 'COMPLETED');

  let streak = 0;
  let cursor = today;

  for (let attempts = 0; attempts < 3650; attempts += 1) {
    const dueHabits = activeHabits.filter(habit => isHabitDueOnDate(habit, cursor));
    if (dueHabits.length === 0) {
      cursor = shiftDate(cursor, -1);
      continue;
    }

    const allCompleted = dueHabits.every(habit =>
      isHabitCompletedOnDate(habit, cursor, completedLogs));

    if (cursor === today && !allCompleted) {
      cursor = shiftDate(cursor, -1);
      continue;
    }

    if (!allCompleted) break;

    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

function mapHabitTemplate(r: any): HabitTemplate {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    defaultDurationMinutes: Number(r.default_duration_minutes),
    iconIdentifier: r.icon_identifier,
    colorHex: r.color_hex,
  };
}

function mapUserHabit(r: any): UserHabit {
  return {
    id: r.id,
    templateId: r.template_id,
    name: r.name,
    iconIdentifier: r.icon_identifier,
    colorHex: r.color_hex,
    dayBlock: r.day_block,
    frequencyType: r.frequency_type,
    customDaysMask: Number(r.custom_days_mask),
    targetCompletionsPerPeriod: Number(r.target_completions_per_period ?? 1),
    targetDurationMinutes: Number(r.target_duration_minutes),
    sortOrder: Number(r.sort_order),
    isActive: r.is_active,
  };
}

function mapHabitLog(r: any): HabitLog {
  return {
    id: r.id,
    userHabitId: r.user_habit_id,
    logDate: r.log_date,
    status: r.status,
    actualDurationMinutes: Number(r.actual_duration_minutes),
  };
}

function mapHabitDayCompletion(r: any): HabitDayCompletion {
  return {
    logDate: r.log_date,
    completedCount: Number(r.completed_count ?? 0),
    loggedCount: Number(r.logged_count ?? 0),
  };
}

function getWeekdayIndex(date: string): number {
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
}

function isPeriodTargetHabit(habit: UserHabit): boolean {
  return habit.frequencyType === 'WEEKLY' || habit.frequencyType === 'MONTHLY';
}

function getHabitTargetCount(habit: UserHabit): number {
  if (!isPeriodTargetHabit(habit)) return 1;
  return Math.max(1, habit.targetCompletionsPerPeriod || 1);
}

function getHabitPeriodBounds(
  habit: UserHabit,
  date: string,
): { startDate: string; endDate: string } {
  if (habit.frequencyType === 'WEEKLY') {
    const weekdayIndex = getWeekdayIndex(date);
    const startDate = shiftDate(date, -weekdayIndex);
    const endDate = shiftDate(startDate, 6);
    return { startDate, endDate };
  }

  if (habit.frequencyType === 'MONTHLY') {
    const [yearText, monthText] = date.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const startDate = `${yearText}-${monthText}-01`;
    const lastDay = new Date(year, month, 0, 12).getDate();
    const endDate = `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  }

  return { startDate: date, endDate: date };
}

function shiftDate(date: string, days: number): string {
  const [yearText, monthText, dayText] = date.split('-');
  const shifted = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText) + days,
    12,
  );
  return shifted.toISOString().slice(0, 10);
}
