import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
import './Budgets.css'

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

type ButtonKind = 'primary' | 'ghost' | 'danger'

/** Class list for a page button; `extra` adds size or tone modifiers. */
const btn = (kind: ButtonKind, extra = '') => `budgets-btn budgets-btn--${kind}${extra ? ` ${extra}` : ''}`
const CARD_ACTION = 'budgets-btn--sm budgets-btn--quiet'

const levelVar = (level: Level) => ({ '--level': LEVEL_COLOR[level] }) as CSSProperties

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

  // Escape closes the dialog, unless a save is in flight.
  const dialogOpen = form !== null
  const savePending = saveMutation.isPending
  useEffect(() => {
    if (!dialogOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savePending) setForm(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogOpen, savePending])

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
    <div className="budgets-page">
      {toast && (
        <div role="status" className="skin-flat-card budgets-toast"
          style={{ backgroundColor: toast.type === 'success' ? 'var(--c-green)' : 'var(--c-negative)' }}>
          {toast.message}
        </div>
      )}

      <div className="budgets-header">
        <div>
          <h1>Presupuestos</h1>
          <p>Tope mensual por categoría. Las alertas push usan estas mismas cifras.</p>
        </div>
        <div className="budgets-toolbar">
          <label className="budgets-month">
            Mes
            <input
              type="month"
              className="budgets-field"
              value={selectedMonth}
              max={currentMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              style={{ width: 'auto' }}
            />
          </label>
          <button type="button" className={btn('primary')} onClick={openCreate} disabled={freeCategories.length === 0}
            title={freeCategories.length === 0 ? 'Todas las categorías ya tienen presupuesto' : undefined}>
            Nuevo presupuesto
          </button>
        </div>
      </div>

      {pendingLegacy.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--c-warning)' }}>
          <p style={{ marginTop: 0, marginBottom: '0.75rem' }}>
            Hay {pendingLegacy.length} presupuesto{pendingLegacy.length > 1 ? 's' : ''} guardado{pendingLegacy.length > 1 ? 's' : ''} solo en este navegador.
            Impórtalos para que las alertas los usen.
          </p>
          {categoriesUnavailable && !categoriesQuery.isLoading && (
            <p style={{ color: 'var(--c-negative)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              No se pudieron cargar las categorías. Recarga la página antes de importar; tus presupuestos siguen guardados en este navegador.
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className={btn('primary')} disabled={importMutation.isPending || categoriesUnavailable}
              onClick={() => importMutation.mutate(pendingLegacy)}>
              {importMutation.isPending ? 'Importando...' : 'Importar'}
            </button>
            <button type="button" className={btn('ghost')} disabled={importMutation.isPending}
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
        <div className="card budgets-empty">
          <p>Todavía no hay presupuestos activos. Crea uno para empezar a recibir alertas.</p>
          {freeCategories.length > 0 && (
            <button type="button" className={btn('primary')} onClick={openCreate}>Crear presupuesto</button>
          )}
        </div>
      ) : (
        <div className="budgets-grid">
          {status.map((row) => {
            const budget = budgetByCategory.get(row.categoryId)
            const level = levelOf(row)
            const pct = (row.spent / row.monthlyLimit) * 100
            const perDay = row.remaining > 0 && row.daysLeft > 0 ? row.remaining / row.daysLeft : 0
            return (
              <div key={row.categoryId} className="card budget-card" style={{
                ...levelVar(level),
                borderColor: level === 'ok' ? undefined : `color-mix(in srgb, ${LEVEL_COLOR[level]} 40%, transparent)`,
              }}>
                <div className="budget-card__head">
                  <div>
                    <h3 className="budget-card__title">{row.emoji} {row.label}</h3>
                    <div className="budget-card__category">{categoryName(row.categoryId)}</div>
                  </div>
                  <span className="budget-pill">{Math.floor(pct)} %</span>
                </div>

                <div role="progressbar" className="budget-bar" aria-valuemin={0} aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(pct))} aria-label={`${row.label}: ${Math.floor(pct)} % del tope`}>
                  <div className="budget-bar__fill" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>

                <div className="budget-card__amount">
                  {money(row.spent)} <span>de {money(row.monthlyLimit)}</span>
                </div>
                <div className="budget-card__meta">
                  {row.remaining >= 0 ? (
                    <div>Te quedan <strong>{money(row.remaining)}</strong>{isCurrentMonth ? ` para ${row.daysLeft} ${row.daysLeft === 1 ? 'día' : 'días'}` : ''}</div>
                  ) : (
                    <div style={{ color: 'var(--c-negative)' }}>Te pasaste <strong style={{ color: 'inherit' }}>{money(-row.remaining)}</strong></div>
                  )}
                  {isCurrentMonth && perDay > 0 && (
                    <div>Disponible por día: <strong>{money(perDay)}</strong></div>
                  )}
                </div>

                {budget && (
                  <div className="budget-card__actions">
                    <button type="button" className={btn('ghost', CARD_ACTION)} onClick={() => openEdit(budget)}>Editar</button>
                    <button type="button" className={btn('ghost', CARD_ACTION)} disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate(budget)}>Pausar</button>
                    {confirmDeleteId === budget.id ? (
                      <>
                        <button type="button" className={btn('danger', 'budgets-btn--sm')} disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(budget.id)}>Sí, eliminar</button>
                        <button type="button" className={btn('ghost', CARD_ACTION)} onClick={() => setConfirmDeleteId(null)}>No</button>
                      </>
                    ) : (
                      <button type="button" className={btn('ghost', `${CARD_ACTION} budgets-btn--quiet-danger`)}
                        onClick={() => setConfirmDeleteId(budget.id)}>Eliminar</button>
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
          <p className="budgets-section-hint">
            Barra gris: tope. Barra de color: gastado (verde bien, ámbar desde 80 %, rojo excedido).
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={status.map((r) => ({ name: r.label, Tope: r.monthlyLimit, Gastado: r.spent, level: levelOf(r) }))}
              barSize={28} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chart.text, fontSize: 12 }} tickLine={false} axisLine={{ stroke: chart.grid }} />
              <YAxis tick={{ fill: chart.text, fontSize: 12 }} tickLine={false} axisLine={false} width={56}
                tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                formatter={(value: number) => money(value)}
                cursor={{ fill: chart.grid, opacity: 0.35 }}
                contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.grid}`, borderRadius: 8 }}
                labelStyle={{ color: chart.text, marginBottom: 4 }}
                itemStyle={{ color: chart.text }}
              />
              <Bar dataKey="Tope" fill="var(--c-muted)" fillOpacity={0.35} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastado" radius={[4, 4, 0, 0]}>
                {status.map((r) => <Cell key={r.categoryId} fill={LEVEL_COLOR[levelOf(r)]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {pausedBudgets.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Pausados</h2>
          <p className="budgets-section-hint">No cuentan para las alertas.</p>
          {pausedBudgets.map((b) => (
            <div key={b.id} className="budgets-paused-row">
              <span>{b.emoji} {b.label} · {money(b.monthlyLimit)}</span>
              <span style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="button" className={btn('ghost', 'budgets-btn--sm')} disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(b)}>Activar</button>
                {confirmDeleteId === b.id ? (
                  <>
                    <button type="button" className={btn('danger', 'budgets-btn--sm')} disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(b.id)}>Sí, eliminar</button>
                    <button type="button" className={btn('ghost', CARD_ACTION)} onClick={() => setConfirmDeleteId(null)}>No</button>
                  </>
                ) : (
                  <button type="button" className={btn('ghost', `${CARD_ACTION} budgets-btn--quiet-danger`)}
                    onClick={() => setConfirmDeleteId(b.id)}>Eliminar</button>
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
        <div className="budgets-scrim"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !saveMutation.isPending) setForm(null) }}>
          <form onSubmit={submitForm} role="dialog" aria-modal="true" aria-labelledby="budget-form-title" className="budgets-dialog">
            <h3 id="budget-form-title">{form.id ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h3>
            <p className="budgets-dialog__hint">
              {form.id ? categoryName(form.categoryId as number) : 'Elige la categoría y cuánto quieres gastar como máximo al mes.'}
            </p>

            {!form.id && (
              <div className="budgets-dialog__row">
                <label htmlFor="budget-category" className="budgets-label">Categoría</label>
                <select id="budget-category" required autoFocus value={form.categoryId} className="budgets-field"
                  onChange={(e) => {
                    const category = categories.find((c) => c.id === Number(e.target.value))
                    setForm({ ...form, categoryId: Number(e.target.value), label: category?.name ?? form.label, emoji: category?.icon || form.emoji })
                  }}>
                  {freeCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            )}

            <div className="budgets-dialog__pair">
              <div>
                <label htmlFor="budget-emoji" className="budgets-label">Emoji</label>
                <input id="budget-emoji" value={form.emoji} maxLength={8} className="budgets-field" style={{ textAlign: 'center' }}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
              </div>
              <div>
                <label htmlFor="budget-label" className="budgets-label">Nombre en la alerta</label>
                <input id="budget-label" required autoFocus={Boolean(form.id)} value={form.label} maxLength={40} placeholder="Comida fuera"
                  className="budgets-field" onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
            </div>

            <div className="budgets-dialog__row">
              <label htmlFor="budget-limit" className="budgets-label">Tope mensual (USD)</label>
              <input id="budget-limit" type="number" required min="0.01" step="0.01" inputMode="decimal" placeholder="300.00"
                value={form.monthlyLimit} className="budgets-field"
                onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })} />
            </div>

            <div className="budgets-dialog__actions">
              <button type="button" className={btn('ghost')} disabled={saveMutation.isPending} onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className={btn('primary')} disabled={saveMutation.isPending}>
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
      <p className="budgets-section-hint">
        Cada compra nueva puede mandar un aviso con lo que queda del tope de su categoría.
      </p>

      <label className="budgets-check">
        <input type="checkbox" checked={current.alertsEnabled} onChange={(e) => set({ alertsEnabled: e.target.checked })} />
        Alertas activadas
      </label>

      <label className="budgets-check">
        <input type="checkbox" checked={current.notifyEveryPurchase} onChange={(e) => set({ notifyEveryPurchase: e.target.checked })} />
        Avisar en cada compra (si no, solo desde el 80 % del tope)
      </label>

      <div className="budgets-alert-fields">
        <div>
          <label htmlFor="alert-threshold" className="budgets-label">Compra grande desde (USD)</label>
          <input id="alert-threshold" type="number" min="1" step="0.01" inputMode="decimal" required value={current.threshold}
            className="budgets-field" onChange={(e) => set({ threshold: e.target.value })} />
        </div>
        <div>
          <label htmlFor="alert-cards" className="budgets-label">Tarjetas apagadas (últimos 4 dígitos)</label>
          <input id="alert-cards" value={current.cards} placeholder="1234, 5678" inputMode="numeric" className="budgets-field"
            aria-invalid={cardsError ? true : undefined} aria-describedby={cardsError ? 'alert-cards-error' : undefined}
            onChange={(e) => set({ cards: e.target.value })} />
          {cardsError && <div id="alert-cards-error" style={{ color: 'var(--c-negative)', fontSize: '0.8rem', marginTop: '0.35rem' }}>{cardsError}</div>}
        </div>
      </div>

      <button type="submit" className={btn('primary')} disabled={saveMutation.isPending || draft === null}>
        {saveMutation.isPending ? 'Guardando...' : 'Guardar alertas'}
      </button>
    </form>
  )
}
