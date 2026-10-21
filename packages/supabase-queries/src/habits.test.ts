import { describe, expect, it } from 'vitest';
import {
  computeStreak,
  getHabitCompletionLog,
  getHabitCompletionSummary,
  isHabitCompletedOnDate,
  isHabitDueOnDate,
} from './habits.js';
import type { HabitLog, UserHabit } from './types.js';

function buildHabit(overrides: Partial<UserHabit>): UserHabit {
  return {
    id: 1,
    templateId: null,
    name: 'Habit test',
    iconIdentifier: 'focus',
    colorHex: '#00D9FF',
    dayBlock: 'MORNING',
    frequencyType: 'DAILY',
    customDaysMask: 127,
    targetCompletionsPerPeriod: 1,
    targetDurationMinutes: 10,
    sortOrder: 0,
    isActive: true,
    ...overrides,
  };
}

function buildLog(overrides: Partial<HabitLog>): HabitLog {
  return {
    id: 1,
    userHabitId: 1,
    logDate: '2026-06-25',
    status: 'COMPLETED',
    actualDurationMinutes: 10,
    ...overrides,
  };
}

describe('habit period completion', () => {
  it('marks weekly habits as due every day', () => {
    const weeklyHabit = buildHabit({ frequencyType: 'WEEKLY' });

    expect(isHabitDueOnDate(weeklyHabit, '2026-06-22')).toBe(true);
    expect(isHabitDueOnDate(weeklyHabit, '2026-06-26')).toBe(true);
  });

  it('recognizes a weekly completion earlier in the same week', () => {
    const weeklyHabit = buildHabit({ frequencyType: 'WEEKLY' });
    const logs = [buildLog({ logDate: '2026-06-24' })];

    expect(isHabitCompletedOnDate(weeklyHabit, '2026-06-26', logs)).toBe(true);
    expect(getHabitCompletionLog(weeklyHabit, '2026-06-26', logs)?.logDate).toBe('2026-06-24');
    expect(isHabitCompletedOnDate(weeklyHabit, '2026-06-23', logs)).toBe(false);
  });

  it('recognizes a monthly completion earlier in the same month only', () => {
    const monthlyHabit = buildHabit({ frequencyType: 'MONTHLY' });
    const logs = [buildLog({ logDate: '2026-06-03' })];

    expect(isHabitCompletedOnDate(monthlyHabit, '2026-06-27', logs)).toBe(true);
    expect(isHabitCompletedOnDate(monthlyHabit, '2026-07-01', logs)).toBe(false);
  });

  it('requires all target completions inside the weekly period', () => {
    const weeklyHabit = buildHabit({ frequencyType: 'WEEKLY', targetCompletionsPerPeriod: 3 });
    const logs = [
      buildLog({ id: 1, logDate: '2026-06-23' }),
      buildLog({ id: 2, logDate: '2026-06-24' }),
    ];

    expect(getHabitCompletionSummary(weeklyHabit, '2026-06-26', logs)).toMatchObject({
      completedCount: 2,
      targetCount: 3,
      isComplete: false,
    });
    expect(isHabitCompletedOnDate(weeklyHabit, '2026-06-26', logs)).toBe(false);
  });

  it('marks a weekly habit complete once it reaches the target count', () => {
    const weeklyHabit = buildHabit({ frequencyType: 'WEEKLY', targetCompletionsPerPeriod: 3 });
    const logs = [
      buildLog({ id: 1, logDate: '2026-06-23' }),
      buildLog({ id: 2, logDate: '2026-06-24' }),
      buildLog({ id: 3, logDate: '2026-06-26' }),
    ];

    expect(getHabitCompletionSummary(weeklyHabit, '2026-06-26', logs)).toMatchObject({
      completedCount: 3,
      targetCount: 3,
      isComplete: true,
    });
    expect(getHabitCompletionLog(weeklyHabit, '2026-06-26', logs)?.logDate).toBe('2026-06-26');
  });

  it('treats a weekly habit as satisfied for streak days after its completion', () => {
    const habits = [buildHabit({ frequencyType: 'WEEKLY' })];
    const logs = [buildLog({ logDate: '2026-06-24' })];

    expect(computeStreak(habits, logs, '2026-06-26')).toBe(3);
  });
});
