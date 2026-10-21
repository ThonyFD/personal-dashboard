import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import './Habits.css'
import {
  ALL_DAYS_MASK,
  createUserHabit,
  deleteUserHabit,
  fetchHabitTemplates,
  fetchUserHabits,
  updateUserHabit,
  type DayBlock,
  type FrequencyType,
  type HabitTemplate,
  type UserHabit,
} from '../api/supabase-data-client'

const days = [
  { label: 'L', bit: 0 },
  { label: 'M', bit: 1 },
  { label: 'X', bit: 2 },
  { label: 'J', bit: 3 },
  { label: 'V', bit: 4 },
  { label: 'S', bit: 5 },
  { label: 'D', bit: 6 },
]

const frequencyLabels: Record<FrequencyType, string> = {
  DAILY: 'Diario',
  WEEKDAYS: 'Laborables',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  CUSTOM: 'Custom',
}

const frequencyOptions: Array<{
  value: FrequencyType
  optionLabel: string
  chip: string
  completionRule: (targetCount: number) => string
  description: (targetCount: number) => string
}> = [
  {
    value: 'DAILY',
    optionLabel: 'Diario · se completa cada día',
    chip: 'Reset diario',
    completionRule: () => 'Debes completarlo hoy',
    description: () => 'Se reinicia al comenzar un nuevo día.',
  },
  {
    value: 'WEEKDAYS',
    optionLabel: 'Laborables · lunes a viernes',
    chip: 'Lun a Vie',
    completionRule: () => 'Debes completarlo en cada día laborable',
    description: () => 'Solo cuenta de lunes a viernes y cada día se evalúa por separado.',
  },
  {
    value: 'WEEKLY',
    optionLabel: 'Semanal · meta configurable por semana',
    chip: 'Ventana semanal',
    completionRule: targetCount => `Debes completarlo ${formatPeriodTarget(targetCount, 'semana')} dentro de la semana actual`,
    description: targetCount => `Permanece visible hasta llegar a ${targetCount}/${targetCount} y luego se cierra por esa semana.`,
  },
  {
    value: 'MONTHLY',
    optionLabel: 'Mensual · meta configurable por mes',
    chip: 'Ventana mensual',
    completionRule: targetCount => `Debes completarlo ${formatPeriodTarget(targetCount, 'mes')} dentro del mes actual`,
    description: targetCount => `Permanece visible hasta llegar a ${targetCount}/${targetCount} y luego se cierra por ese mes.`,
  },
  {
    value: 'CUSTOM',
    optionLabel: 'Custom · días específicos',
    chip: 'Días elegidos',
    completionRule: () => 'Debes completarlo solo en los días que selecciones',
    description: () => 'Solo aparece en los días que marques en el selector semanal.',
  },
]

type HabitDraft = Omit<UserHabit, 'id'>

const emptyDraft: HabitDraft = {
  templateId: null,
  name: '',
  iconIdentifier: 'focus',
  colorHex: '#00D9FF',
  dayBlock: 'MORNING',
  frequencyType: 'DAILY',
  customDaysMask: ALL_DAYS_MASK,
  targetCompletionsPerPeriod: 1,
  targetDurationMinutes: 10,
  sortOrder: 0,
  isActive: true,
}

export default function Habits() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<HabitDraft>(emptyDraft)
  const [editingId, setEditingId] = useState<number | null>(null)

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['user-habits-admin'],
    queryFn: () => fetchUserHabits(),
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['habit-templates'],
    queryFn: () => fetchHabitTemplates(),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...draft,
        sortOrder: draft.sortOrder || nextSortOrder(habits, draft.dayBlock),
      }
      if (editingId) {
        await updateUserHabit(editingId, payload)
        return
      }
      await createUserHabit(payload)
    },
    onSuccess: async () => {
      setDraft(emptyDraft)
      setEditingId(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-habits-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['user-habits'] }),
      ])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUserHabit(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-habits-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['user-habits'] }),
      ])
    },
  })

  const groupedHabits = useMemo(() => {
    return {
      active: habits.filter(habit => habit.isActive),
      archived: habits.filter(habit => !habit.isActive),
    }
  }, [habits])

  const selectedFrequency = useMemo(
    () => frequencyOptions.find(option => option.value === draft.frequencyType) ?? frequencyOptions[0],
    [draft.frequencyType],
  )

  const showPeriodTargetField = draft.frequencyType === 'WEEKLY' || draft.frequencyType === 'MONTHLY'
  const maxPeriodTarget = draft.frequencyType === 'WEEKLY' ? 7 : 31
  const normalizedTargetCount = showPeriodTargetField
    ? Math.min(Math.max(1, draft.targetCompletionsPerPeriod), maxPeriodTarget)
    : 1

  useEffect(() => {
    if (draft.frequencyType !== 'CUSTOM' && draft.customDaysMask !== ALL_DAYS_MASK) {
      setDraft(current => ({ ...current, customDaysMask: ALL_DAYS_MASK }))
    }
  }, [draft.frequencyType, draft.customDaysMask])

  useEffect(() => {
    if (draft.targetCompletionsPerPeriod !== normalizedTargetCount) {
      setDraft(current => ({ ...current, targetCompletionsPerPeriod: normalizedTargetCount }))
    }
  }, [draft.targetCompletionsPerPeriod, normalizedTargetCount])

  if (isLoading) {
    return <div className="loading">Cargando hábitos...</div>
  }

  return (
    <div className="habits-page">
      <section className="habits-shell">
        <div className="habits-header">
          <div>
            <p className="habits-eyebrow">Azton Builder</p>
            <h1>Diseña tu stack de hábitos</h1>
            <p>
              Activa hábitos por bloque del día, ajusta frecuencia real y mezcla plantillas
              con entradas personalizadas sin salir del dashboard.
            </p>
          </div>
        </div>

        <div className="habits-grid">
          <section className="habits-form-card">
            <p className="habits-section-label">{editingId ? 'Editar hábito' : 'Nuevo hábito'}</p>
            <h2>{editingId ? 'Actualiza la rutina' : 'Crear hábito'}</h2>
            <p>
              También puedes crear hábitos semanales o mensuales para mantenerlos visibles
              en el timeline hasta completarlos dentro del periodo.
            </p>

            <label className="habits-field">
              <span>Plantilla</span>
              <select
                value={draft.templateId ?? ''}
                onChange={event => {
                  const value = event.target.value
                  if (!value) {
                    setDraft(current => ({ ...current, templateId: null }))
                    return
                  }
                  const template = templates.find(item => item.id === Number(value))
                  if (!template) return
                  hydrateDraftFromTemplate(template, habits, draft.dayBlock, setDraft)
                }}
              >
                <option value="">Custom</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.category} · {template.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="habits-form-grid">
              <label className="habits-field">
                <span>Nombre</span>
                <input
                  value={draft.name}
                  onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
                  placeholder="Ej. Respiración 4-7-8"
                />
              </label>
              <label className="habits-field">
                <span>Bloque</span>
                <select
                  value={draft.dayBlock}
                  onChange={event => setDraft(current => ({
                    ...current,
                    dayBlock: event.target.value as DayBlock,
                  }))}
                >
                  <option value="MORNING">Mañana</option>
                  <option value="AFTERNOON">Tarde</option>
                  <option value="EVENING">Noche</option>
                </select>
              </label>
              <label className="habits-field">
                <span>Icono</span>
                <input
                  value={draft.iconIdentifier ?? ''}
                  onChange={event => setDraft(current => ({ ...current, iconIdentifier: event.target.value }))}
                  placeholder="focus, water, journal..."
                />
              </label>
              <label className="habits-field">
                <span>Color</span>
                <input
                  type="color"
                  value={draft.colorHex ?? '#00D9FF'}
                  onChange={event => setDraft(current => ({ ...current, colorHex: event.target.value }))}
                />
              </label>
              {showPeriodTargetField && (
                <label className="habits-field">
                  <span>Meta del periodo</span>
                  <input
                    type="number"
                    min={1}
                    max={maxPeriodTarget}
                    value={normalizedTargetCount}
                    onChange={event => setDraft(current => ({
                      ...current,
                      targetCompletionsPerPeriod: Number(event.target.value) || 1,
                    }))}
                  />
                </label>
              )}
              <label className="habits-field">
                <span>Frecuencia</span>
                <select
                  value={draft.frequencyType}
                  onChange={event => setDraft(current => ({
                    ...current,
                    frequencyType: event.target.value as FrequencyType,
                  }))}
                >
                  {frequencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.optionLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label className="habits-field">
                <span>Duración objetivo</span>
                <input
                  type="number"
                  min={1}
                  value={draft.targetDurationMinutes}
                  onChange={event => setDraft(current => ({
                    ...current,
                    targetDurationMinutes: Number(event.target.value) || 1,
                  }))}
                />
              </label>
            </div>

            <div className="habits-frequency-guide">
              <div className="habits-frequency-guide-header">
                <p className="habits-section-label">Tipo de completitud</p>
                <span className="habits-frequency-pill">{selectedFrequency.chip}</span>
              </div>
              <strong>{selectedFrequency.completionRule(normalizedTargetCount)}</strong>
              <p>{selectedFrequency.description(normalizedTargetCount)}</p>
            </div>

            {draft.frequencyType === 'CUSTOM' && (
              <div className="habits-days-picker">
                {days.map(day => {
                  const isSelected = ((draft.customDaysMask >> day.bit) & 1) === 1
                  return (
                    <button
                      key={day.bit}
                      className={isSelected ? 'is-selected' : ''}
                      onClick={() => setDraft(current => ({
                        ...current,
                        customDaysMask: toggleBit(current.customDaysMask, day.bit),
                      }))}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            )}

            <label className="habits-inline-toggle">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={event => setDraft(current => ({ ...current, isActive: event.target.checked }))}
              />
              <span>Activo</span>
            </label>

            <div className="habits-actions">
              <button
                className="habits-primary-btn"
                disabled={!draft.name.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {editingId ? 'Guardar cambios' : 'Crear hábito'}
              </button>
              {(editingId || draft.name) && (
                <button
                  className="habits-secondary-btn"
                  onClick={() => {
                    setEditingId(null)
                    setDraft(emptyDraft)
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </section>

          <section className="habits-list-card">
            <div className="habits-list-header">
              <div>
                <p className="habits-section-label">Activos</p>
                <h2>{groupedHabits.active.length} en rotación</h2>
              </div>
            </div>

            <div className="habits-stack">
              {groupedHabits.active.map(habit => (
                <HabitListItem
                  key={habit.id}
                  habit={habit}
                  onEdit={() => {
                    setEditingId(habit.id)
                    setDraft({ ...habit })
                  }}
                  onArchive={() => updateUserHabit(habit.id, { isActive: false }).then(() => {
                    void queryClient.invalidateQueries({ queryKey: ['user-habits-admin'] })
                    void queryClient.invalidateQueries({ queryKey: ['user-habits'] })
                  })}
                  onDelete={() => deleteMutation.mutate(habit.id)}
                />
              ))}
            </div>

            {groupedHabits.archived.length > 0 && (
              <>
                <div className="habits-archived-header">
                  <p className="habits-section-label">Inactivos</p>
                  <h3>{groupedHabits.archived.length} pausados</h3>
                </div>
                <div className="habits-stack">
                  {groupedHabits.archived.map(habit => (
                    <HabitListItem
                      key={habit.id}
                      habit={habit}
                      onEdit={() => {
                        setEditingId(habit.id)
                        setDraft({ ...habit })
                      }}
                      onArchive={() => updateUserHabit(habit.id, { isActive: true }).then(() => {
                        void queryClient.invalidateQueries({ queryKey: ['user-habits-admin'] })
                        void queryClient.invalidateQueries({ queryKey: ['user-habits'] })
                      })}
                      onDelete={() => deleteMutation.mutate(habit.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}

function HabitListItem({
  habit,
  onEdit,
  onArchive,
  onDelete,
}: Readonly<{
  habit: UserHabit
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}>) {
  return (
    <article className="habit-item">
      <div className="habit-item-accent" style={{ background: habit.colorHex ?? '#00D9FF' }} />
      <div className="habit-item-copy">
        <strong>{habit.name}</strong>
        <span>
          {habit.dayBlock} · {frequencyLabels[habit.frequencyType]} · {describeHabitCompletion(habit)} · {habit.targetDurationMinutes} min
        </span>
      </div>
      <div className="habit-item-actions">
        <button onClick={onEdit}>Editar</button>
        <button onClick={onArchive}>{habit.isActive ? 'Pausar' : 'Activar'}</button>
        <button onClick={onDelete}>Eliminar</button>
      </div>
    </article>
  )
}

function hydrateDraftFromTemplate(
  template: HabitTemplate,
  habits: UserHabit[],
  dayBlock: DayBlock,
  setDraft: Dispatch<SetStateAction<HabitDraft>>,
) {
  setDraft(current => ({
    ...current,
    templateId: template.id,
    name: template.name,
    iconIdentifier: template.iconIdentifier,
    colorHex: template.colorHex,
    targetDurationMinutes: template.defaultDurationMinutes,
    sortOrder: nextSortOrder(habits, dayBlock),
  }))
}

function nextSortOrder(habits: UserHabit[], dayBlock: DayBlock): number {
  return habits.filter(habit => habit.dayBlock === dayBlock).length
}

function toggleBit(mask: number, bit: number): number {
  return mask ^ (1 << bit)
}

function describeHabitCompletion(habit: UserHabit): string {
  const targetCount = Math.max(1, habit.targetCompletionsPerPeriod || 1)

  switch (habit.frequencyType) {
    case 'DAILY':
      return 'cada día'
    case 'WEEKDAYS':
      return 'cada laborable'
    case 'WEEKLY':
      return formatPeriodTarget(targetCount, 'semana')
    case 'MONTHLY':
      return formatPeriodTarget(targetCount, 'mes')
    case 'CUSTOM':
      return 'días elegidos'
    default:
      return ''
  }
}

function formatPeriodTarget(targetCount: number, periodLabel: 'semana' | 'mes'): string {
  if (targetCount === 1) {
    return `1 vez por ${periodLabel}`
  }

  return `${targetCount} veces por ${periodLabel}`
}
