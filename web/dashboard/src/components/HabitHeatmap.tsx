import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns'
import type { HabitDayCompletion } from '../api/supabase-data-client'

interface HabitHeatmapProps {
  month: Date
  data: HabitDayCompletion[]
}

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function HabitHeatmap({ month, data }: Readonly<HabitHeatmapProps>) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const dataByDate = new Map(data.map(entry => [entry.logDate, entry]))

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, rgba(17,26,46,0.96), rgba(8,16,34,0.96))',
        border: '1px solid var(--c-border-violet)',
        borderRadius: '18px',
        padding: '1.25rem',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '0.72rem', color: 'var(--c-primary)' }}>
            Consistencia
          </p>
          <h3 style={{ margin: '0.35rem 0 0', color: 'var(--c-text)' }}>
            Heatmap de {format(month, 'MMMM')}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--c-text-2)', fontSize: '0.8rem' }}>
          <span>Vacío</span>
          <LegendSwatch color="rgba(94,103,122,0.2)" />
          <LegendSwatch color="rgba(122,92,255,0.45)" />
          <LegendSwatch color="rgba(0,217,255,0.6)" />
          <LegendSwatch color="rgba(57,255,20,0.75)" />
          <span>100%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.45rem' }}>
        {weekdayLabels.map(label => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              fontSize: '0.72rem',
              color: 'var(--c-text-3)',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
        ))}
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const completion = dataByDate.get(dateKey)
          const ratio = completion && completion.loggedCount > 0
            ? completion.completedCount / completion.loggedCount
            : 0

          return (
            <div
              key={dateKey}
              title={`${dateKey} · ${completion?.completedCount ?? 0}/${completion?.loggedCount ?? 0}`}
              style={{
                aspectRatio: '1',
                borderRadius: '10px',
                border: '1px solid rgba(232, 255, 255, 0.08)',
                background: resolveHeatmapColor(ratio, completion?.loggedCount ?? 0),
                boxShadow: ratio >= 1 ? '0 0 18px rgba(57,255,20,0.2)' : 'none',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--c-text)',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {format(day, 'd')}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function LegendSwatch({ color }: Readonly<{ color: string }>) {
  return (
    <span
      style={{
        width: '16px',
        height: '16px',
        borderRadius: '5px',
        background: color,
        display: 'inline-block',
      }}
    />
  )
}

function resolveHeatmapColor(ratio: number, loggedCount: number): string {
  if (!loggedCount) return 'rgba(94,103,122,0.2)'
  if (ratio >= 1) return 'linear-gradient(180deg, rgba(57,255,20,0.82), rgba(0,217,255,0.45))'
  if (ratio >= 0.66) return 'rgba(0,217,255,0.62)'
  if (ratio >= 0.33) return 'rgba(122,92,255,0.5)'
  return 'rgba(255,107,107,0.42)'
}
