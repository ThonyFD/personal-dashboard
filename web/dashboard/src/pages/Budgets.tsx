import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTransactions, fetchMerchants } from '../api/dataconnect-client'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  parseISO,
  addMonths,
  subMonths
} from 'date-fns'

// Budget data structure (stored in localStorage for now)
interface Budget {
  id: string
  categoryId: number
  categoryName: string
  monthlyLimit: number
  period: 'monthly' | 'yearly'
  createdAt: string
  isActive: boolean
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c', '#d084d0']

export default function Budgets() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  const queryClient = useQueryClient()

  // Load budgets from localStorage
  const budgets = useMemo(() => {
    const stored = localStorage.getItem('financial_budgets')
    return stored ? JSON.parse(stored) : []
  }, [])

  // Get transactions for current period
  const periodStart = selectedPeriod === 'monthly' ? startOfMonth(selectedMonth) : startOfMonth(subMonths(new Date(), 11))
  const periodEnd = selectedPeriod === 'monthly' ? endOfMonth(selectedMonth) : endOfMonth(new Date())

  const { data: transactions, isLoading: txnLoading } = useQuery({
    queryKey: ['transactions', 10000, format(periodStart, 'yyyy-MM-dd'), format(periodEnd, 'yyyy-MM-dd')],
    queryFn: () => fetchTransactions(10000, format(periodStart, 'yyyy-MM-dd'), format(periodEnd, 'yyyy-MM-dd')),
  })

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: () => fetchMerchants(),
  })

  // Calculate spending by category
  const categorySpending = useMemo(() => {
    if (!transactions) return []

    const spending = new Map<string, { categoryId: number; categoryName: string; spent: number; budget: number }>()

    transactions
      .filter(txn => txn.txn_type === 'PURCHASE')
      .forEach(txn => {
        const categoryName = txn.merchant?.categoryRef?.name || 'Uncategorized'
        const categoryId = txn.merchant?.categoryRef?.id || 0

        if (!spending.has(categoryName)) {
          spending.set(categoryName, {
            categoryId,
            categoryName,
            spent: 0,
            budget: 0
          })
        }

        spending.get(categoryName)!.spent += txn.amount
      })

    // Add budget information
    budgets.forEach((budget: Budget) => {
      if (budget.isActive) {
        const key = budget.categoryName
        if (spending.has(key)) {
          spending.get(key)!.budget = selectedPeriod === 'monthly' ? budget.monthlyLimit : budget.monthlyLimit * 12
        } else {
          spending.set(key, {
            categoryId: budget.categoryId,
            categoryName: key,
            spent: 0,
            budget: selectedPeriod === 'monthly' ? budget.monthlyLimit : budget.monthlyLimit * 12
          })
        }
      }
    })

    return Array.from(spending.values())
      .map(item => ({
        ...item,
        remaining: Math.max(0, item.budget - item.spent),
        overspent: Math.max(0, item.spent - item.budget),
        percentage: item.budget > 0 ? (item.spent / item.budget) * 100 : 0
      }))
      .sort((a, b) => b.spent - a.spent)
  }, [transactions, budgets, selectedPeriod])

  // Budget vs Actual comparison
  const budgetVsActual = useMemo(() => {
    const budgeted = categorySpending.filter(c => c.budget > 0)
    const totalBudget = budgeted.reduce((sum, c) => sum + c.budget, 0)
    const totalSpent = budgeted.reduce((sum, c) => sum + c.spent, 0)

    return {
      totalBudget,
      totalSpent,
      remaining: Math.max(0, totalBudget - totalSpent),
      overspent: Math.max(0, totalSpent - totalBudget),
      percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    }
  }, [categorySpending])

  // Monthly budget tracking (for yearly view)
  const monthlyBudgetTracking = useMemo(() => {
    if (selectedPeriod !== 'yearly' || !transactions) return []

    const months = eachMonthOfInterval({
      start: startOfMonth(subMonths(new Date(), 11)),
      end: endOfMonth(new Date())
    })

    return months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      const monthTransactions = transactions.filter(txn => {
        const txnDate = parseISO(txn.txn_date)
        return txnDate >= monthStart && txnDate <= monthEnd && txn.txn_type === 'PURCHASE'
      })

      const spentByCategory = new Map<string, number>()
      monthTransactions.forEach(txn => {
        const categoryName = txn.merchant?.categoryRef?.name || 'Uncategorized'
        spentByCategory.set(categoryName, (spentByCategory.get(categoryName) || 0) + txn.amount)
      })

      const totalSpent = Array.from(spentByCategory.values()).reduce((sum, amount) => sum + amount, 0)
      const totalBudget = budgets
        .filter((b: Budget) => b.isActive)
        .reduce((sum: number, b: Budget) => sum + b.monthlyLimit, 0)

      return {
        month: format(month, 'MMM yyyy'),
        spent: totalSpent,
        budget: totalBudget,
        remaining: Math.max(0, totalBudget - totalSpent),
        overspent: Math.max(0, totalSpent - totalBudget)
      }
    })
  }, [transactions, budgets, selectedPeriod])

  // Save budget mutation
  const saveBudgetMutation = useMutation({
    mutationFn: async (newBudget: Omit<Budget, 'id' | 'createdAt'>) => {
      const budget: Budget = {
        ...newBudget,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }

      const updatedBudgets = [...budgets, budget]
      localStorage.setItem('financial_budgets', JSON.stringify(updatedBudgets))
      return budget
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setShowCreateForm(false)
    }
  })

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const updatedBudgets = budgets.filter((b: Budget) => b.id !== budgetId)
      localStorage.setItem('financial_budgets', JSON.stringify(updatedBudgets))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    }
  })

  const handleCreateBudget = (formData: FormData) => {
    const categoryId = parseInt(formData.get('categoryId') as string)
    const category = merchants?.find(m => m.categoryId === categoryId)
    if (!category) return

    saveBudgetMutation.mutate({
      categoryId,
      categoryName: category.categoryRef?.name || 'Unknown',
      monthlyLimit: parseFloat(formData.get('monthlyLimit') as string),
      period: 'monthly',
      isActive: true
    })
  }

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

  if (txnLoading) {
    return <div className="loading">Loading budget analysis...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Budget Tracking & Forecasting</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Create Budget
        </button>
      </div>

      {/* Period Selector */}
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
          <label style={{ fontWeight: '500', marginRight: '0.5rem' }}>Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'monthly' | 'yearly')}
            style={{
              padding: '0.4rem 0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {selectedPeriod === 'monthly' && (
          <div>
            <label style={{ fontWeight: '500', marginRight: '0.5rem' }}>Month:</label>
            <input
              type="month"
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              style={{
                padding: '0.4rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
        )}
      </div>

      {/* Budget Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{
          backgroundColor: budgetVsActual.percentage > 90 ? '#fff5f5' : '#f0fff4',
          borderLeft: `4px solid ${budgetVsActual.percentage > 90 ? '#e53e3e' : '#38a169'}`
        }}>
          <h3 style={{ color: budgetVsActual.percentage > 90 ? '#c53030' : '#2f855a' }}>
            Total Budget
          </h3>
          <div className="value" style={{
            color: budgetVsActual.percentage > 90 ? '#e53e3e' : '#38a169'
          }}>
            ${formatCurrency(budgetVsActual.totalBudget)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            {budgetVsActual.percentage.toFixed(1)}% used
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: budgetVsActual.overspent > 0 ? '#fff5f5' : '#f0fff4',
          borderLeft: `4px solid ${budgetVsActual.overspent > 0 ? '#e53e3e' : '#38a169'}`
        }}>
          <h3 style={{ color: budgetVsActual.overspent > 0 ? '#c53030' : '#2f855a' }}>
            {budgetVsActual.overspent > 0 ? 'Over Budget' : 'Remaining'}
          </h3>
          <div className="value" style={{
            color: budgetVsActual.overspent > 0 ? '#e53e3e' : '#38a169'
          }}>
            ${formatCurrency(budgetVsActual.overspent > 0 ? budgetVsActual.overspent : budgetVsActual.remaining)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            {selectedPeriod === 'monthly' ? 'This month' : 'This year'}
          </div>
        </div>

        <div className="stat-card">
          <h3>Active Budgets</h3>
          <div className="value">{budgets.filter((b: Budget) => b.isActive).length}</div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Categories tracked
          </div>
        </div>

        <div className="stat-card">
          <h3>Categories Over Budget</h3>
          <div className="value" style={{ color: '#e53e3e' }}>
            {categorySpending.filter(c => c.overspent > 0).length}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Need attention
          </div>
        </div>
      </div>

      {/* Budget vs Actual Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Budget vs Actual Spending</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Compare your budgeted amounts with actual spending by category
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={categorySpending.filter(c => c.budget > 0)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoryName" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="budget" fill="#82ca9d" name="Budget" />
            <Bar dataKey="spent" fill="#8884d8" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Budget Tracking (Yearly View) */}
      {selectedPeriod === 'yearly' && monthlyBudgetTracking.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Monthly Budget Tracking</h2>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Track budget performance month by month
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyBudgetTracking}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="budget" stroke="#82ca9d" strokeWidth={2} name="Budget" />
              <Line type="monotone" dataKey="spent" stroke="#8884d8" strokeWidth={2} name="Spent" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget Details Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Budget Details</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Budget</th>
              <th>Spent</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categorySpending.map((category) => (
              <tr key={category.categoryName}>
                <td style={{ fontWeight: '500' }}>{category.categoryName}</td>
                <td>${formatCurrency(category.budget)}</td>
                <td>${formatCurrency(category.spent)}</td>
                <td style={{
                  color: category.remaining > 0 ? '#38a169' : '#e53e3e',
                  fontWeight: '500'
                }}>
                  ${formatCurrency(category.remaining > 0 ? category.remaining : category.overspent)}
                </td>
                <td>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    backgroundColor: category.percentage > 90 ? '#fed7d7' :
                                   category.percentage > 75 ? '#fef5e7' : '#c6f6d5',
                    color: category.percentage > 90 ? '#c53030' :
                           category.percentage > 75 ? '#d69e2e' : '#2f855a'
                  }}>
                    {category.percentage > 100 ? 'Over Budget' :
                     category.percentage > 90 ? 'Near Limit' :
                     category.percentage > 75 ? 'Warning' : 'On Track'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => deleteBudgetMutation.mutate(
                      budgets.find((b: Budget) => b.categoryId === category.categoryId)?.id
                    )}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#e53e3e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                    disabled={!budgets.find((b: Budget) => b.categoryId === category.categoryId)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Budget Modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3>Create New Budget</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleCreateBudget(new FormData(e.target as HTMLFormElement))
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Category
                </label>
                <select
                  name="categoryId"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">Select Category</option>
                  {Array.from(new Set(merchants?.map(m => m.categoryRef).filter(Boolean)))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Monthly Limit ($)
                </label>
                <input
                  type="number"
                  name="monthlyLimit"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveBudgetMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {saveBudgetMutation.isPending ? 'Creating...' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}