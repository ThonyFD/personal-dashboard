import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTransactions } from '../api/supabase-data-client'
import { useState, useMemo } from 'react'
import { formatCurrency, formatSignedAmount, amountColor } from '../utils/format'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
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
import {
  format,
  parseISO,
  differenceInDays,
  differenceInHours,
  startOfDay,
  addDays,
  eachDayOfInterval,
  subDays,
} from 'date-fns'
import { useChartColors } from '../theme/AppearanceContext'

// Transaction pattern interface
interface TransactionPattern {
  id: string
  merchant: string
  amount: number
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'irregular'
  confidence: number
  transactions: any[]
  avgInterval: number
  stdDeviation: number
  category: string
  tags: string[]
  lastTransaction: string
  nextPredicted: string
  isActive: boolean
}

// Clustering algorithm for similar transactions
function clusterTransactions(transactions: any[]): TransactionPattern[] {
  const clusters: TransactionPattern[] = []
  const processed = new Set<string>()

  transactions.forEach(txn => {
    if (processed.has(txn.id)) return

    const similar = transactions.filter(other =>
      !processed.has(other.id) &&
      Math.abs(txn.amount - other.amount) / txn.amount < 0.1 && // 10% tolerance
      txn.merchant_name === other.merchant_name &&
      txn.txn_type === other.txn_type
    )

    if (similar.length >= 2) {
      // Calculate intervals
      const dates = similar.map(t => parseISO(t.txn_date)).sort((a, b) => a.getTime() - b.getTime())
      const intervals = []

      for (let i = 1; i < dates.length; i++) {
        intervals.push(differenceInDays(dates[i], dates[i-1]))
      }

      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const stdDeviation = Math.sqrt(
          intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
        )

        // Determine frequency
        let frequency: TransactionPattern['frequency'] = 'irregular'
        let confidence = 0

        if (stdDeviation / avgInterval < 0.3) { // Low variance = regular pattern
          if (avgInterval <= 2) {
            frequency = 'daily'
            confidence = 0.9
          } else if (avgInterval <= 8) {
            frequency = 'weekly'
            confidence = 0.85
          } else if (avgInterval <= 16) {
            frequency = 'biweekly'
            confidence = 0.8
          } else if (avgInterval <= 35) {
            frequency = 'monthly'
            confidence = 0.75
          } else if (avgInterval <= 100) {
            frequency = 'quarterly'
            confidence = 0.7
          }
        }

        // Calculate next predicted date
        const lastDate = dates[dates.length - 1]
        const nextPredicted = addDays(lastDate, avgInterval)

        clusters.push({
          id: `${txn.merchant_name}_${txn.amount}_${Date.now()}`,
          merchant: txn.merchant_name || 'Unknown',
          amount: txn.amount,
          frequency,
          confidence,
          transactions: similar,
          avgInterval,
          stdDeviation,
          category: txn.merchant?.categoryRef?.name || 'Uncategorized',
          tags: [],
          lastTransaction: format(lastDate, 'yyyy-MM-dd'),
          nextPredicted: format(nextPredicted, 'yyyy-MM-dd'),
          isActive: true
        })

        // Mark as processed
        similar.forEach(t => processed.add(t.id))
      }
    }
  })

  return clusters.sort((a, b) => b.transactions.length - a.transactions.length)
}

// Anomaly detection
function detectAnomalies(patterns: TransactionPattern[], allTransactions: any[]) {
  const anomalies = []

  patterns.forEach(pattern => {
    const recentTransactions = pattern.transactions
      .filter(t => differenceInDays(new Date(), parseISO(t.txn_date)) <= 30) // Last 30 days

    if (recentTransactions.length > 0) {
      const avgAmount = pattern.amount
      const recentAvg = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length

      // Check for significant changes
      const changePercent = Math.abs(recentAvg - avgAmount) / avgAmount

      if (changePercent > 0.2) { // 20% change
        anomalies.push({
          patternId: pattern.id,
          type: recentAvg > avgAmount ? 'price_increase' : 'price_decrease',
          changePercent,
          oldAmount: avgAmount,
          newAmount: recentAvg,
          affectedTransactions: recentTransactions.length
        })
      }
    }
  })

  return anomalies
}

const FREQUENCY_COLORS = {
  daily: 'var(--c-chart-3)',
  weekly: 'var(--c-chart-2)',
  biweekly: 'var(--c-chart-5)',
  monthly: 'var(--c-chart-4)',
  quarterly: 'var(--c-chart-1)',
  irregular: 'var(--c-chart-7)'
}

export default function Recurring() {
  const chart = useChartColors()
  const [selectedPattern, setSelectedPattern] = useState<TransactionPattern | null>(null)
  const [showAnomalies, setShowAnomalies] = useState(false)

  const queryClient = useQueryClient()

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', 10000],
    queryFn: () => fetchTransactions(10000),
  })

  // Analyze recurring patterns
  const recurringPatterns = useMemo(() => {
    if (!transactions) return []

    const expenseTransactions = transactions.filter(t => t.txn_type === 'PURCHASE')
    return clusterTransactions(expenseTransactions)
  }, [transactions])

  // Detect anomalies
  const anomalies = useMemo(() => {
    if (!transactions || !recurringPatterns.length) return []
    return detectAnomalies(recurringPatterns, transactions)
  }, [recurringPatterns, transactions])

  // Pattern statistics
  const patternStats = useMemo(() => {
    const frequencyCount = recurringPatterns.reduce((acc, pattern) => {
      acc[pattern.frequency] = (acc[pattern.frequency] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const categoryCount = recurringPatterns.reduce((acc, pattern) => {
      acc[pattern.category] = (acc[pattern.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalMonthly = recurringPatterns
      .filter(p => p.frequency === 'monthly')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalWeekly = recurringPatterns
      .filter(p => p.frequency === 'weekly')
      .reduce((sum, p) => sum + p.amount, 0) * 4.33 // Average weeks per month

    return {
      frequencyCount,
      categoryCount,
      totalMonthly,
      totalWeekly,
      totalRecurring: totalMonthly + totalWeekly
    }
  }, [recurringPatterns])

  // Spending predictability chart
  const predictabilityData = useMemo(() => {
    if (!recurringPatterns.length) return []

    return recurringPatterns.map(pattern => ({
      merchant: pattern.merchant.length > 15 ? pattern.merchant.substring(0, 15) + '...' : pattern.merchant,
      predictability: pattern.confidence * 100,
      frequency: pattern.frequency,
      amount: pattern.amount
    })).sort((a, b) => b.predictability - a.predictability).slice(0, 10)
  }, [recurringPatterns])

  // Pattern timeline for selected pattern
  const patternTimeline = useMemo(() => {
    if (!selectedPattern) return []

    return selectedPattern.transactions.map(txn => ({
      date: format(parseISO(txn.txn_date), 'MMM dd'),
      amount: txn.amount,
      expected: selectedPattern.amount,
      deviation: ((txn.amount - selectedPattern.amount) / selectedPattern.amount) * 100
    })).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
  }, [selectedPattern])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="skin-flat-card" style={{
          backgroundColor: 'var(--c-surface)',
          padding: '10px',
          border: '1px solid var(--c-hairline)',
          borderRadius: '4px',
          boxShadow: '0 2px 4px color-mix(in srgb, var(--c-scrim) 10%, transparent)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '5px 0 0 0', color: entry.color }}>
              {entry.name}: {entry.name.includes('%') ? `${entry.value.toFixed(1)}%` : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return <div className="loading">Analyzing recurring patterns...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Recurring Transaction Analysis</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowAnomalies(!showAnomalies)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showAnomalies ? 'var(--c-negative)' : 'var(--c-green)',
              color: 'var(--c-on-accent)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {showAnomalies ? 'Hide Anomalies' : 'Show Anomalies'}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <h3>Recurring Patterns</h3>
          <div className="value">{recurringPatterns.length}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', marginTop: '0.5rem' }}>
            Detected patterns
          </div>
        </div>

        <div className="stat-card">
          <h3>Monthly Recurring</h3>
          <div className="value">${formatCurrency(patternStats.totalMonthly)}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', marginTop: '0.5rem' }}>
            Fixed monthly costs
          </div>
        </div>

        <div className="stat-card">
          <h3>Weekly Recurring</h3>
          <div className="value">${formatCurrency(patternStats.totalWeekly)}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', marginTop: '0.5rem' }}>
            Weekly costs (monthly avg)
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: anomalies.length > 0 ? 'color-mix(in srgb, var(--c-negative) 10%, transparent)' : 'var(--c-surface-2)',
          borderLeft: anomalies.length > 0 ? '4px solid var(--c-negative)' : '4px solid var(--c-hairline)'
        }}>
          <h3 style={{ color: anomalies.length > 0 ? 'var(--c-negative)' : 'var(--c-text)' }}>
            Anomalies Detected
          </h3>
          <div className="value" style={{
            color: anomalies.length > 0 ? 'var(--c-negative)' : 'var(--c-text)'
          }}>
            {anomalies.length}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', marginTop: '0.5rem' }}>
            Unusual patterns
          </div>
        </div>
      </div>

      {/* Anomalies Alert */}
      {showAnomalies && anomalies.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'color-mix(in srgb, var(--c-negative) 10%, transparent)', borderLeft: '4px solid var(--c-negative)' }}>
          <h2 style={{ color: 'var(--c-negative)' }}>⚠️ Detected Anomalies</h2>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--c-surface)',
                  borderRadius: '8px',
                  border: '1px solid color-mix(in srgb, var(--c-negative) 30%, transparent)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{recurringPatterns.find(p => p.id === anomaly.patternId)?.merchant}</strong>
                    <span style={{ marginLeft: '1rem', color: anomaly.type === 'price_increase' ? 'var(--c-negative)' : 'var(--c-green)' }}>
                      {anomaly.type === 'price_increase' ? 'Price Increase' : 'Price Decrease'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: anomaly.type === 'price_increase' ? 'var(--c-negative)' : 'var(--c-green)' }}>
                      {anomaly.changePercent > 0 ? '+' : ''}{anomaly.changePercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--c-text-2)' }}>
                      ${formatCurrency(anomaly.oldAmount)} → ${formatCurrency(anomaly.newAmount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Predictability */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Pattern Predictability</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '1rem' }}>
          How predictable are your recurring expenses? (Higher = more regular)
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={predictabilityData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis tick={{ fill: chart.text }} dataKey="merchant" angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: chart.text }} label={{ value: 'Predictability %', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="predictability" fill="var(--c-violet)" name="Predictability %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Frequency Distribution */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Recurring Frequency Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={Object.entries(patternStats.frequencyCount).map(([frequency, count]) => ({
                name: frequency.charAt(0).toUpperCase() + frequency.slice(1),
                value: count,
                color: FREQUENCY_COLORS[frequency as keyof typeof FREQUENCY_COLORS]
              }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="var(--c-violet)"
              dataKey="value"
            >
              {Object.entries(patternStats.frequencyCount).map(([frequency, count], index) => (
                <Cell key={`cell-${index}`} fill={FREQUENCY_COLORS[frequency as keyof typeof FREQUENCY_COLORS]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Recurring Patterns Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Detected Recurring Patterns</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Frequency</th>
              <th>Confidence</th>
              <th>Category</th>
              <th>Transactions</th>
              <th>Next Expected</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recurringPatterns.map((pattern) => (
              <tr key={pattern.id}>
                <td style={{ fontWeight: '500' }}>{pattern.merchant}</td>
                <td>${formatCurrency(pattern.amount)}</td>
                <td>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    backgroundColor: `color-mix(in srgb, ${FREQUENCY_COLORS[pattern.frequency]} 12%, transparent)`,
                    color: FREQUENCY_COLORS[pattern.frequency]
                  }}>
                    {pattern.frequency.charAt(0).toUpperCase() + pattern.frequency.slice(1)}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '60px',
                      height: '8px',
                      backgroundColor: 'var(--c-hairline)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${pattern.confidence * 100}%`,
                        height: '100%',
                        backgroundColor: pattern.confidence > 0.8 ? 'var(--c-green)' : pattern.confidence > 0.6 ? 'var(--c-warning)' : 'var(--c-negative)'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.8rem' }}>{(pattern.confidence * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td>{pattern.category}</td>
                <td>{pattern.transactions.length}</td>
                <td style={{ fontSize: '0.9rem' }}>
                  {format(parseISO(pattern.nextPredicted), 'MMM dd, yyyy')}
                </td>
                <td>
                  <button
                    onClick={() => setSelectedPattern(pattern)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'var(--c-primary)',
                      color: 'var(--c-on-accent)',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pattern Detail View */}
      {selectedPattern && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>{selectedPattern.merchant} - Pattern Analysis</h2>
            <button
              onClick={() => setSelectedPattern(null)}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid var(--c-hairline)',
                backgroundColor: 'var(--c-surface)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--c-surface-2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '0.25rem' }}>Pattern Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                ${formatCurrency(selectedPattern.amount)}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--c-surface-2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '0.25rem' }}>Frequency</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                {selectedPattern.frequency}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--c-surface-2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '0.25rem' }}>Confidence</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: selectedPattern.confidence > 0.8 ? 'var(--c-green)' : selectedPattern.confidence > 0.6 ? 'var(--c-warning)' : 'var(--c-negative)' }}>
                {(selectedPattern.confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--c-surface-2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--c-text-2)', marginBottom: '0.25rem' }}>Next Expected</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {format(parseISO(selectedPattern.nextPredicted), 'MMM dd, yyyy')}
              </div>
            </div>
          </div>

          {/* Pattern Timeline */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3>Transaction Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={patternTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis tick={{ fill: chart.text }} dataKey="date" />
                <YAxis tick={{ fill: chart.text }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--c-violet)"
                  strokeWidth={3}
                  name="Actual Amount"
                />
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="var(--c-green)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Expected Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Individual Transactions */}
          <div>
            <h3>Individual Transactions ({selectedPattern.transactions.length})</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Deviation</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPattern.transactions
                    .sort((a, b) => parseISO(b.txn_date).getTime() - parseISO(a.txn_date).getTime())
                    .map((txn, index) => {
                      const deviation = ((txn.amount - selectedPattern.amount) / selectedPattern.amount) * 100
                      return (
                        <tr key={index}>
                          <td>{format(parseISO(txn.txn_date), 'MMM dd, yyyy')}</td>
                          <td style={{ color: amountColor(txn.txn_type) }}>{formatSignedAmount(txn.txn_type, txn.amount)}</td>
                          <td style={{
                            color: Math.abs(deviation) > 10 ? 'var(--c-negative)' : Math.abs(deviation) > 5 ? 'var(--c-warning)' : 'var(--c-green)',
                            fontWeight: Math.abs(deviation) > 5 ? 'bold' : 'normal'
                          }}>
                            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                          </td>
                          <td>{txn.description || '-'}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
