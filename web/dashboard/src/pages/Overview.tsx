import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../api/supabase-data-client'
import { format, parse } from 'date-fns'
import { formatCurrency, formatSignedAmount, amountColor } from '../utils/format'
import { useState, useMemo } from 'react'
import { getDateRange, type PeriodType } from '../utils/dateRange'
import { TransactionDetailModal } from '../components/TransactionDetailModal'

const GITHUB_OWNER = 'ThonyFD'
const GITHUB_REPO = 'personal-dashboard'
const WORKFLOW_FILE = 'daily-email-sync.yml'
const GITHUB_REF = 'main'

async function triggerEmailSync(lookbackDays?: number): Promise<void> {
  const token = import.meta.env.VITE_GITHUB_TOKEN
  if (!token) throw new Error('VITE_GITHUB_TOKEN is not set')

  const body: Record<string, unknown> = { ref: GITHUB_REF }
  if (lookbackDays) body.inputs = { lookback_days: String(lookbackDays) }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${text}`)
  }
}

const SYNC_BUTTON_STYLES: Record<string, { background: string; color: string; border: string }> = {
  success: { background: '#041a00', color: '#39FF14', border: '1px solid rgba(57, 255, 20, 0.4)' },
  error: { background: '#150707', color: '#ff6b6b', border: '1px solid rgba(229, 62, 62, 0.4)' },
  idle: { background: '#001720', color: '#00D9FF', border: '1px solid rgba(0, 217, 255, 0.35)' },
  loading: { background: '#001720', color: 'rgba(0, 217, 255, 0.5)', border: '1px solid rgba(0, 217, 255, 0.15)' },
}

const SYNC_BUTTON_LABELS: Record<string, string> = {
  loading: 'Syncing...',
  success: 'Triggered!',
  error: 'Error',
  idle: 'Sync Emails',
}

function SyncButton({ syncState, onClick }: Readonly<{ syncState: string; onClick: () => void }>) {
  const btnStyle = SYNC_BUTTON_STYLES[syncState] ?? SYNC_BUTTON_STYLES.idle
  return (
    <button
      onClick={onClick}
      disabled={syncState === 'loading'}
      style={{
        padding: '0.4rem 0.9rem',
        border: btnStyle.border,
        borderRadius: '6px',
        backgroundColor: btnStyle.background,
        color: btnStyle.color,
        cursor: syncState === 'loading' ? 'not-allowed' : 'pointer',
        fontSize: '0.85rem',
        fontWeight: '600',
        opacity: syncState === 'loading' ? 0.7 : 1,
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
      }}
    >
      {SYNC_BUTTON_LABELS[syncState] ?? 'Sync Emails'}
    </button>
  )
}

export default function Overview() {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [syncDays, setSyncDays] = useState<string>('')
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [syncError, setSyncError] = useState<string>('')
  const [selectedTxnId, setSelectedTxnId] = useState<number | null>(null)

  async function handleSync() {
    setSyncState('loading')
    setSyncError('')
    try {
      const days = syncDays ? parseInt(syncDays, 10) : undefined
      await triggerEmailSync(days)
      setSyncState('success')
      setTimeout(() => setSyncState('idle'), 4000)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Unknown error')
      setSyncState('error')
    }
  }

  // Calculate current date range based on period selection
  const dateRange = useMemo(
    () => getDateRange(periodType, periodOffset),
    [periodType, periodOffset]
  )

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', dateRange.startDate, dateRange.endDate],
    queryFn: () => fetchStats(dateRange.startDate, dateRange.endDate),
  })

  const allTransactions = stats?.transactions ?? []

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allTransactions.slice(startIndex, endIndex)
  }, [allTransactions, currentPage, itemsPerPage])

  const totalPages = Math.ceil(allTransactions.length / itemsPerPage)

  if (statsLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, color: '#E8FFFF', letterSpacing: '-0.03em' }}>Dashboard Overview</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="number"
            value={syncDays}
            onChange={e => setSyncDays(e.target.value)}
            placeholder="Days (optional)"
            min={1}
            disabled={syncState === 'loading'}
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.85rem',
              width: '130px',
            }}
          />
          <SyncButton syncState={syncState} onClick={handleSync} />
          {syncState === 'error' && (
            <span style={{ fontSize: '0.78rem', color: '#ff6b6b', maxWidth: '200px' }}>{syncError}</span>
          )}
        </div>
      </div>

      {/* Period Selector - Mobile Responsive */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '0.75rem',
        backgroundColor: '#111A2E',
        borderRadius: '10px',
        border: '1px solid rgba(0, 217, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '600', color: '#E8FFFF', fontSize: '0.85rem' }}>Period:</label>
          <select
            value={periodType}
            onChange={(e) => {
              setPeriodType(e.target.value as PeriodType)
              setPeriodOffset(0)
              setCurrentPage(1)
            }}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '1 1 auto', minWidth: '0' }}>
            <button
              onClick={() => {
                setPeriodOffset(offset => offset + 1)
                setCurrentPage(1)
              }}
              style={{
                padding: '0.4rem 0.6rem',
                border: '1px solid rgba(0, 217, 255, 0.18)',
                borderRadius: '6px',
                backgroundColor: '#111A2E',
                color: '#E8FFFF',
                cursor: 'pointer',
                fontSize: '1.1rem',
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Previous period"
            >
              ‹
            </button>

            <span style={{
              padding: '0.4rem 0.5rem',
              fontWeight: '600',
              color: '#E8FFFF',
              textAlign: 'center',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: '1 1 auto',
              minWidth: '0'
            }}>
              {dateRange.label}
            </span>

            <button
              onClick={() => {
                setPeriodOffset(offset => Math.max(0, offset - 1))
                setCurrentPage(1)
              }}
              disabled={periodOffset === 0}
              style={{
                padding: '0.4rem 0.6rem',
                border: '1px solid rgba(0, 217, 255, 0.18)',
                borderRadius: '6px',
                backgroundColor: '#111A2E',
                color: '#E8FFFF',
                cursor: periodOffset === 0 ? 'not-allowed' : 'pointer',
                opacity: periodOffset === 0 ? 0.4 : 1,
                fontSize: '1.1rem',
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Next period"
            >
              ›
            </button>

            {periodOffset > 0 && (
              <button
                onClick={() => {
                  setPeriodOffset(0)
                  setCurrentPage(1)
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: '1px solid rgba(0, 217, 255, 0.4)',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 217, 255, 0.1)',
                  color: '#00D9FF',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Today
              </button>
            )}
          </div>
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: '#5E677A',
          textAlign: 'center'
        }}>
          {dateRange.startDate} to {dateRange.endDate}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <div className="value">{stats?.total_transactions || 0}</div>
          <div style={{ fontSize: '0.82rem', color: '#5E677A', marginTop: '0.5rem' }}>
            {dateRange.label}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #ff6b6b' }}>
          <h3 style={{ color: '#ff8a8a' }}>Total Spent</h3>
          <div className="value" style={{ color: '#ff6b6b' }}>
            ${formatCurrency(stats?.total_spent_amount || 0)}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#5E677A', marginTop: '0.5rem' }}>
            {stats?.total_spent_count || 0} transactions · {dateRange.label}
          </div>
          {stats && (stats.purchase_count > 0 || stats.payment_count > 0) && (
            <div style={{ fontSize: '0.75rem', color: '#5E677A', marginTop: '0.25rem' }}>
              {stats.purchase_count > 0 && `${stats.purchase_count} purchases`}
              {stats.purchase_count > 0 && stats.payment_count > 0 && ' · '}
              {stats.payment_count > 0 && `${stats.payment_count} payments`}
            </div>
          )}
        </div>

        <div className="stat-card">
          <h3>Top Merchant</h3>
          <div className="value" style={{ fontSize: '1.2rem', color: '#00D9FF' }}>
            {stats?.top_merchant || 'N/A'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#5E677A', marginTop: '0.5rem' }}>
            {stats?.top_merchant_amount ? `$${formatCurrency(stats.top_merchant_amount)} · ` : ''}{dateRange.label}
          </div>
        </div>

        <div className="stat-card">
          <h3>Most Frequent</h3>
          <div className="value" style={{ fontSize: '1.2rem', color: '#00D9FF' }}>
            {stats?.busiest_merchant || 'N/A'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#5E677A', marginTop: '0.5rem' }}>
            {stats?.busiest_merchant ? `${stats.busiest_merchant_count} transactions · ` : ''}{dateRange.label}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Recent Transactions</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((txn) => (
              <tr
                key={txn.id}
                onClick={() => setSelectedTxnId(txn.id)}
                style={{ cursor: 'pointer' }}
                title="Ver detalle completo"
              >
                <td>{format(parse(txn.txn_date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}</td>
                <td>{txn.merchant_name}</td>
                <td>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    backgroundColor: 'rgba(57, 255, 20, 0.08)',
                    color: '#39FF14',
                    border: '1px solid rgba(57, 255, 20, 0.18)',
                    fontWeight: '500',
                  }}>
                    {txn.merchant?.categoryRef?.name || 'Uncategorized'}
                  </span>
                </td>
                <td style={{ textTransform: 'capitalize', color: 'rgba(232, 255, 255, 0.65)' }}>{txn.txn_type}</td>
                <td style={{ fontWeight: '700', color: amountColor(txn.txn_type) ?? '#E8FFFF' }}>
                  {formatSignedAmount(txn.txn_type, txn.amount)}
                </td>
                <td>{txn.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination - Mobile Responsive */}
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          borderTop: '1px solid rgba(0, 217, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ color: '#5E677A', fontSize: '0.8rem', textAlign: 'center' }}>
              {allTransactions && allTransactions.length > 0 ? (
                <>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, allTransactions.length)} of {allTransactions.length}
                </>
              ) : (
                'No transactions found'
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#5E677A' }}>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              flexWrap: 'wrap'
            }}>
              {(['First', 'Prev'] as const).map((label) => {
                const isFirst = label === 'First'
                const disabled = currentPage === 1
                return (
                  <button
                    key={label}
                    onClick={() => setCurrentPage(isFirst ? 1 : p => Math.max(1, p - 1))}
                    disabled={disabled}
                    style={{
                      padding: '0.4rem 0.6rem',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                      border: '1px solid rgba(0, 217, 255, 0.18)',
                      borderRadius: '6px',
                      backgroundColor: '#111A2E',
                      color: '#E8FFFF',
                      fontSize: '0.8rem',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
              <span style={{ padding: '0 0.5rem', fontWeight: '600', fontSize: '0.8rem', color: '#E8FFFF' }}>
                {currentPage} / {totalPages}
              </span>
              {(['Next', 'Last'] as const).map((label) => {
                const isLast = label === 'Last'
                const disabled = currentPage === totalPages
                return (
                  <button
                    key={label}
                    onClick={() => setCurrentPage(isLast ? totalPages : p => Math.min(totalPages, p + 1))}
                    disabled={disabled}
                    style={{
                      padding: '0.4rem 0.6rem',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                      border: '1px solid rgba(0, 217, 255, 0.18)',
                      borderRadius: '6px',
                      backgroundColor: '#111A2E',
                      color: '#E8FFFF',
                      fontSize: '0.8rem',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <TransactionDetailModal
        transactionId={selectedTxnId}
        onClose={() => setSelectedTxnId(null)}
      />
    </div>
  )
}
