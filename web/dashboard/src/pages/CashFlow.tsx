import { useQuery } from '@tanstack/react-query'
import { fetchTransactions } from '../api/dataconnect-client'
import { useState, useMemo } from 'react'
import { getDateRange, type PeriodType } from '../utils/dateRange'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { formatCurrency } from '../utils/format'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from 'date-fns'

// Color palette
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c', '#d084d0']

export default function CashFlow() {
  const [periodType, setPeriodType] = useState<PeriodType>('year')
  const [periodOffset, setPeriodOffset] = useState(0)

  // Calculate current date range based on period selection
  const dateRange = useMemo(
    () => getDateRange(periodType, periodOffset),
    [periodType, periodOffset]
  )

  const { data: allTransactions, isLoading } = useQuery({
    queryKey: ['transactions', 10000, dateRange.startDate, dateRange.endDate],
    queryFn: () => fetchTransactions(10000, dateRange.startDate, dateRange.endDate),
  })

  // Monthly cash flow data
  const monthlyCashFlow = useMemo(() => {
    if (!allTransactions) return []

    const months = eachMonthOfInterval({
      start: parseISO(dateRange.startDate),
      end: parseISO(dateRange.endDate)
    })

    return months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      const monthTransactions = allTransactions.filter(txn => {
        const txnDate = parseISO(txn.txn_date)
        return txnDate >= monthStart && txnDate <= monthEnd
      })

      let income = 0
      let expenses = 0
      let payments = 0
      let purchases = 0

      monthTransactions.forEach(txn => {
        if (txn.txn_type === 'PAYMENT') {
          income += txn.amount
          payments += 1
        } else if (txn.txn_type === 'PURCHASE') {
          expenses += txn.amount
          purchases += 1
        }
      })

      return {
        month: format(month, 'MMM yyyy'),
        monthShort: format(month, 'MMM yy'),
        income,
        expenses,
        net: income - expenses,
        payments,
        purchases,
        totalTransactions: payments + purchases
      }
    })
  }, [allTransactions, dateRange])

  // Recurring expenses analysis
  const recurringExpenses = useMemo(() => {
    if (!allTransactions) return []

    const expenseTransactions = allTransactions.filter(txn => txn.txn_type === 'PURCHASE')

    // Group by merchant and amount to find potential recurring transactions
    const merchantAmountGroups = new Map<string, { transactions: typeof expenseTransactions, total: number, count: number }>()

    expenseTransactions.forEach(txn => {
      const key = `${txn.merchant_name || 'Unknown'}_${txn.amount}`
      if (!merchantAmountGroups.has(key)) {
        merchantAmountGroups.set(key, { transactions: [], total: 0, count: 0 })
      }
      const group = merchantAmountGroups.get(key)!
      group.transactions.push(txn)
      group.total += txn.amount
      group.count += 1
    })

    // Filter for potentially recurring (same amount, same merchant, multiple occurrences)
    const recurring = Array.from(merchantAmountGroups.entries())
      .filter(([_, group]) => group.count >= 3) // At least 3 occurrences
      .map(([key, group]) => {
        const [merchant] = key.split('_')
        const amount = parseFloat(key.split('_')[1])

        // Calculate frequency (days between transactions)
        const dates = group.transactions.map(t => parseISO(t.txn_date)).sort()
        const intervals = []
        for (let i = 1; i < dates.length; i++) {
          intervals.push(dates[i].getTime() - dates[i-1].getTime())
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const daysBetween = avgInterval / (1000 * 60 * 60 * 24)

        let frequency = 'Irregular'
        if (daysBetween >= 25 && daysBetween <= 35) frequency = 'Monthly'
        else if (daysBetween >= 6 && daysBetween <= 10) frequency = 'Weekly'
        else if (daysBetween >= 13 && daysBetween <= 17) frequency = 'Bi-weekly'

        return {
          merchant,
          amount,
          count: group.count,
          total: group.total,
          frequency,
          avgMonthly: group.total / (group.count / (daysBetween / 30)), // Estimate monthly cost
          lastTransaction: format(Math.max(...dates.map(d => d.getTime())), 'MMM dd, yyyy')
        }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10) // Top 10 recurring expenses

    return recurring
  }, [allTransactions])

  // Category breakdown for expenses
  const expenseCategories = useMemo(() => {
    if (!allTransactions) return []

    const categories = new Map<string, number>()

    allTransactions
      .filter(txn => txn.txn_type === 'PURCHASE')
      .forEach(txn => {
        const category = txn.merchant?.categoryRef?.name || 'Uncategorized'
        categories.set(category, (categories.get(category) || 0) + txn.amount)
      })

    return Array.from(categories.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [allTransactions])

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!monthlyCashFlow.length) return null

    const totalIncome = monthlyCashFlow.reduce((sum, m) => sum + m.income, 0)
    const totalExpenses = monthlyCashFlow.reduce((sum, m) => sum + m.expenses, 0)
    const avgMonthlyIncome = totalIncome / monthlyCashFlow.length
    const avgMonthlyExpenses = totalExpenses / monthlyCashFlow.length
    const avgMonthlyNet = (totalIncome - totalExpenses) / monthlyCashFlow.length

    return {
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      avgMonthlyNet,
      monthsAnalyzed: monthlyCashFlow.length
    }
  }, [monthlyCashFlow])

  if (isLoading) {
    return <div className="loading">Loading cash flow analysis...</div>
  }

  return (
    <div>
      <h1>Monthly Cash Flow Analysis</h1>

      {/* Period Selector */}
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
          <label style={{ fontWeight: '500', color: '#333', fontSize: '0.9rem' }}>Analysis Period:</label>
          <select
            value={periodType}
            onChange={(e) => {
              setPeriodType(e.target.value as PeriodType)
              setPeriodOffset(0)
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
            <option value="year">Last Year</option>
            <option value="month">Last 6 Months</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '1 1 auto', minWidth: '0' }}>
            <button
              onClick={() => setPeriodOffset(offset => offset + 1)}
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
              onClick={() => setPeriodOffset(offset => Math.max(0, offset - 1))}
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

      {/* Summary Cards */}
      {summaryStats && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card" style={{ backgroundColor: '#f0fff4', borderLeft: '4px solid #38a169' }}>
            <h3 style={{ color: '#2f855a' }}>Total Income</h3>
            <div className="value" style={{ color: '#38a169' }}>
              ${formatCurrency(summaryStats.totalIncome)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Avg: ${formatCurrency(summaryStats.avgMonthlyIncome)}/month
            </div>
          </div>

          <div className="stat-card" style={{ backgroundColor: '#fff5f5', borderLeft: '4px solid #e53e3e' }}>
            <h3 style={{ color: '#c53030' }}>Total Expenses</h3>
            <div className="value" style={{ color: '#e53e3e' }}>
              ${formatCurrency(summaryStats.totalExpenses)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Avg: ${formatCurrency(summaryStats.avgMonthlyExpenses)}/month
            </div>
          </div>

          <div className="stat-card" style={{
            backgroundColor: summaryStats.netCashFlow >= 0 ? '#f0fff4' : '#fff5f5',
            borderLeft: `4px solid ${summaryStats.netCashFlow >= 0 ? '#38a169' : '#e53e3e'}`
          }}>
            <h3 style={{ color: summaryStats.netCashFlow >= 0 ? '#2f855a' : '#c53030' }}>
              Net Cash Flow
            </h3>
            <div className="value" style={{
              color: summaryStats.netCashFlow >= 0 ? '#38a169' : '#e53e3e'
            }}>
              ${formatCurrency(summaryStats.netCashFlow)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Avg: ${formatCurrency(summaryStats.avgMonthlyNet)}/month
            </div>
          </div>

          <div className="stat-card">
            <h3>Analysis Period</h3>
            <div className="value">{summaryStats.monthsAnalyzed} months</div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              {dateRange.label}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Cash Flow Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Monthly Income vs Expenses</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Track your cash flow patterns over time
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={monthlyCashFlow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthShort" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${formatCurrency(value)}`}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
            />
            <Legend />
            <Bar dataKey="income" fill="#38a169" name="Income" />
            <Bar dataKey="expenses" fill="#e53e3e" name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net Cash Flow Trend */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Net Cash Flow Trend</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Monthly surplus or deficit over time
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyCashFlow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthShort" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${formatCurrency(value)}`}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="#3182ce"
              strokeWidth={3}
              name="Net Cash Flow"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Two column layout for pie charts and recurring expenses */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* Expense Categories */}
        <div className="card">
          <h2>Expense Categories</h2>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Breakdown of spending by category
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseCategories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expenseCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${formatCurrency(value)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recurring Expenses */}
        <div className="card">
          <h2>Recurring Expenses</h2>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Top recurring monthly expenses (3+ occurrences)
          </p>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {recurringExpenses.length > 0 ? (
              <table className="table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Monthly Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {recurringExpenses.map((expense, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: '500' }}>{expense.merchant}</td>
                      <td>${formatCurrency(expense.amount)}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          backgroundColor: '#e8f5e9',
                          color: '#2e7d32'
                        }}>
                          {expense.frequency}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#e53e3e' }}>
                        ${formatCurrency(expense.avgMonthly)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#666',
                padding: '2rem',
                fontStyle: 'italic'
              }}>
                No recurring expenses detected yet.<br/>
                <small>Recurring expenses will appear here as more data is collected.</small>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Transaction Volume */}
      <div className="card">
        <h2>Transaction Volume</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Number of transactions per month
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyCashFlow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthShort" />
            <YAxis />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }} />
            <Legend />
            <Bar dataKey="payments" fill="#38a169" name="Income Transactions" />
            <Bar dataKey="purchases" fill="#e53e3e" name="Expense Transactions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}