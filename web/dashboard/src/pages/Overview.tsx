import { useQuery } from '@tanstack/react-query'
import { fetchStats, fetchTransactions } from '../api/dataconnect-client'
import { format } from 'date-fns'
import { formatCurrency } from '../utils/format'
import { useState, useMemo } from 'react'
import { getDateRange, type PeriodType } from '../utils/dateRange'

export default function Overview() {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [periodOffset, setPeriodOffset] = useState(0)

  // Calculate current date range based on period selection
  const dateRange = useMemo(
    () => getDateRange(periodType, periodOffset),
    [periodType, periodOffset]
  )

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', dateRange.startDate, dateRange.endDate],
    queryFn: () => fetchStats(dateRange.startDate, dateRange.endDate),
  })

  const { data: allTransactions, isLoading: txnLoading } = useQuery({
    queryKey: ['transactions', 100, dateRange.startDate, dateRange.endDate],
    queryFn: () => fetchTransactions(100, dateRange.startDate, dateRange.endDate),
  })

  const paginatedTransactions = useMemo(() => {
    if (!allTransactions) return []
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allTransactions.slice(startIndex, endIndex)
  }, [allTransactions, currentPage, itemsPerPage])

  const totalPages = Math.ceil((allTransactions?.length || 0) / itemsPerPage)

  if (statsLoading || txnLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div>
      <h1>Dashboard Overview</h1>

      {/* Period Selector - Mobile Responsive */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '0.75rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '500', color: '#333', fontSize: '0.9rem' }}>Period:</label>
          <select
            value={periodType}
            onChange={(e) => {
              setPeriodType(e.target.value as PeriodType)
              setPeriodOffset(0)
              setCurrentPage(1)
            }}
            style={{
              padding: '0.4rem 0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              backgroundColor: 'white'
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
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '1.1rem',
                lineHeight: 1,
                flexShrink: 0
              }}
              title="Previous period"
            >
              ‹
            </button>

            <span style={{
              padding: '0.4rem 0.5rem',
              fontWeight: '600',
              color: '#333',
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
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: periodOffset === 0 ? '#f5f5f5' : 'white',
                cursor: periodOffset === 0 ? 'not-allowed' : 'pointer',
                opacity: periodOffset === 0 ? 0.5 : 1,
                fontSize: '1.1rem',
                lineHeight: 1,
                flexShrink: 0
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
                  border: '1px solid #007bff',
                  borderRadius: '4px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                Today
              </button>
            )}
          </div>
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: '#666',
          textAlign: 'center'
        }}>
          {dateRange.startDate} to {dateRange.endDate}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <div className="value">{stats?.total_transactions || 0}</div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            {dateRange.label}
          </div>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#fff5f5', borderLeft: '4px solid #e53e3e' }}>
          <h3 style={{ color: '#c53030' }}>Payments</h3>
          <div className="value" style={{ color: '#e53e3e' }}>
            ${formatCurrency(stats?.payment_amount || 0)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            {stats?.payment_count || 0} transactions · {dateRange.label}
          </div>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#f0fff4', borderLeft: '4px solid #38a169' }}>
          <h3 style={{ color: '#2f855a' }}>Purchases</h3>
          <div className="value" style={{ color: '#38a169' }}>
            ${formatCurrency(stats?.purchase_amount || 0)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            {stats?.purchase_count || 0} transactions · {dateRange.label}
          </div>
        </div>

        <div className="stat-card">
          <h3>Top Merchant</h3>
          <div className="value" style={{ fontSize: '1.2rem' }}>
            {stats?.top_merchant || 'N/A'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            {stats?.top_merchant_amount ? `$${formatCurrency(stats.top_merchant_amount)} · ` : ''}{dateRange.label}
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
              <tr key={txn.id}>
                <td>{format(new Date(txn.txn_date), 'MMM dd, yyyy')}</td>
                <td>{txn.merchant_name}</td>
                <td>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32'
                  }}>
                    {txn.merchant?.categoryRef?.name || 'Uncategorized'}
                  </span>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{txn.txn_type}</td>
                <td style={{ fontWeight: 'bold' }}>
                  ${formatCurrency(txn.amount)}
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
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center' }}>
              {allTransactions && allTransactions.length > 0 ? (
                <>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, allTransactions.length)} of {allTransactions.length}
                </>
              ) : (
                'No transactions found'
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#666' }}>Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.8rem'
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
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: '0.4rem 0.6rem',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: currentPage === 1 ? '#f5f5f5' : 'white',
                  fontSize: '0.8rem'
                }}
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.4rem 0.6rem',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: currentPage === 1 ? '#f5f5f5' : 'white',
                  fontSize: '0.8rem'
                }}
              >
                Prev
              </button>
              <span style={{ padding: '0 0.5rem', fontWeight: '500', fontSize: '0.8rem' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.4rem 0.6rem',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'white',
                  fontSize: '0.8rem'
                }}
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.4rem 0.6rem',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'white',
                  fontSize: '0.8rem'
                }}
              >
                Last
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
