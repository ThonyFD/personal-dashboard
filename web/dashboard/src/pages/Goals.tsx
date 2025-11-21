import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTransactions } from '../api/dataconnect-client'
import { useState, useMemo } from 'react'
import { formatCurrency } from '../utils/format'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import {
  format,
  parseISO,
  differenceInDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  isAfter,
  isBefore,
} from 'date-fns'

// Goal data structure (stored in localStorage for now)
interface FinancialGoal {
  id: string
  title: string
  description: string
  type: 'savings' | 'investment' | 'debt_reduction' | 'expense_reduction' | 'income_target'
  targetAmount: number
  currentAmount: number
  targetDate: string
  startDate: string
  categoryId?: number
  categoryName?: string
  isActive: boolean
  createdAt: string
  milestones: GoalMilestone[]
}

interface GoalMilestone {
  id: string
  goalId: string
  title: string
  targetAmount: number
  achievedDate?: string
  isAchieved: boolean
}

const GOAL_TYPES = {
  savings: { label: 'Ahorro', icon: '💰', color: '#38a169' },
  investment: { label: 'Inversión', icon: '📈', color: '#3182ce' },
  debt_reduction: { label: 'Reducción de Deuda', icon: '📉', color: '#e53e3e' },
  expense_reduction: { label: 'Reducción de Gastos', icon: '✂️', color: '#dd6b20' },
  income_target: { label: 'Meta de Ingresos', icon: '🎯', color: '#805ad5' },
}

interface GoalWithProgress extends FinancialGoal {
  percentage: number
  daysRemaining: number
  isOverdue: boolean
  projectedCompletion: Date | null
  isCompleted: boolean
}

export default function Goals() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null)

  const queryClient = useQueryClient()

  // Load goals from localStorage
  const goals = useMemo(() => {
    const stored = localStorage.getItem('financial_goals')
    return stored ? JSON.parse(stored) : []
  }, [])

  // Get transactions for progress calculation
  const { data: transactions } = useQuery({
    queryKey: ['transactions', 10000],
    queryFn: () => fetchTransactions(10000),
  })

  // Calculate goal progress based on transactions
  const goalsWithProgress = useMemo(() => {
    if (!transactions) return goals

    return goals.map((goal: FinancialGoal) => {
      let calculatedProgress = goal.currentAmount
      const startDate = parseISO(goal.startDate)
      const targetDate = parseISO(goal.targetDate)

      // Calculate progress based on goal type
      switch (goal.type) {
        case 'savings':
          // Savings goals: track net positive cash flow
          const savingsTransactions = transactions.filter(txn => {
            const txnDate = parseISO(txn.txn_date)
            return txn.txn_type === 'PAYMENT' &&
                   isAfter(txnDate, startDate) &&
                   isBefore(txnDate, new Date())
          })
          calculatedProgress = savingsTransactions.reduce((sum, txn) => sum + txn.amount, 0)
          break

        case 'debt_reduction':
          // Debt reduction: track payments to specific merchants/categories
          if (goal.categoryId) {
            const debtPayments = transactions.filter(txn => {
              const txnDate = parseISO(txn.txn_date)
              return txn.txn_type === 'PAYMENT' &&
                     txn.merchant?.categoryId === goal.categoryId &&
                     isAfter(txnDate, startDate) &&
                     isBefore(txnDate, new Date())
            })
            calculatedProgress = debtPayments.reduce((sum, txn) => sum + txn.amount, 0)
          }
          break

        case 'expense_reduction':
          // Expense reduction: track reduction in spending for category
          if (goal.categoryId) {
            const categoryExpenses = transactions.filter(txn => {
              const txnDate = parseISO(txn.txn_date)
              return txn.txn_type === 'PURCHASE' &&
                     txn.merchant?.categoryId === goal.categoryId &&
                     isAfter(txnDate, startDate) &&
                     isBefore(txnDate, new Date())
            })
            const totalSpent = categoryExpenses.reduce((sum, txn) => sum + txn.amount, 0)
            // For expense reduction, progress is inverse (less spending = more progress)
            calculatedProgress = Math.max(0, goal.targetAmount - totalSpent)
          }
          break

        case 'income_target':
          // Income target: track total income
          const incomeTransactions = transactions.filter(txn => {
            const txnDate = parseISO(txn.txn_date)
            return txn.txn_type === 'PAYMENT' &&
                   isAfter(txnDate, startDate) &&
                   isBefore(txnDate, new Date())
          })
          calculatedProgress = incomeTransactions.reduce((sum, txn) => sum + txn.amount, 0)
          break
      }

      const totalProgress = Math.max(goal.currentAmount, calculatedProgress)
      const percentage = goal.targetAmount > 0 ? (totalProgress / goal.targetAmount) * 100 : 0
      const daysRemaining = differenceInDays(targetDate, new Date())
      const isOverdue = daysRemaining < 0
      const projectedCompletion = percentage > 0 ?
        new Date(Date.now() + (daysRemaining / percentage) * (100 - percentage) * 24 * 60 * 60 * 1000) :
        null

      return {
        ...goal,
        currentAmount: totalProgress,
        percentage: Math.min(percentage, 100),
        daysRemaining,
        isOverdue,
        projectedCompletion,
        isCompleted: percentage >= 100
      }
    })
  }, [goals, transactions])

  // Progress timeline data
  const progressTimeline = useMemo(() => {
    if (!selectedGoal || !transactions) return []

    const months = eachMonthOfInterval({
      start: startOfMonth(parseISO(selectedGoal.startDate)),
      end: endOfMonth(new Date())
    })

    return months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      let monthlyProgress = 0

      switch (selectedGoal.type) {
        case 'savings':
        case 'income_target':
          const incomeTxns = transactions.filter(txn => {
            const txnDate = parseISO(txn.txn_date)
            return txn.txn_type === 'PAYMENT' &&
                   txnDate >= monthStart && txnDate <= monthEnd
          })
          monthlyProgress = incomeTxns.reduce((sum, txn) => sum + txn.amount, 0)
          break

        case 'debt_reduction':
          if (selectedGoal.categoryId) {
            const debtTxns = transactions.filter(txn => {
              const txnDate = parseISO(txn.txn_date)
              return txn.txn_type === 'PAYMENT' &&
                     txn.merchant?.categoryId === selectedGoal.categoryId &&
                     txnDate >= monthStart && txnDate <= monthEnd
            })
            monthlyProgress = debtTxns.reduce((sum, txn) => sum + txn.amount, 0)
          }
          break

        case 'expense_reduction':
          if (selectedGoal.categoryId) {
            const expenseTxns = transactions.filter(txn => {
              const txnDate = parseISO(txn.txn_date)
              return txn.txn_type === 'PURCHASE' &&
                     txn.merchant?.categoryId === selectedGoal.categoryId &&
                     txnDate >= monthStart && txnDate <= monthEnd
            })
            monthlyProgress = expenseTxns.reduce((sum, txn) => sum + txn.amount, 0)
          }
          break
      }

      return {
        month: format(month, 'MMM yyyy'),
        progress: monthlyProgress,
        cumulative: 0 // Will be calculated below
      }
    }).map((item, index, arr) => ({
      ...item,
      cumulative: arr.slice(0, index + 1).reduce((sum, m) => sum + m.progress, 0)
    }))
  }, [selectedGoal, transactions])

  // Save goal mutation
  const saveGoalMutation = useMutation({
    mutationFn: async (newGoal: Omit<FinancialGoal, 'id' | 'createdAt' | 'milestones'>) => {
      const goal: FinancialGoal = {
        ...newGoal,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        milestones: []
      }

      const updatedGoals = [...goals, goal]
      localStorage.setItem('financial_goals', JSON.stringify(updatedGoals))
      return goal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setShowCreateForm(false)
    }
  })

  // Update goal progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ goalId, newAmount }: { goalId: string, newAmount: number }) => {
      const updatedGoals = goals.map((goal: FinancialGoal) =>
        goal.id === goalId ? { ...goal, currentAmount: newAmount } : goal
      )
      localStorage.setItem('financial_goals', JSON.stringify(updatedGoals))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    }
  })

  const handleCreateGoal = (formData: FormData) => {
    const targetDate = new Date(formData.get('targetDate') as string)
    const startDate = new Date()

    saveGoalMutation.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as FinancialGoal['type'],
      targetAmount: parseFloat(formData.get('targetAmount') as string),
      currentAmount: parseFloat(formData.get('currentAmount') as string) || 0,
      targetDate: targetDate.toISOString(),
      startDate: startDate.toISOString(),
      categoryId: formData.get('categoryId') ? parseInt(formData.get('categoryId') as string) : undefined,
      categoryName: formData.get('categoryName') as string || undefined,
      isActive: true
    })
  }

  const activeGoals = goalsWithProgress.filter((goal) => goal.isActive)
  const completedGoals = goalsWithProgress.filter((goal) => goal.isCompleted)
  const overdueGoals = goalsWithProgress.filter((goal) => goal.isOverdue && !goal.isCompleted)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Financial Goals & Milestones</h1>
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
          Create Goal
        </button>
      </div>

      {/* Goals Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <h3>Active Goals</h3>
          <div className="value">{activeGoals.length}</div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            In progress
          </div>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#f0fff4', borderLeft: '4px solid #38a169' }}>
          <h3 style={{ color: '#2f855a' }}>Completed Goals</h3>
          <div className="value" style={{ color: '#38a169' }}>{completedGoals.length}</div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Achieved
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: overdueGoals.length > 0 ? '#fff5f5' : '#f8f9fa',
          borderLeft: overdueGoals.length > 0 ? '4px solid #e53e3e' : '4px solid #ddd'
        }}>
          <h3 style={{ color: overdueGoals.length > 0 ? '#c53030' : '#333' }}>
            Overdue Goals
          </h3>
          <div className="value" style={{
            color: overdueGoals.length > 0 ? '#e53e3e' : '#333'
          }}>
            {overdueGoals.length}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Need attention
          </div>
        </div>

        <div className="stat-card">
          <h3>Total Goals</h3>
          <div className="value">{goalsWithProgress.length}</div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            All time
          </div>
        </div>
      </div>

      {/* Active Goals List */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Active Goals</h2>
        {activeGoals.length > 0 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {activeGoals.map((goal: any) => (
              <div
                key={goal.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: goal.isOverdue ? '#fff5f5' : '#fafafa',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedGoal(goal)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{GOAL_TYPES[goal.type].icon}</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{goal.title}</h3>
                  </div>
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    backgroundColor: goal.isOverdue ? '#fed7d7' : '#c6f6d5',
                    color: goal.isOverdue ? '#c53030' : '#2f855a'
                  }}>
                    {goal.percentage.toFixed(1)}% Complete
                  </div>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    <span>Progress: {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                    <span>{goal.daysRemaining > 0 ? `${goal.daysRemaining} days left` : 'Overdue'}</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(goal.percentage, 100)}%`,
                      height: '100%',
                      backgroundColor: GOAL_TYPES[goal.type].color,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {goal.description && (
                  <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                    {goal.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            color: '#666',
            padding: '2rem',
            fontStyle: 'italic'
          }}>
            No active goals yet. Create your first financial goal to start tracking progress!
          </div>
        )}
      </div>

      {/* Goal Detail View */}
      {selectedGoal && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>{selectedGoal.title}</h2>
            <button
              onClick={() => setSelectedGoal(null)}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Current Progress</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {formatCurrency(selectedGoal.currentAmount)}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Target Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {formatCurrency(selectedGoal.targetAmount)}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Progress</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: GOAL_TYPES[selectedGoal.type].color }}>
                {selectedGoal.percentage.toFixed(1)}%
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>Days Remaining</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: selectedGoal.daysRemaining < 0 ? '#e53e3e' : '#38a169'
              }}>
                {selectedGoal.daysRemaining > 0 ? selectedGoal.daysRemaining :
                 selectedGoal.daysRemaining === 0 ? 'Today' : 'Overdue'}
              </div>
            </div>
          </div>

          {/* Progress Timeline */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3>Progress Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke={GOAL_TYPES[selectedGoal.type].color}
                  strokeWidth={3}
                  name="Cumulative Progress"
                />
                <Line
                  type="monotone"
                  dataKey="progress"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Monthly Progress"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Manual Progress Update */}
          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h4>Update Progress Manually</h4>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                placeholder="New amount"
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  flex: 1
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement
                    const newAmount = parseFloat(input.value)
                    if (!isNaN(newAmount)) {
                      updateProgressMutation.mutate({
                        goalId: selectedGoal.id,
                        newAmount
                      })
                      input.value = ''
                    }
                  }
                }}
              />
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: GOAL_TYPES[selectedGoal.type].color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                  const newAmount = parseFloat(input.value)
                  if (!isNaN(newAmount)) {
                    updateProgressMutation.mutate({
                      goalId: selectedGoal.id,
                      newAmount
                    })
                    input.value = ''
                  }
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="card">
          <h2>Completed Goals 🏆</h2>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {completedGoals.map((goal: any) => (
              <div
                key={goal.id}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #c6f6d5',
                  borderRadius: '8px',
                  backgroundColor: '#f0fff4',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{GOAL_TYPES[goal.type].icon}</span>
                  <div>
                    <div style={{ fontWeight: '500' }}>{goal.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      Completed: {formatCurrency(goal.targetAmount)}
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  backgroundColor: '#c6f6d5',
                  color: '#2f855a'
                }}>
                  ✅ Completed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
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
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3>Create New Financial Goal</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleCreateGoal(new FormData(e.target as HTMLFormElement))
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Goal Type
                </label>
                <select
                  name="type"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  {Object.entries(GOAL_TYPES).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Target Amount ($)
                </label>
                <input
                  type="number"
                  name="targetAmount"
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Current Amount ($)
                </label>
                <input
                  type="number"
                  name="currentAmount"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Target Date
                </label>
                <input
                  type="date"
                  name="targetDate"
                  required
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
                  disabled={saveGoalMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {saveGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}