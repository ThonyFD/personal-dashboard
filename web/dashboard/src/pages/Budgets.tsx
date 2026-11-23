import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { panamaDate } from '@personal-dashboard/supabase-queries'
import {
  createBudget,
  deleteBudget,
  fetchAlertSettings,
  fetchBudgets,
  fetchBudgetStatus,
  updateAlertSettings,
  updateBudget,
  type AlertSettings,
  type Budget,
  type BudgetStatus,
} from '../api/budgets-client'
import { fetchCategories } from '../api/categories-client'
import { formatCurrency } from '../utils/format'
import { useChartColors } from '../theme/AppearanceContext'

// Budgets used to live only in this browser. The page offers to import them once.
const LEGACY_STORAGE_KEY = 'financial_budgets'

interface LegacyBudget {
  categoryId: number
  categoryName: string
  monthlyLimit: number
  isActive: boolean
}

function readLegacyBudgets(): LegacyBudget[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((b) => b && b.isActive && Number(b.categoryId) > 0 && Number(b.monthlyLimit) > 0)
      : []
  } catch {
    return []
  }
}

function clearLegacyBudgets() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/** Keeps only `items` in the browser; removes the key when nothing is left. */
function keepLegacyBudgets(items: LegacyBudget[]) {
  if (items.length === 0) {
    clearLegacyBudgets()
    return
  }
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage blocked: the in-memory list still shows what is left.
  }
}

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const day = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${yearMonth}-${String(day).padStart(2, '0')}`
}

const money = (value: number) => `$${formatCurrency(value)}`

type Level = 'ok' | 'warning' | 'over'

function levelOf(row: BudgetStatus): Level {
  const pct = (row.spent / row.monthlyLimit) * 100
  if (pct >= 100) return 'over'
  if (pct >= 80) return 'warning'
  return 'ok'
}

const LEVEL_COLOR: Record<Level, string> = {
  ok: 'var(--c-green)',
  warning: 'var(--c-warning)',
  over: 'var(--c-negative)',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid var(--c-hairline)',
  borderRadius: '4px',
  background: 'var(--c-surface)',
  color: 'inherit',
  fontSize: '0.9rem',
}

const labelStyle: CSSProperties = { display: 'block', marginBottom: '0.35rem', fontWeight: 500, fontSize: '0.9rem' }

function buttonStyle(kind: 'primary' | 'ghost' | 'danger'): CSSProperties {
  const base: CSSProperties = {
    padding: '0.45rem 0.9rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    border: '1px solid transparent',
  }
  if (kind === 'primary') return { ...base, backgroundColor: 'var(--c-green)', color: 'var(--c-on-accent)' }
  if (kind === 'danger') return { ...base, backgroundColor: 'var(--c-negative)', color: 'var(--c-on-accent)' }
  return { ...base, backgroundColor: 'transparent', color: 'inherit', borderColor: 'var(--c-hairline)' }
}

interface FormState {
  id?: number
  categoryId: number | ''
  label: string
  emoji: string
  monthlyLimit: string
}

export default function Budgets() {
  const chart = useChartColors()
  const queryClient = useQueryClient()

  const currentMonth = panamaDate(new Date()).slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const isCurrentMonth = selectedMonth === currentMonth
  // Current month: let the database use today (Panama). Past months: their last day.
  const asOf = isCurrentMonth ? undefined : lastDayOfMonth(selectedMonth)

  const [form, setForm] = useState<FormState | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [legacy, setLegacy] = useState<LegacyBudget[]>(() => readLegacyBudgets())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const statusQuery = useQuery({ queryKey: ['budget-status', asOf ?? 'today'], queryFn: () => fetchBudgetStatus(asOf) })
  const budgetsQuery = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: () => fetchCategories() })
  const settingsQuery = useQuery({ queryKey: ['alert-settings'], queryFn: fetchAlertSettings })

  const status = statusQuery.data ?? []
  const budgets = budgetsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  const refreshBudgets = () => {
    queryClient.invalidateQueries({ queryKey: ['budget-status'] })
    queryClient.invalidateQueries({ queryKey: ['budgets'] })
  }

  const saveMutation = useMutation({
    mutationFn: async (f: FormState) => {
      const monthlyLimit = Number(f.monthlyLimit)
      if (f.id) {
        await updateBudget(f.id, { label: f.label.trim(), emoji: f.emoji.trim() || '💸', monthlyLimit })
      } else {
        await createBudget({
          categoryId: Number(f.categoryId),
          label: f.label.trim(),
          emoji: f.emoji.trim() || '💸',
          monthlyLimit,
        })
      }
    },
    onSuccess: (_d, f) => {
      refreshBudgets()
      setForm(null)
      showToast(f.id ? 'Presupuesto actualizado' : 'Presupuesto creado', 'success')
    },
    onError: () => showToast('No se pudo guardar el presupuesto', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: (b: Budget) => updateBudget(b.id, { isActive: !b.isActive }),
    onSuccess: refreshBudgets,
    onError: () => showToast('No se pudo cambiar el presupuesto', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBudget(id),
    onSuccess: () => {
      refreshBudgets()
      setConfirmDeleteId(null)
      showToast('Presupuesto eliminado', 'success')
    },
    onError: () => showToast('No se pudo eliminar el presupuesto', 'error'),
  })

  // Only entries that end up in the database leave the browser. An entry whose
  // category no longer exists stays in localStorage, so nothing is lost silently.
  const importMutation = useMutation({
    mutationFn: async (items: LegacyBudget[]) => {
      const existing = new Set(budgets.map((b) => b.categoryId))
      const leftover: LegacyBudget[] = []
      let imported = 0
      for (const item of items) {
        if (existing.has(Number(item.categoryId))) continue
        const category = categories.find((c) => c.id === Number(item.categoryId))
        if (!category) {
          leftover.push(item)
          continue
        }
        await createBudget({
          categoryId: category.id,
          label: category.name,
          emoji: category.icon || '💸',
          monthlyLimit: Number(item.monthlyLimit),
        })
        existing.add(category.id)
        imported++
      }
      return { imported, leftover }
    },
    onSuccess: ({ imported, leftover }) => {
      keepLegacyBudgets(leftover)
      setLegacy(leftover)
      refreshBudgets()
      if (leftover.length === 0) {
        showToast('Presupuestos importados', 'success')
      } else {
        showToast(`Se importaron ${imported}. ${leftover.length} quedaron en el navegador porque su categoría ya no existe.`, 'error')
      }
    },
    // A failure halfway leaves storage untouched; the ones already created are
    // skipped on the next try because their category already has a budget.
    onError: () => {
      refreshBudgets()
      showToast('No se pudieron importar. Intenta de nuevo.', 'error')
    },
  })

  const budgetByCategory = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b])), [budgets])
  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? `Categoría ${id}`
  const pausedBudgets = budgets.filter((b) => !b.isActive)
  const freeCategories = categories.filter((c) => !budgetByCategory.has(c.id))

  const totals = useMemo(() => {
    const limit = status.reduce((s, r) => s + r.monthlyLimit, 0)
    const spent = status.reduce((s, r) => s + r.spent, 0)
    return { limit, spent, remaining: limit - spent, flagged: status.filter((r) => levelOf(r) !== 'ok').length }
  }, [status])

  const openCreate = () => {
    const first = freeCategories[0]
    setForm({ categoryId: first?.id ?? '', label: first?.name ?? '', emoji: first?.icon ?? '💸', monthlyLimit: '' })
  }

  const openEdit = (b: Budget) =>
    setForm({ id: b.id, categoryId: b.categoryId, label: b.label, emoji: b.emoji, monthlyLimit: String(b.monthlyLimit) })

  const submitForm = (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    if (!form.id && form.categoryId === '') return
    if (!(Number(form.monthlyLimit) > 0) || !form.label.trim()) return
    saveMutation.mutate(form)
  }

  if (statusQuery.isLoading || budgetsQuery.isLoading) {
    return <div className="loading">Cargando presupuestos...</div>
  }

  if (statusQuery.isError || budgetsQuery.isError) {
    return (
      <div className="card">
        <h2>Presupuestos</h2>
        <p style={{ color: 'var(--c-negative)' }}>
          No se pudieron cargar los presupuestos. Si acabas de actualizar, confirma que la migración de presupuestos ya se aplicó en Supabase.
        </p>
      </div>
    )
  }

  const pendingLegacy = legacy.filter((l) => !budgetByCategory.has(Number(l.categoryId)))
  // Without categories every entry would be skipped, so importing is blocked.
  const categoriesUnavailable = categoriesQuery.isLoading || categoriesQuery.isError || categories.length === 0

  return (
    <div>
      {toast && (
        <div role="status" className="skin-flat-card" style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 2000,
          padding: '0.75rem 1.25rem', borderRadius: '6px',
          backgroundColor: toast.type === 'success' ? 'var(--c-green)' : 'var(--c-negative)',
          color: 'var(--c-on-accent)', fontWeight: 500,
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Presupuestos</h1>
          <p style={{ margin: 0, color: 'var(--c-text-2)', fontSize: '0.9rem' }}>
            Tope mensual por categoría. Las alertas push usan estas mismas cifras.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            Mes
            <input
              type="month"
              value={selectedMonth}
              max={currentMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              style={{ ...inputStyle, width: 'auto' }}
            />
          </label>
          <button type="button" onClick={openCreate} disabled={freeCategories.length === 0} style={buttonStyle('primary')}>
            Nuevo presupuesto
          </button>
        </div>
      </div>

      {pendingLegacy.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--c-warning)' }}>
          <p style={{ marginTop: 0 }}>
            Hay {pendingLegacy.length} presupuesto{pendingLegacy.length > 1 ? 's' : ''} guardado{pendingLegacy.length > 1 ? 's' : ''} solo en este navegador.
            Impórtalos para que las alertas los usen.
          </p>
          {categoriesUnavailable && !categoriesQuery.isLoading && (
            <p style={{ color: 'var(--c-negative)', fontSize: '0.85rem' }}>
              No se pudieron cargar las categorías. Recarga la página antes de importar; tus presupuestos siguen guardados en este navegador.
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" style={buttonStyle('primary')} disabled={importMutation.isPending || categoriesUnavailable}
              onClick={() => importMutation.mutate(pendingLegacy)}>
              {importMutation.isPending ? 'Importando...' : 'Importar'}
            </button>
            <button type="button" style={buttonStyle('ghost')} disabled={importMutation.isPending}
              onClick={() => { clearLegacyBudgets(); setLegacy([]) }}>
              Descartar
            </button>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <h3>Tope total</h3>
          <div className="value">{money(totals.limit)}</div>
        </div>
        <div className="stat-card">
          <h3>Gastado</h3>
          <div className="value">{money(totals.spent)}</div>
        </div>
        <div className="stat-card">
          <h3>{totals.remaining < 0 ? 'Excedido' : 'Restante'}</h3>
          <div className="value" style={{ color: totals.remaining < 0 ? 'var(--c-negative)' : 'var(--c-green)' }}>
            {money(Math.abs(totals.remaining))}
          </div>
        </div>
        <div className="stat-card">
          <h3>En alerta</h3>
          <div className="value" style={{ color: totals.flagged > 0 ? 'var(--c-warning)' : undefined }}>{totals.flagged}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', marginTop: '0.5rem' }}>80 % o más del tope</div>
        </div>
      </div>

      {status.length === 0 ? (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ margin: 0 }}>Todavía no hay presupuestos activos. Crea uno para empezar a recibir alertas.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {status.map((row) => {
            const budget = budgetByCategory.get(row.categoryId)
            const level = levelOf(row)
            const pct = (row.spent / row.monthlyLimit) * 100
            const perDay = row.remaining > 0 && row.daysLeft > 0 ? row.remaining / row.daysLeft : 0
            return (
              <div key={row.categoryId} className="card" style={{ margin: 0, borderTop: `3px solid ${LEVEL_COLOR[level]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>{row.emoji} {row.label}</h3>
                  <span style={{ color: LEVEL_COLOR[level], fontWeight: 600 }}>{Math.floor(pct)} %</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-text-2)', marginBottom: '0.75rem' }}>{categoryName(row.categoryId)}</div>

                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(pct))}
                  aria-label={`${row.label}: ${Math.floor(pct)} % del tope`}
                  style={{ height: '8px', borderRadius: '4px', background: 'var(--c-surface-2)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: LEVEL_COLOR[level] }} />
                </div>

                <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                  <div>{money(row.spent)} de {money(row.monthlyLimit)}</div>
                  {row.remaining >= 0 ? (
                    <div>Te quedan <strong>{money(row.remaining)}</strong>{isCurrentMonth ? ` para ${row.daysLeft} ${row.daysLeft === 1 ? 'día' : 'días'}` : ''}</div>
                  ) : (
                    <div style={{ color: 'var(--c-negative)' }}>Te pasaste <strong>{money(-row.remaining)}</strong></div>
                  )}
                  {isCurrentMonth && (
                    <div style={{ color: 'var(--c-text-2)' }}>
                      Disponible por día: <strong style={{ color: 'inherit' }}>{money(perDay)}</strong>
                    </div>
                  )}
                </div>

                {budget && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                    <button type="button" style={buttonStyle('ghost')} onClick={() => openEdit(budget)}>Editar</button>
                    <button type="button" style={buttonStyle('ghost')} disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate(budget)}>Pausar</button>
                    {confirmDeleteId === budget.id ? (
                      <button type="button" style={buttonStyle('danger')} disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(budget.id)}>Sí, eliminar</button>
                    ) : (
                      <button type="button" style={buttonStyle('ghost')} onClick={() => setConfirmDeleteId(budget.id)}>Eliminar</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {status.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Gastado vs tope</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={status.map((r) => ({ name: r.label, Tope: r.monthlyLimit, Gastado: r.spent }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="name" tick={{ fill: chart.text }} />
              <YAxis tick={{ fill: chart.text }} />
              <Tooltip formatter={(value: number) => money(value)} />
              <Legend />
              <Bar dataKey="Tope" fill="var(--c-green)" />
              <Bar dataKey="Gastado" fill="var(--c-violet)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {pausedBudgets.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Pausados</h2>
          <p style={{ marginTop: 0, color: 'var(--c-text-2)', fontSize: '0.9rem' }}>No cuentan para las alertas.</p>
          {pausedBudgets.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderTop: '1px solid var(--c-hairline)', flexWrap: 'wrap' }}>
              <span>{b.emoji} {b.label} · {money(b.monthlyLimit)}</span>
              <span style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" style={buttonStyle('ghost')} disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(b)}>Activar</button>
                {confirmDeleteId === b.id ? (
                  <button type="button" style={buttonStyle('danger')} disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(b.id)}>Sí, eliminar</button>
                ) : (
                  <button type="button" style={buttonStyle('ghost')} onClick={() => setConfirmDeleteId(b.id)}>Eliminar</button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <AlertSettingsCard
        settings={settingsQuery.data ?? null}
        loading={settingsQuery.isLoading}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['alert-settings'] })
          showToast('Alertas guardadas', 'success')
        }}
        onError={() => showToast('No se pudieron guardar las alertas', 'error')}
      />

      {form && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, padding: '16px',
          backgroundColor: 'color-mix(in srgb, var(--c-scrim) 50%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <form onSubmit={submitForm} role="dialog" aria-modal="true" aria-labelledby="budget-form-title" style={{
            backgroundColor: 'var(--c-surface)', padding: '1.5rem', borderRadius: '8px', width: '420px', maxWidth: '100%',
          }}>
            <h3 id="budget-form-title" style={{ marginTop: 0 }}>{form.id ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h3>

            {!form.id && (
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="budget-category" style={labelStyle}>Categoría</label>
                <select id="budget-category" required value={form.categoryId} style={inputStyle}
                  onChange={(e) => {
                    const category = categories.find((c) => c.id === Number(e.target.value))
                    setForm({ ...form, categoryId: Number(e.target.value), label: category?.name ?? form.label, emoji: category?.icon || form.emoji })
                  }}>
                  {freeCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '4.5rem 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label htmlFor="budget-emoji" style={labelStyle}>Emoji</label>
                <input id="budget-emoji" value={form.emoji} maxLength={8} style={inputStyle}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
              </div>
              <div>
                <label htmlFor="budget-label" style={labelStyle}>Nombre en la alerta</label>
                <input id="budget-label" required value={form.label} maxLength={40} placeholder="Comida fuera" style={inputStyle}
                  onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="budget-limit" style={labelStyle}>Tope mensual (USD)</label>
              <input id="budget-limit" type="number" required min="0.01" step="0.01" inputMode="decimal" value={form.monthlyLimit} style={inputStyle}
                onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" style={buttonStyle('ghost')} disabled={saveMutation.isPending} onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" style={buttonStyle('primary')} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const CARD_DIGITS = /^\d{4}$/

function AlertSettingsCard({ settings, loading, onSaved, onError }: {
  settings: AlertSettings | null
  loading: boolean
  onSaved: () => void
  onError: () => void
}) {
  const [draft, setDraft] = useState<{ alertsEnabled: boolean; notifyEveryPurchase: boolean; threshold: string; cards: string } | null>(null)
  const [cardsError, setCardsError] = useState<string | null>(null)

  const current = draft ?? (settings ? {
    alertsEnabled: settings.alertsEnabled,
    notifyEveryPurchase: settings.notifyEveryPurchase,
    threshold: String(settings.bigPurchaseThreshold),
    cards: settings.frozenCards.join(', '),
  } : null)

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<AlertSettings>) => updateAlertSettings(patch),
    onSuccess: () => { setDraft(null); onSaved() },
    onError,
  })

  if (loading) return null
  if (!current) {
    return (
      <div className="card">
        <h2>Alertas push</h2>
        <p style={{ margin: 0, color: 'var(--c-text-2)' }}>Falta la fila de configuración en Supabase (alert_settings, id = 1).</p>
      </div>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const cards = current.cards.split(/[\s,]+/).filter(Boolean)
    const bad = cards.filter((c) => !CARD_DIGITS.test(c))
    if (bad.length > 0) {
      setCardsError('Usa solo los últimos 4 dígitos de cada tarjeta, separados por coma.')
      return
    }
    const threshold = Number(current.threshold)
    if (!(threshold > 0)) return
    setCardsError(null)
    saveMutation.mutate({
      alertsEnabled: current.alertsEnabled,
      notifyEveryPurchase: current.notifyEveryPurchase,
      bigPurchaseThreshold: threshold,
      frozenCards: [...new Set(cards)],
    })
  }

  const set = (patch: Partial<typeof current>) => setDraft({ ...current, ...patch })

  return (
    <form className="card" onSubmit={submit}>
      <h2>Alertas push</h2>
      <p style={{ marginTop: 0, color: 'var(--c-text-2)', fontSize: '0.9rem' }}>
        Cada compra nueva puede mandar un aviso con lo que queda del tope de su categoría.
      </p>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <input type="checkbox" checked={current.alertsEnabled} onChange={(e) => set({ alertsEnabled: e.target.checked })} />
        Alertas activadas
      </label>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input type="checkbox" checked={current.notifyEveryPurchase} onChange={(e) => set({ notifyEveryPurchase: e.target.checked })} />
        Avisar en cada compra (si no, solo desde el 80 % del tope)
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label htmlFor="alert-threshold" style={labelStyle}>Compra grande desde (USD)</label>
          <input id="alert-threshold" type="number" min="1" step="0.01" inputMode="decimal" required value={current.threshold} style={inputStyle}
            onChange={(e) => set({ threshold: e.target.value })} />
        </div>
        <div>
          <label htmlFor="alert-cards" style={labelStyle}>Tarjetas apagadas (últimos 4 dígitos)</label>
          <input id="alert-cards" value={current.cards} placeholder="1234, 5678" inputMode="numeric" style={inputStyle}
            aria-invalid={cardsError ? true : undefined} aria-describedby={cardsError ? 'alert-cards-error' : undefined}
            onChange={(e) => set({ cards: e.target.value })} />
          {cardsError && <div id="alert-cards-error" style={{ color: 'var(--c-negative)', fontSize: '0.8rem', marginTop: '0.35rem' }}>{cardsError}</div>}
        </div>
      </div>

      <button type="submit" style={buttonStyle('primary')} disabled={saveMutation.isPending || draft === null}>
        {saveMutation.isPending ? 'Guardando...' : 'Guardar alertas'}
      </button>
    </form>
  )
}
