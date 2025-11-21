import { useQuery } from '@tanstack/react-query'
import { fetchTransactions } from '../api/dataconnect-client'
import { useState, useMemo } from 'react'
import { formatCurrency } from '../utils/format'
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
  ComposedChart,
} from 'recharts'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subYears,
  parseISO,
  startOfYear,
  endOfYear,
  eachYearOfInterval,
  subMonths
} from 'date-fns'

export default function Reports() {
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly')
  const [comparisonYears, setComparisonYears] = useState(2)

  // Get data for the last N years
  const endDate = new Date()
  const startDate = subYears(endDate, comparisonYears)

  const { data: allTransactions, isLoading } = useQuery({
    queryKey: ['transactions', 50000, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => fetchTransactions(50000, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')),
  })

  // Monthly comparison data
  const monthlyComparison = useMemo(() => {
    if (!allTransactions) return []

    const months = eachMonthOfInterval({
      start: startOfMonth(startDate),
      end: endOfMonth(endDate)
    })

    return months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const year = month.getFullYear()

      const monthTransactions = allTransactions.filter(txn => {
        const txnDate = parseISO(txn.txn_date)
        return txnDate >= monthStart && txnDate <= monthEnd
      })

      let income = 0
      let expenses = 0

      monthTransactions.forEach(txn => {
        if (txn.txn_type === 'PAYMENT') {
          income += txn.amount
        } else if (txn.txn_type === 'PURCHASE') {
          expenses += txn.amount
        }
      })

      return {
        month: format(month, 'MMM'),
        year: year.toString(),
        monthYear: format(month, 'MMM yyyy'),
        fullDate: month,
        income,
        expenses,
        net: income - expenses,
        transactionCount: monthTransactions.length
      }
    })
  }, [allTransactions, startDate, endDate])

  // Group by year for yearly comparison
  const yearlyComparison = useMemo(() => {
    if (!allTransactions) return []

    const years = eachYearOfInterval({
      start: startOfYear(startDate),
      end: endOfYear(endDate)
    })

    return years.map(year => {
      const yearStart = startOfYear(year)
      const yearEnd = endOfYear(year)

      const yearTransactions = allTransactions.filter(txn => {
        const txnDate = parseISO(txn.txn_date)
        return txnDate >= yearStart && txnDate <= yearEnd
      })

      let income = 0
      let expenses = 0

      yearTransactions.forEach(txn => {
        if (txn.txn_type === 'PAYMENT') {
          income += txn.amount
        } else if (txn.txn_type === 'PURCHASE') {
          expenses += txn.amount
        }
      })

      return {
        year: year.getFullYear().toString(),
        income,
        expenses,
        net: income - expenses,
        transactionCount: yearTransactions.length,
        avgMonthlyIncome: income / 12,
        avgMonthlyExpenses: expenses / 12
      }
    })
  }, [allTransactions, startDate, endDate])

  // Year-over-year growth calculations
  const yearOverYearGrowth = useMemo(() => {
    if (yearlyComparison.length < 2) return null

    const currentYear = yearlyComparison[yearlyComparison.length - 1]
    const previousYear = yearlyComparison[yearlyComparison.length - 2]

    return {
      incomeGrowth: ((currentYear.income - previousYear.income) / previousYear.income) * 100,
      expenseGrowth: ((currentYear.expenses - previousYear.expenses) / previousYear.expenses) * 100,
      netGrowth: ((currentYear.net - previousYear.net) / Math.abs(previousYear.net)) * 100,
      transactionGrowth: ((currentYear.transactionCount - previousYear.transactionCount) / previousYear.transactionCount) * 100
    }
  }, [yearlyComparison])

  // Monthly trends by year
  const monthlyTrendsByYear = useMemo(() => {
    const yearMap = new Map<string, any[]>()

    monthlyComparison.forEach(month => {
      if (!yearMap.has(month.year)) {
        yearMap.set(month.year, [])
      }
      yearMap.get(month.year)!.push(month)
    })

    return Array.from(yearMap.entries()).map(([year, months]) => ({
      year,
      months: months.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())
    }))
  }, [monthlyComparison])

  // Seasonal analysis (by month across years)
  const seasonalAnalysis = useMemo(() => {
    const monthMap = new Map<string, { month: string; years: { year: string; income: number; expenses: number; net: number }[] }>()

    monthlyComparison.forEach(monthData => {
      const monthKey = format(monthData.fullDate, 'MMM')
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthKey, years: [] })
      }
      monthMap.get(monthKey)!.years.push({
        year: monthData.year,
        income: monthData.income,
        expenses: monthData.expenses,
        net: monthData.net
      })
    })

    return Array.from(monthMap.values()).map(({ month, years }) => ({
      month,
      avgIncome: years.reduce((sum, y) => sum + y.income, 0) / years.length,
      avgExpenses: years.reduce((sum, y) => sum + y.expenses, 0) / years.length,
      avgNet: years.reduce((sum, y) => sum + y.net, 0) / years.length,
      years
    }))
  }, [monthlyComparison])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '5px 0 0 0', color: entry.color }}>
              {entry.name}: ${formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return <div className="loading">Loading historical reports...</div>
  }

  return (
    <div>
      <h1>Historical Financial Reports</h1>

      {/* Controls */}
      <div style={{
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ fontWeight: '500', marginRight: '0.5rem' }}>Report Type:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'monthly' | 'yearly')}
            style={{
              padding: '0.4rem 0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value="monthly">Monthly Comparison</option>
            <option value="yearly">Yearly Overview</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: '500', marginRight: '0.5rem' }}>Years to Compare:</label>
          <select
            value={comparisonYears}
            onChange={(e) => setComparisonYears(Number(e.target.value))}
            style={{
              padding: '0.4rem 0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value={2}>2 Years</option>
            <option value={3}>3 Years</option>
            <option value={5}>5 Years</option>
          </select>
        </div>
      </div>

      {/* Year-over-Year Growth Summary */}
      {yearOverYearGrowth && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card" style={{
            backgroundColor: yearOverYearGrowth.incomeGrowth >= 0 ? '#f0fff4' : '#fff5f5',
            borderLeft: `4px solid ${yearOverYearGrowth.incomeGrowth >= 0 ? '#38a169' : '#e53e3e'}`
          }}>
            <h3 style={{ color: yearOverYearGrowth.incomeGrowth >= 0 ? '#2f855a' : '#c53030' }}>
              Income Growth
            </h3>
            <div className="value" style={{
              color: yearOverYearGrowth.incomeGrowth >= 0 ? '#38a169' : '#e53e3e'
            }}>
              {yearOverYearGrowth.incomeGrowth >= 0 ? '+' : ''}{yearOverYearGrowth.incomeGrowth.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Year over year
            </div>
          </div>

          <div className="stat-card" style={{
            backgroundColor: yearOverYearGrowth.expenseGrowth <= 0 ? '#f0fff4' : '#fff5f5',
            borderLeft: `4px solid ${yearOverYearGrowth.expenseGrowth <= 0 ? '#38a169' : '#e53e3e'}`
          }}>
            <h3 style={{ color: yearOverYearGrowth.expenseGrowth <= 0 ? '#2f855a' : '#c53030' }}>
              Expense Growth
            </h3>
            <div className="value" style={{
              color: yearOverYearGrowth.expenseGrowth <= 0 ? '#38a169' : '#e53e3e'
            }}>
              {yearOverYearGrowth.expenseGrowth >= 0 ? '+' : ''}{yearOverYearGrowth.expenseGrowth.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Year over year
            </div>
          </div>

          <div className="stat-card" style={{
            backgroundColor: yearOverYearGrowth.netGrowth >= 0 ? '#f0fff4' : '#fff5f5',
            borderLeft: `4px solid ${yearOverYearGrowth.netGrowth >= 0 ? '#38a169' : '#e53e3e'}`
          }}>
            <h3 style={{ color: yearOverYearGrowth.netGrowth >= 0 ? '#2f855a' : '#c53030' }}>
              Net Cash Flow Growth
            </h3>
            <div className="value" style={{
              color: yearOverYearGrowth.netGrowth >= 0 ? '#38a169' : '#e53e3e'
            }}>
              {yearOverYearGrowth.netGrowth >= 0 ? '+' : ''}{yearOverYearGrowth.netGrowth.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              Year over year
            </div>
          </div>

          <div className="stat-card">
            <h3>Analysis Period</h3>
            <div className="value">{comparisonYears} years</div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              {format(startDate, 'yyyy')} - {format(endDate, 'yyyy')}
            </div>
          </div>
        </div>
      )}

      {reportType === 'yearly' ? (
        <>
          {/* Yearly Overview */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Yearly Financial Overview</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Annual income, expenses, and net cash flow comparison
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={yearlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="amount" />
                <YAxis yAxisId="count" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="amount" dataKey="income" fill="#38a169" name="Income" />
                <Bar yAxisId="amount" dataKey="expenses" fill="#e53e3e" name="Expenses" />
                <Line yAxisId="count" type="monotone" dataKey="transactionCount" stroke="#3182ce" strokeWidth={3} name="Transactions" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Yearly Trends Table */}
          <div className="card">
            <h2>Yearly Summary Table</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Income</th>
                  <th>Expenses</th>
                  <th>Net Cash Flow</th>
                  <th>Transactions</th>
                  <th>Avg Monthly Income</th>
                  <th>Avg Monthly Expenses</th>
                </tr>
              </thead>
              <tbody>
                {yearlyComparison.map((year) => (
                  <tr key={year.year}>
                    <td style={{ fontWeight: 'bold' }}>{year.year}</td>
                    <td style={{ color: '#38a169', fontWeight: '500' }}>
                      ${formatCurrency(year.income)}
                    </td>
                    <td style={{ color: '#e53e3e', fontWeight: '500' }}>
                      ${formatCurrency(year.expenses)}
                    </td>
                    <td style={{
                      fontWeight: 'bold',
                      color: year.net >= 0 ? '#38a169' : '#e53e3e'
                    }}>
                      ${formatCurrency(year.net)}
                    </td>
                    <td>{year.transactionCount}</td>
                    <td>${formatCurrency(year.avgMonthlyIncome)}</td>
                    <td>${formatCurrency(year.avgMonthlyExpenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Monthly Comparison */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Monthly Income vs Expenses Trends</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Compare monthly patterns across years
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={seasonalAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="avgIncome" stroke="#38a169" strokeWidth={3} name="Avg Income" />
                <Line type="monotone" dataKey="avgExpenses" stroke="#e53e3e" strokeWidth={3} name="Avg Expenses" />
                <Line type="monotone" dataKey="avgNet" stroke="#3182ce" strokeWidth={3} name="Avg Net" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Multi-Year Monthly Comparison */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Year-over-Year Monthly Comparison</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Detailed monthly breakdown by year
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {monthlyTrendsByYear.map(({ year, months }) => (
                <div key={year} style={{
                  padding: '1rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>{year}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={months}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="income" fill="#38a169" name="Income" />
                      <Bar dataKey="expenses" fill="#e53e3e" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>

          {/* Seasonal Analysis Table */}
          <div className="card">
            <h2>Seasonal Analysis</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Average monthly patterns across all years
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Avg Income</th>
                  <th>Avg Expenses</th>
                  <th>Avg Net Cash Flow</th>
                  <th>Years of Data</th>
                </tr>
              </thead>
              <tbody>
                {seasonalAnalysis.map((month) => (
                  <tr key={month.month}>
                    <td style={{ fontWeight: 'bold' }}>{month.month}</td>
                    <td style={{ color: '#38a169', fontWeight: '500' }}>
                      ${formatCurrency(month.avgIncome)}
                    </td>
                    <td style={{ color: '#e53e3e', fontWeight: '500' }}>
                      ${formatCurrency(month.avgExpenses)}
                    </td>
                    <td style={{
                      fontWeight: 'bold',
                      color: month.avgNet >= 0 ? '#38a169' : '#e53e3e'
                    }}>
                      ${formatCurrency(month.avgNet)}
                    </td>
                    <td>{month.years.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}