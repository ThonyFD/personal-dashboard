import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, exportTransactionsCSV } from '../api/dataconnect-client'
import { format } from 'date-fns'
import { formatCurrency } from '../utils/format'
import { useState, useMemo } from 'react'

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => fetchTransactions(1000),
  })

  // Get unique values for filters
  const uniqueTypes = useMemo(() => {
    const types = new Set(transactions?.map(t => t.txn_type) || [])
    return Array.from(types)
  }, [transactions])

  const uniqueChannels = useMemo(() => {
    const channels = new Set(transactions?.map(t => t.channel) || [])
    return Array.from(channels)
  }, [transactions])

  const uniqueProviders = useMemo(() => {
    const providers = new Set(transactions?.map(t => t.provider) || [])
    return Array.from(providers)
  }, [transactions])

  // Filter and paginate transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return []

    const filtered = transactions.filter(txn => {
      const matchesSearch = searchTerm === '' ||
        txn.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.card_last4?.includes(searchTerm)

      const matchesType = typeFilter === 'all' || txn.txn_type === typeFilter
      const matchesChannel = channelFilter === 'all' || txn.channel === channelFilter
      const matchesProvider = providerFilter === 'all' || txn.provider === providerFilter

      return matchesSearch && matchesType && matchesChannel && matchesProvider
    })

    return filtered
  }, [transactions, searchTerm, typeFilter, channelFilter, providerFilter])

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredTransactions.slice(startIndex, endIndex)
  }, [filteredTransactions, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  const handleExport = async () => {
    try {
      const blob = await exportTransactionsCSV()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  if (isLoading) return <div className="loading">Loading...</div>
  if (error) return <div className="error">Error loading transactions</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>All Transactions</h1>
        <button
          onClick={handleExport}
          style={{
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap'
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Filters Section - Mobile Responsive */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Merchant or card..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setCurrentPage(1)
                }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                Channel
              </label>
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value)
                  setCurrentPage(1)
                }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
              >
                <option value="all">All Channels</option>
                {uniqueChannels.map(channel => (
                  <option key={channel} value={channel}>
                    {channel.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                Provider
              </label>
              <select
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value)
                  setCurrentPage(1)
                }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
              >
                <option value="all">All Providers</option>
                {uniqueProviders.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div style={{ marginTop: '0.75rem', color: '#666', fontSize: '0.85rem', textAlign: 'center' }}>
          Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Type</th>
              <th>Channel</th>
              <th>Amount</th>
              <th>Provider</th>
              <th>Card</th>
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
                <td style={{ textTransform: 'capitalize' }}>{txn.channel.replace('_', ' ')}</td>
                <td style={{ fontWeight: 'bold' }}>
                  {txn.currency} ${formatCurrency(txn.amount)}
                </td>
                <td>{txn.provider}</td>
                <td>{txn.card_last4 ? `****${txn.card_last4}` : '-'}</td>
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
              {filteredTransactions.length > 0 ? (
                <>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
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
                <option value={100}>100</option>
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
