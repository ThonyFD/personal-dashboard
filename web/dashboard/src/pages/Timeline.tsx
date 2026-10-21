import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth, startOfWeek, subDays } from 'date-fns'
import './Timeline.css'
import {
  computeStreak,
  deleteHabitLog,
  fetchDailyCompletion,
  fetchHabitLogsInRange,
  fetchUserHabits,
  getHabitCompletionSummary,
  isHabitDueOnDate,
  upsertHabitLog,
  type HabitLog,
  type UserHabit,
} from '../api/supabase-data-client'
import { HabitHeatmap } from '../components/HabitHeatmap'

const blockLabels = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
  EVENING: 'Noche',
} as const

const iconMap: Record<string, string> = {
  water: '💧',
  walk: '🚶',
  stretch: '🧘',
  meditate: '🧠',
  journal: '✍️',
  book: '📚',
  focus: '🎯',
  plan: '🗂️',
}

export default function Timeline() {
  const queryClient = useQueryClient()
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  const streakStart = format(subDays(new Date(), 365), 'yyyy-MM-dd')
  const activePeriodStart = weekStart < monthStart ? weekStart : monthStart
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({
    MORNING: true,
    AFTERNOON: true,
    EVENING: true,
  })
  const [focusHabit, setFocusHabit] = useState<UserHabit | null>(null)

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['user-habits'],
    queryFn: () => fetchUserHabits({ activeOnly: true }),
  })

  const { data: activePeriodLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['habit-period-logs', activePeriodStart, today],
    queryFn: () => fetchHabitLogsInRange(activePeriodStart, today),
  })

  const { data: streakLogs = [] } = useQuery({
    queryKey: ['habit-logs-range', streakStart, today],
    queryFn: () => fetchHabitLogsInRange(streakStart, today),
  })

  const { data: completion = [] } = useQuery({
    queryKey: ['habit-completion', monthStart, monthEnd],
    queryFn: () => fetchDailyCompletion(monthStart, monthEnd),
  })

  const dueHabits = useMemo(
    () => habits.filter(habit => isHabitDueOnDate(habit, today)),
    [habits, today],
  )

  const completionSummaryByHabitId = useMemo(() => {
    const map = new Map<number, ReturnType<typeof getHabitCompletionSummary>>()
    for (const habit of dueHabits) {
      map.set(habit.id, getHabitCompletionSummary(habit, today, activePeriodLogs))
    }
    return map
  }, [activePeriodLogs, dueHabits, today])

  const todayCompletionLogsByHabitId = useMemo(() => {
    const map = new Map<number, HabitLog>()
    for (const log of activePeriodLogs) {
      if (log.status === 'COMPLETED' && log.logDate === today) {
        map.set(log.userHabitId, log)
      }
    }
    return map
  }, [activePeriodLogs, dueHabits, today])

  const groupedHabits = useMemo(() => {
    return {
      MORNING: dueHabits.filter(habit => habit.dayBlock === 'MORNING'),
      AFTERNOON: dueHabits.filter(habit => habit.dayBlock === 'AFTERNOON'),
      EVENING: dueHabits.filter(habit => habit.dayBlock === 'EVENING'),
    }
  }, [dueHabits])

  const completedCount = dueHabits.filter(habit => completionSummaryByHabitId.get(habit.id)?.isComplete).length
  const progressRatio = dueHabits.length ? completedCount / dueHabits.length : 0
  const streak = useMemo(
    () => computeStreak(habits, streakLogs, today),
    [habits, streakLogs, today],
  )

  const toggleMutation = useMutation({
    mutationFn: async (habit: UserHabit) => {
      const todayCompletion = todayCompletionLogsByHabitId.get(habit.id)
      if (todayCompletion) {
        await deleteHabitLog(habit.id, todayCompletion.logDate)
        return
      }

      const completionSummary = completionSummaryByHabitId.get(habit.id)
      if (completionSummary?.isComplete && completionSummary.latestLog) {
        await deleteHabitLog(habit.id, completionSummary.latestLog.logDate)
        return
      }

      await upsertHabitLog({
        userHabitId: habit.id,
        logDate: today,
        status: 'COMPLETED',
        actualDurationMinutes: habit.targetDurationMinutes,
      })
    },
    onSuccess: () => invalidateHabitQueries(
      queryClient,
      activePeriodStart,
      today,
      streakStart,
      monthStart,
      monthEnd,
    ),
  })

  if (habitsLoading || logsLoading) {
    return <div className="loading">Cargando timeline...</div>
  }

  return (
    <div className="timeline-page">
      <section className="timeline-hero">
        <div>
          <p className="timeline-eyebrow">Azton Daily Loop</p>
          <h1>Timeline de hábitos</h1>
          <p>
            Ejecuta el día por bloques, mide consistencia real y mantén la racha viva
            con una vista diseñada para actuar rápido.
          </p>
        </div>
        <div className="timeline-hero-meta">
          <div className="timeline-chip timeline-chip-primary">
            <span>Racha</span>
            <strong>{streak} días</strong>
          </div>
          <div className="timeline-chip">
            <span>Completados hoy</span>
            <strong>{completedCount}/{dueHabits.length || 0}</strong>
          </div>
        </div>
      </section>

      <section className="timeline-progress-card">
        <div className="timeline-progress-header">
          <div>
            <p className="timeline-section-label">Ritmo del día</p>
            <h2>{format(new Date(), "EEEE, d 'de' MMMM")}</h2>
          </div>
          <span className="timeline-progress-value">{Math.round(progressRatio * 100)}%</span>
        </div>
        <div className="timeline-progress-track">
          <div className="timeline-progress-fill" style={{ width: `${progressRatio * 100}%` }} />
        </div>
      </section>

      <div className="timeline-blocks">
        {(['MORNING', 'AFTERNOON', 'EVENING'] as const).map(block => (
          <section className="timeline-block-card" key={block}>
            <button
              className="timeline-block-toggle"
              onClick={() => setOpenBlocks(current => ({ ...current, [block]: !current[block] }))}
            >
              <div>
                <p className="timeline-section-label">{blockLabels[block]}</p>
                <h3>{groupedHabits[block].length} hábitos debidos</h3>
              </div>
              <span>{openBlocks[block] ? '−' : '+'}</span>
            </button>

            {openBlocks[block] && (
              <div className="timeline-habit-list">
                {groupedHabits[block].length === 0 && (
                  <div className="timeline-empty-state">Sin hábitos programados en este bloque.</div>
                )}
                {groupedHabits[block].map(habit => {
                  const completionSummary = completionSummaryByHabitId.get(habit.id) ?? getHabitCompletionSummary(habit, today, [])
                  const todayCompletion = todayCompletionLogsByHabitId.get(habit.id)
                  const completed = completionSummary.isComplete
                  const isProgressLoggedToday = Boolean(todayCompletion) && !completed
                  return (
                    <article className={`timeline-habit-row ${completed ? 'is-complete' : ''}`} key={habit.id}>
                      <button
                        className={`timeline-check ${completed ? 'is-complete' : ''} ${isProgressLoggedToday ? 'is-progress' : ''}`}
                        onClick={() => toggleMutation.mutate(habit)}
                        disabled={toggleMutation.isPending}
                        aria-label={completed || isProgressLoggedToday ? 'Desmarcar avance del hábito' : 'Completar hábito'}
                      >
                        {completed ? '✓' : isProgressLoggedToday ? '•' : ''}
                      </button>
                      <div className="timeline-habit-icon" style={{ background: habit.colorHex ?? 'rgba(0,217,255,0.14)' }}>
                        {resolveHabitIcon(habit.iconIdentifier)}
                      </div>
                      <div className="timeline-habit-copy">
                        <strong>{habit.name}</strong>
                        <span>
                          {habit.targetDurationMinutes} min objetivo
                          {completionSummary.latestLog?.actualDurationMinutes ? ` · ${completionSummary.latestLog.actualDurationMinutes} min reales` : ''}
                          {describeTimelineCompletion(habit, completionSummary.completedCount, completionSummary.targetCount)}
                        </span>
                      </div>
                      <button className="timeline-focus-btn" onClick={() => setFocusHabit(habit)}>
                        Focus
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      <HabitHeatmap month={new Date()} data={completion} />

      {focusHabit && (
        <FocusTimerModal
          habit={focusHabit}
          onClose={() => setFocusHabit(null)}
          onComplete={async minutes => {
            const todayCompletion = todayCompletionLogsByHabitId.get(focusHabit.id)
            const completionSummary = getHabitCompletionSummary(focusHabit, today, activePeriodLogs)
            await upsertHabitLog({
              userHabitId: focusHabit.id,
              logDate: todayCompletion?.logDate ?? (completionSummary.isComplete ? completionSummary.latestLog?.logDate : undefined) ?? today,
              status: 'COMPLETED',
              actualDurationMinutes: minutes,
            })
            await invalidateHabitQueries(queryClient, activePeriodStart, today, streakStart, monthStart, monthEnd)
            setFocusHabit(null)
          }}
        />
      )}
    </div>
  )
}

function FocusTimerModal({
  habit,
  onClose,
  onComplete,
}: Readonly<{
  habit: UserHabit
  onClose: () => void
  onComplete: (minutes: number) => Promise<void>
}>) {
  const [remainingSeconds, setRemainingSeconds] = useState(habit.targetDurationMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return undefined
    const timer = window.setInterval(() => {
      setRemainingSeconds(value => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, remainingSeconds])

  useEffect(() => {
    if (remainingSeconds === 0) setIsRunning(false)
  }, [remainingSeconds])

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return (
    <div className="timeline-modal-backdrop" onClick={onClose}>
      <div className="timeline-modal" onClick={event => event.stopPropagation()}>
        <p className="timeline-section-label">Focus Timer</p>
        <h3>{habit.name}</h3>
        <div className="timeline-timer-clock">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="timeline-timer-actions">
          <button className="timeline-secondary-btn" onClick={() => setIsRunning(value => !value)}>
            {isRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            className="timeline-primary-btn"
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true)
              try {
                const minutesCompleted = Math.max(1, Math.round((habit.targetDurationMinutes * 60 - remainingSeconds) / 60))
                await onComplete(minutesCompleted || habit.targetDurationMinutes)
              } finally {
                setIsSaving(false)
              }
            }}
          >
            Guardar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

function resolveHabitIcon(iconIdentifier: string | null): string {
  if (!iconIdentifier) return '✦'
  return iconMap[iconIdentifier] ?? '✦'
}

function describeTimelineCompletion(
  habit: UserHabit,
  completedCount: number,
  targetCount: number,
): string {
  if (habit.frequencyType === 'WEEKLY') {
    return ` · ${completedCount}/${targetCount} esta semana`
  }

  if (habit.frequencyType === 'MONTHLY') {
    return ` · ${completedCount}/${targetCount} este mes`
  }

  return ''
}

async function invalidateHabitQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  activePeriodStart: string,
  today: string,
  streakStart: string,
  monthStart: string,
  monthEnd: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['habit-period-logs', activePeriodStart, today] }),
    queryClient.invalidateQueries({ queryKey: ['habit-logs-range', streakStart, today] }),
    queryClient.invalidateQueries({ queryKey: ['habit-completion', monthStart, monthEnd] }),
  ])
}
