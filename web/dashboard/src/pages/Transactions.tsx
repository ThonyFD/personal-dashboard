import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parse, startOfMonth } from 'date-fns'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  createMonthlyIncome,
  exportTransactionsCSV,
  fetchMonthlyIncomesInRange,
  fetchTransactionFilterOptions,
  fetchTransactionSummary,
  fetchTransactionsPaginated,
} from '../api/supabase-data-client'
import { formatCurrency } from '../utils/format'

const DEFAULT_INCOME_PERIOD = format(new Date(), 'yyyy-MM')
const DEFAULT_START_DATE = format(startOfMonth(new Date()), 'yyyy-MM-dd')
const DEFAULT_END_DATE = format(new Date(), 'yyyy-MM-dd')

interface IncomeFormState {
  period: string
  source: string
  amount: string
  notes: string
}

const INITIAL_INCOME_FORM: IncomeFormState = {
  period: DEFAULT_INCOME_PERIOD,
  source: '',
  amount: '',
  notes: '',
}

export default function Transactions() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE)
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [incomeForm, setIncomeForm] = useState<IncomeFormState>(INITIAL_INCOME_FORM)
  const [incomeFeedback, setIncomeFeedback] = useState<string | null>(null)
  const [incomeError, setIncomeError] = useState<string | null>(null)

  const deferredSearchTerm = useDeferredValue(searchTerm)

  const activeFilters = useMemo(
    () => ({
      searchTerm: deferredSearchTerm,
      typeFilter,
      channelFilter,
      providerFilter,
    }),
    [deferredSearchTerm, typeFilter, channelFilter, providerFilter]
  )

  const {
    data: paginatedData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['transactions', currentPage, itemsPerPage, activeFilters, startDate, endDate],
    queryFn: () => fetchTransactionsPaginated(currentPage, itemsPerPage, activeFilters, startDate, endDate),
    placeholderData: previousData => previousData,
  })

  const { data: summaryData, isFetching: isSummaryFetching } = useQuery({
    queryKey: ['transaction-summary', activeFilters, startDate, endDate],
    queryFn: () => fetchTransactionSummary(activeFilters, startDate, endDate),
    placeholderData: previousData => previousData,
  })

  const { data: filterOptions } = useQuery({
    queryKey: ['transaction-filter-options', startDate, endDate],
    queryFn: () => fetchTransactionFilterOptions(startDate, endDate),
    staleTime: 10 * 60 * 1000,
  })

  const {
    data: monthlyIncomes,
    isFetching: isMonthlyIncomesFetching,
  } = useQuery({
    queryKey: ['monthly-incomes-range', startDate, endDate],
    queryFn: () => fetchMonthlyIncomesInRange(startDate, endDate),
    staleTime: 60 * 1000,
  })

  const createIncomeMutation = useMutation({
    mutationFn: createMonthlyIncome,
    onSuccess: (_id, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['monthly-incomes-range'] })
      setIncomeFeedback(
        `Ingreso guardado para ${String(variables.month).padStart(2, '0')}/${variables.year}.`
      )
      setIncomeError(null)
      setIncomeForm(INITIAL_INCOME_FORM)
      setShowIncomeForm(false)
    },
    onError: (mutationError: Error) => {
      setIncomeFeedback(null)
      setIncomeError(mutationError.message || 'No se pudo guardar el ingreso.')
    },
  })

  const transactions = paginatedData?.transactions ?? []
  const visibleMonthlyIncomes = monthlyIncomes ?? []
  const monthlyIncomeTotal = visibleMonthlyIncomes.reduce((sum, income) => sum + income.amount, 0)
  const totalCount = paginatedData?.totalCount ?? 0
  const totalPages = paginatedData?.totalPages ?? 0

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const blob = await exportTransactionsCSV(startDate, endDate, activeFilters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Error al exportar las transacciones filtradas.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleIncomeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const source = incomeForm.source.trim()
    const amount = Number(incomeForm.amount)

    if (!source || !Number.isFinite(amount) || amount <= 0) {
      setIncomeError('Completa una fuente y un monto válido.')
      setIncomeFeedback(null)
      return
    }

    const [year, month] = incomeForm.period.split('-').map(Number)

    await createIncomeMutation.mutateAsync({
      year,
      month,
      source,
      amount,
      notes: incomeForm.notes.trim() || undefined,
    })
  }

  const handleStartDateChange = (nextStartDate: string) => {
    setStartDate(nextStartDate)
    if (nextStartDate > endDate) {
      setEndDate(nextStartDate)
    }
    setCurrentPage(1)
  }

  const handleEndDateChange = (nextEndDate: string) => {
    setEndDate(nextEndDate)
    if (nextEndDate < startDate) {
      setStartDate(nextEndDate)
    }
    setCurrentPage(1)
  }

  const handleResetToCurrentMonth = () => {
    setStartDate(DEFAULT_START_DATE)
    setEndDate(DEFAULT_END_DATE)
    setCurrentPage(1)
  }

  if (isLoading && !paginatedData) return <div className="loading">Loading...</div>
  if (error) return <div className="error">Error loading transactions</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>All Transactions</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setShowIncomeForm(current => !current)
              setIncomeError(null)
              setIncomeFeedback(null)
            }}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: showIncomeForm ? '#718096' : '#2b6cb0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}
          >
            {showIncomeForm ? 'Cerrar ingreso' : 'Registrar ingreso'}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: '0.5rem 1rem',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              backgroundColor: isExporting ? '#a0aec0' : '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Registrar ingreso manual</h2>
            <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              Guarda el ingreso en la base de datos para el mes que selecciones.
            </div>
          </div>
          {!showIncomeForm && incomeFeedback && (
            <div style={{ color: '#2f855a', fontSize: '0.85rem', fontWeight: 500 }}>
              {incomeFeedback}
            </div>
          )}
        </div>

        {showIncomeForm && (
          <form onSubmit={handleIncomeSubmit} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  Mes
                </label>
                <input
                  type="month"
                  value={incomeForm.period}
                  onChange={(e) => setIncomeForm(current => ({ ...current, period: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  Fuente
                </label>
                <input
                  type="text"
                  placeholder="Salario, freelance, bono..."
                  value={incomeForm.source}
                  onChange={(e) => setIncomeForm(current => ({ ...current, source: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm(current => ({ ...current, amount: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  Notas
                </label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={incomeForm.notes}
                  onChange={(e) => setIncomeForm(current => ({ ...current, notes: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {(incomeError || incomeFeedback) && (
              <div style={{
                marginTop: '0.75rem',
                color: incomeError ? '#c53030' : '#2f855a',
                fontSize: '0.85rem',
              }}>
                {incomeError ?? incomeFeedback}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button
                type="submit"
                disabled={createIncomeMutation.isPending}
                style={{
                  padding: '0.5rem 1rem',
                  cursor: createIncomeMutation.isPending ? 'not-allowed' : 'pointer',
                  backgroundColor: createIncomeMutation.isPending ? '#a0aec0' : '#2b6cb0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              >
                {createIncomeMutation.isPending ? 'Guardando...' : 'Guardar ingreso'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIncomeForm(false)
                  setIncomeError(null)
                  setIncomeFeedback(null)
                }}
                style={{
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  color: '#4a5568',
                  border: '1px solid #cbd5e0',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                End date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={DEFAULT_END_DATE}
                onChange={(e) => handleEndDateChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                disabled={startDate === DEFAULT_START_DATE && endDate === DEFAULT_END_DATE}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  cursor: startDate === DEFAULT_START_DATE && endDate === DEFAULT_END_DATE ? 'not-allowed' : 'pointer',
                  backgroundColor: startDate === DEFAULT_START_DATE && endDate === DEFAULT_END_DATE ? '#edf2f7' : 'white',
                  color: '#2d3748',
                  border: '1px solid #cbd5e0',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              >
                Mes en curso
              </button>
            </div>
          </div>

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
                {(filterOptions?.types ?? []).map(type => (
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
                {(filterOptions?.channels ?? []).map(channel => (
                  <option key={channel} value={channel}>
                    {channel.replace(/_/g, ' ')}
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
                {(filterOptions?.providers ?? []).map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', color: '#666', fontSize: '0.85rem', textAlign: 'center' }}>
          {isFetching || isSummaryFetching || isMonthlyIncomesFetching
            ? 'Updating filtered results...'
            : `Showing ${transactions.length} of ${totalCount} transactions and ${visibleMonthlyIncomes.length} manual incomes from ${startDate} to ${endDate}`}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Ingresos manuales</h2>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.35rem' }}>
              Los ingresos cargados en `monthly_incomes` se muestran aquí para el rango activo.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Total ingresos</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2f855a' }}>
              $ {formatCurrency(monthlyIncomeTotal)}
            </div>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Source</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {visibleMonthlyIncomes.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                  No manual incomes found for the current date range.
                </td>
              </tr>
            ) : (
              visibleMonthlyIncomes.map((income) => (
                <tr key={income.id}>
                  <td>{format(new Date(income.year, income.month - 1, 1), 'MMM yyyy')}</td>
                  <td>{income.source}</td>
                  <td style={{ fontWeight: 'bold', color: '#2f855a' }}>$ {formatCurrency(income.amount)}</td>
                  <td>{income.notes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Transactions</h2>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.35rem' }}>
              Resumen del filtro activo
            </div>
          </div>
          {(isFetching || isSummaryFetching) && (
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              Refreshing...
            </div>
          )}
        </div>

        <div className="stats-grid" style={{ marginBottom: '1rem' }}>
          <div className="stat-card">
            <h3>Total Amount</h3>
            <div className="value">${formatCurrency(summaryData?.totalAmount ?? 0)}</div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Suma de montos para el filtro actual
            </div>
          </div>

          <div className="stat-card">
            <h3>Transactions</h3>
            <div className="value">{summaryData?.totalCount ?? 0}</div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Total de filas encontradas
            </div>
          </div>

          <div className="stat-card">
            <h3>Top Merchant</h3>
            <div className="value" style={{ fontSize: '1.25rem' }}>
              {summaryData?.topMerchant || 'N/A'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              {summaryData?.topMerchant
                ? `${summaryData.topMerchantCount} tx · $${formatCurrency(summaryData.topMerchantAmount)}`
                : 'Sin resultados para el filtro'}
            </div>
          </div>
        </div>

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
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                  No transactions found for the current filters.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id}>
                  <td>{format(parse(txn.txn_date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}</td>
                  <td>{txn.merchant_name || 'Unknown'}</td>
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
                  <td style={{ textTransform: 'capitalize' }}>{txn.channel.replace(/_/g, ' ')}</td>
                  <td style={{ fontWeight: 'bold' }}>
                    $ {formatCurrency(txn.amount)}
                  </td>
                  <td>{txn.provider}</td>
                  <td>{txn.card_last4 ? `****${txn.card_last4}` : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
              {totalCount > 0 ? (
                <>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
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
