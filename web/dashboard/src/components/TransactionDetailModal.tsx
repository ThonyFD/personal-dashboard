import { useQuery } from '@tanstack/react-query'
import { fetchTransactionDetail } from '../api/supabase-data-client'
import { formatSignedAmount, amountColor } from '../utils/format'

interface TransactionDetailModalProps {
  transactionId: number | null
  onClose: () => void
}

// Human-readable label for a snake_case column name.
function prettyLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/, 'ID')
    .replace(/Last4/, 'Last 4')
}

// Render any DB value as a display string. Special-cases amount, booleans and nulls.
function renderValue(key: string, value: unknown, txnType: string): { text: string; color?: string } {
  if (value === null || value === undefined || value === '') {
    return { text: '—', color: 'var(--c-muted)' }
  }
  if (key === 'amount') {
    return {
      text: formatSignedAmount(txnType, Number(value)),
      color: amountColor(txnType) ?? 'var(--c-text)',
    }
  }
  if (typeof value === 'boolean') {
    return { text: value ? 'Yes' : 'No', color: value ? 'var(--c-green)' : 'var(--c-muted)' }
  }
  if (typeof value === 'object') {
    return { text: JSON.stringify(value) }
  }
  return { text: String(value) }
}

export function TransactionDetailModal({ transactionId, onClose }: TransactionDetailModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction-detail', transactionId],
    queryFn: () => fetchTransactionDetail(transactionId as number),
    enabled: transactionId !== null,
  })

  if (transactionId === null) return null

  const txnType = (data?.txn_type as string) ?? ''
  const entries = data ? Object.entries(data) : []

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'color-mix(in srgb, var(--c-scrim) 72%, transparent)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: '14px',
          boxShadow: '0 18px 50px color-mix(in srgb, var(--c-scrim) 55%, transparent)',
          width: '560px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid color-mix(in srgb, var(--c-text) 8%, transparent)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: 'var(--c-primary)', fontSize: '1.1rem' }}>Transaction Detail</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--c-muted)', marginTop: '0.2rem' }}>
              {data?.merchant_name ? String(data.merchant_name) : `ID ${transactionId}`}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: '1px solid color-mix(in srgb, var(--c-text) 18%, transparent)',
              color: 'var(--c-text)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '0.8rem 1.4rem 1.3rem', overflowY: 'auto' }}>
          {isLoading && <div style={{ color: 'var(--c-muted)', padding: '1rem 0' }}>Loading…</div>}
          {error && (
            <div style={{ color: 'var(--c-negative)', padding: '1rem 0' }}>
              Error al cargar el detalle de la transacción.
            </div>
          )}
          {!isLoading && !error && entries.length === 0 && (
            <div style={{ color: 'var(--c-muted)', padding: '1rem 0' }}>Transacción no encontrada.</div>
          )}
          {!isLoading && !error &&
            entries.map(([key, value]) => {
              const { text, color } = renderValue(key, value, txnType)
              return (
                <div
                  key={key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40% 60%',
                    gap: '0.75rem',
                    padding: '0.55rem 0',
                    borderBottom: '1px solid color-mix(in srgb, var(--c-text) 5%, transparent)',
                  }}
                >
                  <div style={{ color: 'var(--c-muted)', fontSize: '0.82rem' }}>{prettyLabel(key)}</div>
                  <div
                    style={{
                      color: color ?? 'var(--c-text)',
                      fontSize: '0.86rem',
                      fontWeight: 500,
                      wordBreak: 'break-word',
                    }}
                  >
                    {text}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
