import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import './Mood.css'
import {
  fetchMoodLogByDate,
  fetchMoodLogsInRange,
  fetchMoodTags,
  upsertMoodLog,
  type MoodLog,
  type MoodTag,
} from '../api/supabase-data-client'

const moodScale = [
  { score: 1, emoji: '😵', label: 'Muy pesado' },
  { score: 2, emoji: '😕', label: 'Bajo' },
  { score: 3, emoji: '😐', label: 'Neutral' },
  { score: 4, emoji: '🙂', label: 'Bien' },
  { score: 5, emoji: '🤩', label: 'Energía alta' },
]

export default function Mood() {
  const queryClient = useQueryClient()
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const rangeStart = useMemo(() => format(subDays(new Date(), 13), 'yyyy-MM-dd'), [])
  const [score, setScore] = useState(3)
  const [journalText, setJournalText] = useState('')
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const { data: tags = [] } = useQuery({
    queryKey: ['mood-tags'],
    queryFn: () => fetchMoodTags(),
  })

  const { data: todayLog } = useQuery({
    queryKey: ['mood-log', today],
    queryFn: () => fetchMoodLogByDate(today),
  })

  const { data: history = [] } = useQuery({
    queryKey: ['mood-history', rangeStart, today],
    queryFn: () => fetchMoodLogsInRange(rangeStart, today),
  })

  useEffect(() => {
    if (!todayLog) return
    setScore(todayLog.moodScore)
    setJournalText(todayLog.journalText ?? '')
    setSelectedTags(todayLog.tagIds)
  }, [todayLog])

  const groupedTags = useMemo(() => {
    return tags.reduce<Record<string, MoodTag[]>>((acc, tag) => {
      const key = tag.category ?? 'OTHER'
      acc[key] = [...(acc[key] ?? []), tag]
      return acc
    }, {})
  }, [tags])

  const saveMutation = useMutation({
    mutationFn: () => upsertMoodLog({
      logDate: today,
      moodScore: score,
      journalText,
      tagIds: selectedTags,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mood-log', today] }),
        queryClient.invalidateQueries({ queryKey: ['mood-history', rangeStart, today] }),
      ])
    },
  })

  return (
    <div className="mood-page">
      <section className="mood-shell">
        <div className="mood-header">
          <div>
            <p className="mood-eyebrow">Azton Signal</p>
            <h1>Estado de ánimo + micro-journal</h1>
            <p>
              Registra señal emocional, contexto y disparadores con una interfaz breve,
              visual y lista para abrirse varias veces al día.
            </p>
          </div>
          <button className="mood-save-btn" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Guardar hoy
          </button>
        </div>

        <div className="mood-layout">
          <section className="mood-card">
            <p className="mood-section-label">Score</p>
            <div className="mood-scale">
              {moodScale.map(item => (
                <button
                  key={item.score}
                  className={score === item.score ? 'is-selected' : ''}
                  onClick={() => setScore(item.score)}
                >
                  <span>{item.emoji}</span>
                  <strong>{item.score}</strong>
                  <small>{item.label}</small>
                </button>
              ))}
            </div>

            <label className="mood-field">
              <span>Micro-journal</span>
              <textarea
                value={journalText}
                maxLength={280}
                rows={6}
                onChange={event => setJournalText(event.target.value)}
                placeholder="Qué te está cargando o impulsando hoy..."
              />
              <small>{journalText.length}/280</small>
            </label>

            <div className="mood-tags-wrap">
              {Object.entries(groupedTags).map(([category, entries]) => (
                <div key={category} className="mood-tag-group">
                  <p>{resolveCategoryLabel(category)}</p>
                  <div className="mood-tag-list">
                    {entries.map(tag => {
                      const active = selectedTags.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          className={active ? 'is-selected' : ''}
                          onClick={() => setSelectedTags(current =>
                            current.includes(tag.id)
                              ? current.filter(id => id !== tag.id)
                              : [...current, tag.id],
                          )}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mood-card">
            <p className="mood-section-label">Últimos 14 días</p>
            <div className="mood-history">
              {history.map(log => (
                <MoodHistoryCard key={log.id} log={log} tags={tags} />
              ))}
              {history.length === 0 && (
                <div className="mood-empty-state">Todavía no hay historial de mood.</div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

function MoodHistoryCard({
  log,
  tags,
}: Readonly<{
  log: MoodLog
  tags: MoodTag[]
}>) {
  const label = moodScale.find(item => item.score === log.moodScore)
  const tagNames = tags.filter(tag => log.tagIds.includes(tag.id)).map(tag => tag.name)

  return (
    <article className="mood-history-card">
      <div className="mood-history-top">
        <div>
          <strong>{format(new Date(`${log.logDate}T12:00:00`), "d 'de' MMMM")}</strong>
          <span>{label?.label ?? 'Sin etiqueta'}</span>
        </div>
        <div className="mood-history-score">
          <span>{label?.emoji}</span>
          <strong>{log.moodScore}</strong>
        </div>
      </div>
      {log.journalText && <p>{log.journalText}</p>}
      {tagNames.length > 0 && (
        <div className="mood-history-tags">
          {tagNames.map(name => <span key={name}>{name}</span>)}
        </div>
      )}
    </article>
  )
}

function resolveCategoryLabel(category: string): string {
  if (category === 'PHYSICAL_SYMPTOM') return 'Síntomas físicos'
  if (category === 'EXTERNAL_TRIGGER') return 'Disparadores'
  return 'Otros'
}
