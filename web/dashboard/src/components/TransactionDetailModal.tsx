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
    return { text: '—', color: '#5E677A' }
  }
  if (key === 'amount') {
    return {
      text: formatSignedAmount(txnType, Number(value)),
      color: amountColor(txnType) ?? '#E8FFFF',
    }
  }
  if (typeof value === 'boolean') {
    return { text: value ? 'Yes' : 'No', color: value ? '#39FF14' : '#5E677A' }
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
        backgroundColor: 'rgba(4, 8, 18, 0.72)',
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
          backgroundColor: '#0C1426',
          border: '1px solid rgba(0, 217, 255, 0.18)',
          borderRadius: '14px',
          boxShadow: '0 18px 50px rgba(0, 0, 0, 0.55)',
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
            borderBottom: '1px solid rgba(232, 255, 255, 0.08)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#00D9FF', fontSize: '1.1rem' }}>Transaction Detail</h3>
            <div style={{ fontSize: '0.78rem', color: '#5E677A', marginTop: '0.2rem' }}>
              {data?.merchant_name ? String(data.merchant_name) : `ID ${transactionId}`}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: '1px solid rgba(232, 255, 255, 0.18)',
              color: '#E8FFFF',
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
          {isLoading && <div style={{ color: '#5E677A', padding: '1rem 0' }}>Loading…</div>}
          {error && (
            <div style={{ color: '#ff6b6b', padding: '1rem 0' }}>
              Error al cargar el detalle de la transacción.
            </div>
          )}
          {!isLoading && !error && entries.length === 0 && (
            <div style={{ color: '#5E677A', padding: '1rem 0' }}>Transacción no encontrada.</div>
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
                    borderBottom: '1px solid rgba(232, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ color: '#5E677A', fontSize: '0.82rem' }}>{prettyLabel(key)}</div>
                  <div
                    style={{
                      color: color ?? '#E8FFFF',
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
