import { useQuery } from '@tanstack/react-query'
import { fetchTransactions } from '../api/supabase-data-client'
import { useState, useMemo } from 'react'
import { getDateRange, type PeriodType } from '../utils/dateRange'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../utils/format'
import { useChartColors } from '../theme/AppearanceContext'
import { format, startOfDay, parseISO } from 'date-fns'

export default function Charts() {
  const chart = useChartColors()
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  // Calculate current date range based on period selection
  const dateRange = useMemo(
    () => getDateRange(periodType, periodOffset),
    [periodType, periodOffset]
  )

  const { data: allTransactions, isLoading } = useQuery({
    queryKey: ['transactions', 10000, dateRange.startDate, dateRange.endDate],
    queryFn: () => fetchTransactions(10000, dateRange.startDate, dateRange.endDate),
  })

  // Spending trends over time
  const spendingTrends = useMemo(() => {
    if (!allTransactions) return []

    const trends = new Map<string, { date: string; payment: number; purchase: number; total: number }>()

    allTransactions.forEach(txn => {
      const date = startOfDay(parseISO(txn.txn_date))
      const dateKey = format(date, 'yyyy-MM-dd')

      if (!trends.has(dateKey)) {
        trends.set(dateKey, { date: format(date, 'MMM dd'), payment: 0, purchase: 0, total: 0 })
      }

      const day = trends.get(dateKey)!
      if (txn.txn_type === 'PAYMENT') {
        day.payment += txn.amount
      } else if (txn.txn_type === 'PURCHASE') {
        day.purchase += txn.amount
      }
      day.total += txn.amount
    })

    return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [allTransactions])

  // Category distribution
  const categoryData = useMemo(() => {
    if (!allTransactions) return []

    const categories = new Map<string, number>()

    allTransactions.forEach(txn => {
      // Transfers between the owner's own accounts belong to no category.
      if (txn.merchant?.isOwnAccount) return
      const category = txn.merchant?.categoryRef?.name || 'Uncategorized'
      categories.set(category, (categories.get(category) || 0) + txn.amount)
    })

    return Array.from(categories.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 categories
  }, [allTransactions])

  // Top merchants
  const topMerchants = useMemo(() => {
    if (!allTransactions) return []

    const merchants = new Map<string, number>()

    allTransactions.forEach(txn => {
      const merchant = txn.merchant_name || 'Unknown'
      merchants.set(merchant, (merchants.get(merchant) || 0) + txn.amount)
    })

    return Array.from(merchants.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10) // Top 10 merchants
  }, [allTransactions])

  // Payment vs Purchase
  const paymentVsPurchase = useMemo(() => {
    if (!allTransactions) return []

    let payment = 0
    let purchase = 0

    allTransactions.forEach(txn => {
      if (txn.txn_type === 'PAYMENT') {
        payment += txn.amount
      } else if (txn.txn_type === 'PURCHASE') {
        purchase += txn.amount
      }
    })

    return [
      { name: 'Payments', value: payment },
      { name: 'Purchases', value: purchase },
    ].filter(item => item.value > 0)
  }, [allTransactions])

  // Provider distribution
  const providerData = useMemo(() => {
    if (!allTransactions) return []

    const providers = new Map<string, number>()

    allTransactions.forEach(txn => {
      providers.set(txn.provider, (providers.get(txn.provider) || 0) + txn.amount)
    })

    return Array.from(providers.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [allTransactions])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'var(--c-surface)',
          padding: '10px',
          border: '1px solid var(--c-hairline)',
          borderRadius: '4px',
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
          <p style={{ margin: '5px 0 0 0', color: 'var(--c-text-2)' }}>
            ${formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return <div className="loading">Loading charts...</div>
  }

  return (
    <div>
      <h1>Financial Analytics</h1>

      {/* Period Selector */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '0.75rem',
        backgroundColor: 'var(--c-surface-2)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '500', color: 'var(--c-text)', fontSize: '0.9rem' }}>Period:</label>
          <select
            value={periodType}
            onChange={(e) => {
              setPeriodType(e.target.value as PeriodType)
              setPeriodOffset(0)
            }}
            style={{
              padding: '0.4rem 0.75rem',
              border: '1px solid var(--c-hairline)',
              borderRadius: '4px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              backgroundColor: 'var(--c-surface)'
            }}
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '1 1 auto', minWidth: '0' }}>
            <button
              onClick={() => setPeriodOffset(offset => offset + 1)}
              style={{
                padding: '0.4rem 0.6rem',
                border: '1px solid var(--c-hairline)',
                borderRadius: '4px',
                backgroundColor: 'var(--c-surface)',
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
              color: 'var(--c-text)',
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
                border: '1px solid var(--c-hairline)',
                borderRadius: '4px',
                backgroundColor: periodOffset === 0 ? 'var(--c-surface-2)' : 'var(--c-surface)',
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
                onClick={() => setPeriodOffset(0)}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: '1px solid var(--c-primary)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--c-primary)',
                  color: 'var(--c-on-accent)',
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
          color: 'var(--c-text-2)',
          textAlign: 'center'
        }}>
          {dateRange.startDate} to {dateRange.endDate}
        </div>
      </div>

      {/* Spending Trends Over Time */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Spending Trends Over Time</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '1rem' }}>
          Daily breakdown of payments and purchases
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={spendingTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis tick={{ fill: chart.text }} dataKey="date" angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: chart.text }} />
            <Tooltip
              formatter={(value: number) => `$${formatCurrency(value)}`}
              contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.grid}` }}
            />
            <Legend />
            <Bar dataKey="payment" fill="var(--c-negative)" name="Payments" />
            <Bar dataKey="purchase" fill="var(--c-green)" name="Purchases" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two column layout for pie charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* Payment vs Purchase */}
        <div className="card">
          <h2>Payment vs Purchase</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '1rem' }}>
            Distribution of transaction types
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentVsPurchase}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="var(--c-violet)"
                dataKey="value"
              >
                {paymentVsPurchase.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--c-negative)' : 'var(--c-green)'} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${formatCurrency(value)}`} contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.grid}` }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Provider Distribution */}
        <div className="card">
          <h2>Provider Distribution</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '1rem' }}>
            Spending by payment provider
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={providerData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="var(--c-violet)"
                dataKey="value"
              >
                {providerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chart.series[index % chart.series.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${formatCurrency(value)}`} contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.grid}` }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Merchants */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Top 10 Merchants</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '1rem' }}>
          Merchants with highest total spending
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topMerchants} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis tick={{ fill: chart.text }} type="number" />
            <YAxis tick={{ fill: chart.text }} dataKey="name" type="category" width={150} />
            <Tooltip
              formatter={(value: number) => `$${formatCurrency(value)}`}
              contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.grid}` }}
            />
            <Bar dataKey="amount" fill="var(--c-violet)" name="Total Spending" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Distribution */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Spending by Category</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '1rem' }}>
          Top 10 categories by total amount
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Pie Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="var(--c-violet)"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chart.series[index % chart.series.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${formatCurrency(value)}`} contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.grid}` }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Bar Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis tick={{ fill: chart.text }} dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis tick={{ fill: chart.text }} />
              <Tooltip
                formatter={(value: number) => `$${formatCurrency(value)}`}
                contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.grid}` }}
              />
              <Bar dataKey="value" fill="var(--c-green)" name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="card">
        <h2>Summary Statistics</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1rem'
        }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--c-surface-2)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', marginBottom: '0.25rem' }}>Total Transactions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{allTransactions?.length || 0}</div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'color-mix(in srgb, var(--c-negative) 10%, transparent)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-negative)', marginBottom: '0.25rem' }}>Total Payments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--c-negative)' }}>
              ${formatCurrency(paymentVsPurchase.find(p => p.name === 'Payments')?.value || 0)}
            </div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'color-mix(in srgb, var(--c-green) 10%, transparent)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-green)', marginBottom: '0.25rem' }}>Total Purchases</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--c-green)' }}>
              ${formatCurrency(paymentVsPurchase.find(p => p.name === 'Purchases')?.value || 0)}
            </div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'var(--c-surface-2)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', marginBottom: '0.25rem' }}>Average per Day</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              ${formatCurrency(
                (paymentVsPurchase.reduce((sum, p) => sum + p.value, 0) / (spendingTrends.length || 1))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
