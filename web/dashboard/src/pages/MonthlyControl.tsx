import { useState, useMemo, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import './MonthlyControl.css'
import {
  fetchMonthlyIncomes,
  createMonthlyIncome,
  updateMonthlyIncome,
  deleteMonthlyIncome,
  fetchManualTransactions,
  createManualTransaction,
  updateManualTransaction,
  deleteManualTransaction,
  toggleManualTransactionPaidStatus,
  type MonthlyIncome,
  type ManualTransaction,
} from '../api/dataconnect-client'
import { fetchCategories, type Category } from '../api/categories-client'
import { NotificationSettings } from '../components/NotificationSettings'

// Types
interface CombinedTransaction {
  id: string
  type: 'auto' | 'manual'
  day?: number
  description: string
  amount: number
  transactionType?: string // 'Inversión', 'Deuda', 'Ahorro', null
  paymentMethod?: string // 'BG', 'TDC(BANISTMO)', 'TDC(BAC)', 'YAPPY', 'CASH'
  isPaid: boolean
  notes?: string
  merchantName?: string
  provider?: string
  merchantId?: number
  categoryId?: number
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
}

export default function MonthlyControl() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([])
  const [transactions, setTransactions] = useState<CombinedTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isAddingIncome, setIsAddingIncome] = useState(false)
  const [isAddingTransaction, setIsAddingTransaction] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null)
  const [previousBalance, setPreviousBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isCopying, setIsCopying] = useState(false)

  // Filter states
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all')
  const [filterPaidStatus, setFilterPaidStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1 // 1-12
  const monthName = format(currentDate, 'MMMM yyyy')

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  // Load data when month changes
  useEffect(() => {
    loadMonthData()
  }, [year, month])

  const loadCategories = async () => {
    try {
      const categoriesData = await fetchCategories()
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadMonthData = async () => {
    setIsLoading(true)
    try {
      // Load incomes
      const incomesData = await fetchMonthlyIncomes(year, month)
      setIncomes(incomesData)

      // Load manual transactions
      const manualTxns = await fetchManualTransactions(year, month)
      const combined: CombinedTransaction[] = manualTxns.map(txn => {
        // Get category info - prefer direct categoryId, fallback to merchant's category
        const category = txn.categoryId && categories.length > 0
          ? categories.find(c => c.id === txn.categoryId)
          : undefined

        return {
          id: `manual-${txn.id}`,
          type: 'manual' as const,
          day: txn.day,
          description: txn.description,
          amount: txn.amount,
          transactionType: txn.transactionType || undefined,
          paymentMethod: txn.paymentMethod || undefined,
          isPaid: txn.isPaid,
          notes: txn.notes || undefined,
          merchantId: txn.merchantId || undefined,
          categoryId: txn.categoryId || undefined,
          categoryName: category?.name,
          categoryIcon: category?.icon,
          categoryColor: category?.color,
        }
      })
      setTransactions(combined)
    } catch (error) {
      console.error('Error loading month data:', error)
      alert('Error al cargar los datos del mes')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate totals
  const totals = useMemo(() => {
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0)
    const availableBalance = totalIncome + previousBalance
    const duplicatedTotal = availableBalance * 2 // Like Excel row 11

    const filteredTxns = transactions
      .filter(txn => {
        if (filterType !== 'all' && txn.transactionType !== filterType) return false
        if (filterPaymentMethod !== 'all' && txn.paymentMethod !== filterPaymentMethod) return false
        if (filterPaidStatus !== 'all') {
          const isPaid = filterPaidStatus === 'paid'
          if (txn.isPaid !== isPaid) return false
        }
        if (searchTerm && !txn.description.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        // Sort by day first (ascending)
        const dayA = a.day ?? 999 // Transactions without day go to the end
        const dayB = b.day ?? 999
        if (dayA !== dayB) {
          return dayA - dayB
        }
        // If same day, sort by description
        return a.description.localeCompare(b.description)
      })

    let totalExpenses = 0
    let totalInvestment = 0
    let totalDebt = 0
    let totalSavings = 0

    filteredTxns.forEach(txn => {
      if (txn.transactionType === 'Inversión') {
        totalInvestment += txn.amount
      } else if (txn.transactionType === 'Deuda') {
        totalDebt += txn.amount
      } else if (txn.transactionType === 'Ahorro') {
        totalSavings += txn.amount
      } else {
        totalExpenses += txn.amount
      }
    })

    const totalSpent = totalExpenses + totalInvestment + totalDebt + totalSavings
    const finalBalance = availableBalance - totalSpent

    return {
      totalIncome,
      availableBalance,
      duplicatedTotal,
      totalExpenses,
      totalInvestment,
      totalDebt,
      totalSavings,
      totalSpent,
      finalBalance,
      filteredTransactions: filteredTxns
    }
  }, [incomes, transactions, previousBalance, filterType, filterPaymentMethod, filterPaidStatus, searchTerm])

  const categoriesById = useMemo(() => {
    const map = new Map<number, Category>()
    categories.forEach(category => map.set(category.id, category))
    return map
  }, [categories])

  // Navigation
  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const isCurrentMonth = format(currentDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  // Income management
  const handleAddIncome = () => {
    setIsAddingIncome(true)
  }

  const handleSaveIncome = async (source: string, amount: number, notes?: string) => {
    try {
      const id = await createMonthlyIncome({
        year,
        month,
        source,
        amount,
        notes,
      })

      const newIncome: MonthlyIncome = {
        id,
        year,
        month,
        source,
        amount,
        notes,
      }
      setIncomes([...incomes, newIncome])
      setIsAddingIncome(false)
    } catch (error) {
      console.error('Error saving income:', error)
      alert('Error al guardar el ingreso')
    }
  }

  const handleEditIncome = (id: number) => {
    setEditingIncomeId(id)
  }

  const handleUpdateIncome = async (id: number, updates: { source: string; amount: number; notes?: string }) => {
    try {
      await updateMonthlyIncome(id, updates)
      setIncomes(incomes.map(inc =>
        inc.id === id ? { ...inc, ...updates } : inc
      ))
      setEditingIncomeId(null)
    } catch (error) {
      console.error('Error updating income:', error)
      alert('Error al actualizar el ingreso')
    }
  }

  const handleDeleteIncome = async (id: number) => {
    try {
      await deleteMonthlyIncome(id)
      setIncomes(incomes.filter(inc => inc.id !== id))
    } catch (error) {
      console.error('Error deleting income:', error)
      alert('Error al eliminar el ingreso')
    }
  }

  // Transaction management
  const handleAddTransaction = () => {
    setIsAddingTransaction(true)
  }

  const handleSaveTransaction = async (txn: Omit<CombinedTransaction, 'id' | 'type'>) => {
    try {
      // For now, we'll create a simple merchant name based on description if category is selected
      // TODO: In the future, create or find a proper merchant with the selected category
      const id = await createManualTransaction({
        year,
        month,
        day: txn.day,
        description: txn.description,
        amount: txn.amount,
        transactionType: txn.transactionType,
        paymentMethod: txn.paymentMethod,
        isPaid: txn.isPaid,
        notes: txn.notes,
        merchantId: undefined,
        categoryId: txn.categoryId,
      })

      const newTransaction: CombinedTransaction = {
        ...txn,
        id: `manual-${id}`,
        type: 'manual'
      }
      setTransactions([...transactions, newTransaction])
      setIsAddingTransaction(false)
    } catch (error) {
      console.error('Error saving transaction:', error)
      alert('Error al guardar la transacción')
    }
  }

  const handleTogglePaid = async (id: string) => {
    if (!id.startsWith('manual-')) return

    const numericId = parseInt(id.replace('manual-', ''))
    const txn = transactions.find(t => t.id === id)
    if (!txn) return

    try {
      await toggleManualTransactionPaidStatus(numericId, !txn.isPaid)
      setTransactions(transactions.map(t =>
        t.id === id ? { ...t, isPaid: !t.isPaid } : t
      ))
    } catch (error) {
      console.error('Error toggling paid status:', error)
      alert('Error al cambiar el estado de pago')
    }
  }

  const handleEditTransaction = (id: string) => {
    if (!id.startsWith('manual-')) return
    setEditingTransactionId(id)
  }

  const handleUpdateTransaction = async (id: string, updates: Partial<CombinedTransaction>) => {
    if (!id.startsWith('manual-')) return

    const numericId = parseInt(id.replace('manual-', ''))

    try {
      await updateManualTransaction(numericId, {
        day: updates.day,
        description: updates.description,
        amount: updates.amount,
        transactionType: updates.transactionType,
        paymentMethod: updates.paymentMethod,
        isPaid: updates.isPaid,
        notes: updates.notes,
        categoryId: updates.categoryId,
      })

      setTransactions(transactions.map(txn =>
        txn.id === id ? { ...txn, ...updates } : txn
      ))
      setEditingTransactionId(null)
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('Error al actualizar la transacción')
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!id.startsWith('manual-')) return

    const txn = transactions.find(t => t.id === id)
    if (!txn) return

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar esta transacción?\n\n` +
      `Descripción: ${txn.description}\n` +
      `Monto: $${txn.amount.toFixed(2)}\n\n` +
      `Esta acción no se puede deshacer.`
    )

    if (!confirmDelete) return

    const numericId = parseInt(id.replace('manual-', ''))

    try {
      await deleteManualTransaction(numericId)
      setTransactions(transactions.filter(txn => txn.id !== id))
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Error al eliminar la transacción')
    }
  }

  // Calculate running balance
  const transactionsWithBalance = useMemo(() => {
    let balance = totals.availableBalance
    return totals.filteredTransactions.map(txn => {
      balance -= txn.amount
      return { ...txn, balance }
    })
  }, [totals.filteredTransactions, totals.availableBalance])

  // Export to Excel/CSV
  const handleExport = () => {
    // TODO: Implement Excel export
    alert('Export functionality coming soon!')
  }

  // Copy transactions from previous month
  const handleCopyFromPreviousMonth = async () => {
    const prevMonth = subMonths(currentDate, 1)
    const prevYear = prevMonth.getFullYear()
    const prevMonthNum = prevMonth.getMonth() + 1
    const prevMonthName = format(prevMonth, 'MMMM yyyy')

    const confirmCopy = window.confirm(
      `¿Copiar todas las transacciones de ${prevMonthName} a ${monthName}?\n\n` +
      `Las transacciones se copiarán como "Pendientes" (no pagadas).`
    )

    if (!confirmCopy) return

    setIsCopying(true)
    try {
      // Fetch transactions from previous month
      const prevTransactions = await fetchManualTransactions(prevYear, prevMonthNum)

      if (prevTransactions.length === 0) {
        alert(`No hay transacciones en ${prevMonthName} para copiar.`)
        setIsCopying(false)
        return
      }

      // Copy each transaction to current month
      let copiedCount = 0
      for (const txn of prevTransactions) {
        await createManualTransaction({
          year,
          month,
          day: txn.day, // Keep the same day
          description: txn.description,
          amount: txn.amount,
          transactionType: txn.transactionType,
          paymentMethod: txn.paymentMethod,
          isPaid: false, // Always start as unpaid
          notes: txn.notes,
          merchantId: txn.merchantId,
          categoryId: txn.categoryId,
        })
        copiedCount++
      }

      alert(`Se copiaron ${copiedCount} transacciones de ${prevMonthName} a ${monthName}.`)

      // Reload current month data
      await loadMonthData()
    } catch (error) {
      console.error('Error copying transactions:', error)
      alert('Error al copiar las transacciones')
    } finally {
      setIsCopying(false)
    }
  }

  if (isLoading) {
    return (
      <div className="monthly-control">
        <div className="monthly-control-header">
          <h1>Control Mensual</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Cargando datos del mes...
        </div>
      </div>
    )
  }

  return (
    <div className="monthly-control">
      <div className="monthly-control-header">
        <h1>Control Mensual</h1>

        {/* Month Navigator */}
        <div className="month-navigator">
          <button onClick={handlePreviousMonth} className="nav-btn">
            ◀ {format(subMonths(currentDate, 1), 'MMM yyyy')}
          </button>
          <h2 className="current-month">{monthName.toUpperCase()}</h2>
          <button
            onClick={handleNextMonth}
            className="nav-btn"
            disabled={isCurrentMonth}
          >
            {format(addMonths(currentDate, 1), 'MMM yyyy')} ▶
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <NotificationSettings />

      {/* Incomes Panel */}
      <div className="incomes-panel card">
        <h3>INGRESOS DEL MES</h3>
        <div className="incomes-list">
          {incomes.map(income => {
            const isEditing = editingIncomeId === income.id

            if (isEditing) {
              return (
                <IncomeEditForm
                  key={income.id}
                  income={income}
                  onSave={(updates) => handleUpdateIncome(income.id, updates)}
                  onCancel={() => setEditingIncomeId(null)}
                />
              )
            }

            return (
              <div key={income.id} className="income-item">
                <span className="income-source">{income.source}</span>
                <span className="income-amount">${income.amount.toFixed(2)}</span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button
                    onClick={() => handleEditIncome(income.id)}
                    className="edit-btn"
                    title="Editar"
                    style={{ fontSize: '0.9rem' }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteIncome(income.id)}
                    className="delete-btn"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}

          {isAddingIncome && (
            <IncomeForm
              onSave={handleSaveIncome}
              onCancel={() => setIsAddingIncome(false)}
            />
          )}
        </div>

        {!isAddingIncome && (
          <button onClick={handleAddIncome} className="add-btn">
            + Agregar Ingreso
          </button>
        )}

        <div className="incomes-summary">
          <div className="summary-row">
            <span>Total Ingresos:</span>
            <span className="amount">${totals.totalIncome.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Saldo Anterior:</span>
            <input
              type="number"
              value={previousBalance}
              onChange={(e) => setPreviousBalance(parseFloat(e.target.value) || 0)}
              className="balance-input"
            />
          </div>
          <div className="summary-row total">
            <span>DISPONIBLE:</span>
            <span className="amount">${totals.availableBalance.toFixed(2)}</span>
          </div>
          <div className="summary-row projection">
            <span>Proyección (x2):</span>
            <span className="amount">${totals.duplicatedTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h4>Gastos</h4>
          <div className="amount">${totals.totalExpenses.toFixed(2)}</div>
        </div>
        <div className="summary-card investment">
          <h4>Inversión</h4>
          <div className="amount">${totals.totalInvestment.toFixed(2)}</div>
        </div>
        <div className="summary-card debt">
          <h4>Deuda</h4>
          <div className="amount">${totals.totalDebt.toFixed(2)}</div>
        </div>
        <div className="summary-card savings">
          <h4>Ahorro</h4>
          <div className="amount">${totals.totalSavings.toFixed(2)}</div>
        </div>
        <div className={`summary-card balance ${totals.finalBalance >= 0 ? 'positive' : 'negative'}`}>
          <h4>Saldo Final</h4>
          <div className="amount">${totals.finalBalance.toFixed(2)}</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="transactions-section card">
        <div className="transactions-header">
          <h3>TRANSACCIONES</h3>
          <div className="header-actions">
            <button
              onClick={handleCopyFromPreviousMonth}
              className="copy-btn"
              disabled={isCopying}
              title="Copiar transacciones del mes anterior"
            >
              {isCopying ? '⏳ Copiando...' : '📋 Copiar del Mes Anterior'}
            </button>
            <button onClick={handleExport} className="export-btn">
              📥 Exportar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Todos los Tipos</option>
            <option value="">Gastos Normales</option>
            <option value="Inversión">Inversión</option>
            <option value="Deuda">Deuda</option>
            <option value="Ahorro">Ahorro</option>
          </select>

          <select value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)}>
            <option value="all">Todas las Formas de Pago</option>
            <option value="BG">BG</option>
            <option value="TDC(BANISTMO)">TDC(BANISTMO)</option>
            <option value="TDC(BAC)">TDC(BAC)</option>
            <option value="YAPPY">YAPPY</option>
            <option value="CASH">CASH</option>
          </select>

          <select value={filterPaidStatus} onChange={(e) => setFilterPaidStatus(e.target.value)}>
            <option value="all">Todos los Estados</option>
            <option value="paid">Pagados</option>
            <option value="pending">Pendientes</option>
          </select>

          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {!isAddingTransaction && (
          <button onClick={handleAddTransaction} className="add-btn">
            + Agregar Transacción
          </button>
        )}

        {isAddingTransaction && (
          <TransactionForm
            categories={categories}
            onSave={handleSaveTransaction}
            onCancel={() => setIsAddingTransaction(false)}
          />
        )}

        {/* Transactions Table */}
        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Día</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Tipo</th>
                <th>Forma de Pago</th>
                <th>✓</th>
                <th>Saldo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transactionsWithBalance.map((txn) => {
                const isEditing = editingTransactionId === txn.id
                const category = txn.categoryId ? categoriesById.get(txn.categoryId) : undefined
                const categoryName = txn.categoryName ?? category?.name
                const categoryIcon = txn.categoryIcon ?? category?.icon
                const categoryColor = txn.categoryColor ?? category?.color
                const tagColor = categoryColor || '#95A5A6'

                if (isEditing) {
                  return (
                    <TransactionEditRow
                      key={txn.id}
                      transaction={txn}
                      categories={categories}
                      onSave={(updates) => handleUpdateTransaction(txn.id, updates)}
                      onCancel={() => setEditingTransactionId(null)}
                    />
                  )
                }

                return (
                  <tr key={txn.id} className={`${txn.type} ${!txn.isPaid ? 'pending' : ''}`}>
                    <td>{txn.day || '-'}</td>
                    <td className="description">{txn.description}</td>
                    <td>
                      {categoryName ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: `${tagColor}20`,
                          border: `1px solid ${tagColor}`,
                          fontSize: '0.85rem'
                        }}>
                          <span>{categoryIcon || '📦'}</span>
                          <span>{categoryName}</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="amount">${txn.amount.toFixed(2)}</td>
                    <td className={`type ${txn.transactionType?.toLowerCase()}`}>
                      {txn.transactionType || '-'}
                    </td>
                    <td>{txn.paymentMethod || '-'}</td>
                    <td className="paid-status">
                      <button
                        onClick={() => handleTogglePaid(txn.id)}
                        className={`paid-toggle ${txn.isPaid ? 'paid' : 'pending'}`}
                        title={txn.isPaid ? 'Pagado' : 'Pendiente'}
                      >
                        {txn.isPaid ? '✓' : '⏳'}
                      </button>
                    </td>
                    <td className={`balance ${txn.balance >= 0 ? 'positive' : 'negative'}`}>
                      ${txn.balance.toFixed(2)}
                    </td>
                    <td>
                      {txn.type === 'manual' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleEditTransaction(txn.id)}
                            className="edit-btn"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(txn.id)}
                            className="delete-btn"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Income Form Component (for adding new incomes)
interface IncomeFormProps {
  onSave: (source: string, amount: number, notes?: string) => void
  onCancel: () => void
}

function IncomeForm({ onSave, onCancel }: IncomeFormProps) {
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (source && amount) {
      onSave(source, parseFloat(amount))
      setSource('')
      setAmount('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="income-form">
      <input
        type="text"
        placeholder="Fuente de ingreso"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        required
      />
      <input
        type="number"
        step="0.01"
        placeholder="Monto"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <div className="form-actions">
        <button type="submit" className="save-btn">Guardar</button>
        <button type="button" onClick={onCancel} className="cancel-btn">Cancelar</button>
      </div>
    </form>
  )
}

// Income Edit Form Component
interface IncomeEditFormProps {
  income: MonthlyIncome
  onSave: (updates: { source: string; amount: number; notes?: string }) => void
  onCancel: () => void
}

function IncomeEditForm({ income, onSave, onCancel }: IncomeEditFormProps) {
  const [source, setSource] = useState(income.source)
  const [amount, setAmount] = useState(income.amount.toString())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (source && amount) {
      onSave({
        source,
        amount: parseFloat(amount),
        notes: income.notes,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="income-form editing">
      <input
        type="text"
        placeholder="Fuente de ingreso"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        required
        style={{ flex: 1 }}
      />
      <input
        type="number"
        step="0.01"
        placeholder="Monto"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        style={{ width: '120px' }}
      />
      <div className="form-actions" style={{ display: 'flex', gap: '0.3rem' }}>
        <button type="submit" className="save-btn" title="Guardar">✓</button>
        <button type="button" onClick={onCancel} className="cancel-btn" title="Cancelar">✕</button>
      </div>
    </form>
  )
}

// Transaction Form Component (for adding new transactions)
interface TransactionFormProps {
  categories: Category[]
  onSave: (transaction: Omit<CombinedTransaction, 'id' | 'type'>) => void
  onCancel: () => void
}

function TransactionForm({ categories, onSave, onCancel }: TransactionFormProps) {
  const [day, setDay] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionType, setTransactionType] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [isPaid, setIsPaid] = useState(false)
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount) return

    // Get category info for the selected category
    const selectedCategory = categoryId ? categories.find(c => c.id === categoryId) : undefined

    onSave({
      day: day ? parseInt(day) : undefined,
      description,
      amount: parseFloat(amount),
      transactionType: transactionType || undefined,
      paymentMethod: paymentMethod || undefined,
      categoryId: categoryId,
      categoryName: selectedCategory?.name,
      categoryIcon: selectedCategory?.icon,
      categoryColor: selectedCategory?.color,
      isPaid,
      notes: notes || undefined,
    })

    // Reset form
    setDay('')
    setDescription('')
    setAmount('')
    setTransactionType('')
    setPaymentMethod('')
    setCategoryId(undefined)
    setIsPaid(false)
    setNotes('')
  }

  return (
    <form onSubmit={handleSubmit} className="transaction-form" style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Día</label>
          <input
            type="number"
            min="1"
            max="31"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            placeholder="Día del mes"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Descripción *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Descripción"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Monto *</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Tipo</label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="">Gasto Normal</option>
            <option value="Inversión">Inversión</option>
            <option value="Deuda">Deuda</option>
            <option value="Ahorro">Ahorro</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Categoría</label>
          <select
            value={categoryId || ''}
            onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : undefined)}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="">Sin categoría</option>
            {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Forma de Pago</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="">Seleccionar...</option>
            <option value="BG">BG</option>
            <option value="TDC(BANISTMO)">TDC(BANISTMO)</option>
            <option value="TDC(BAC)">TDC(BAC)</option>
            <option value="YAPPY">YAPPY</option>
            <option value="CASH">CASH</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Estado</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
            />
            <span>{isPaid ? 'Pagado' : 'Pendiente'}</span>
          </label>
        </div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Notas</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales (opcional)"
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button type="submit" className="save-btn" style={{ padding: '0.5rem 1rem' }}>
          Guardar Transacción
        </button>
        <button type="button" onClick={onCancel} className="cancel-btn" style={{ padding: '0.5rem 1rem' }}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

// Transaction Edit Row Component
interface TransactionEditRowProps {
  transaction: CombinedTransaction
  categories: Category[]
  onSave: (updates: Partial<CombinedTransaction>) => void
  onCancel: () => void
}

function TransactionEditRow({ transaction, categories, onSave, onCancel }: TransactionEditRowProps) {
  const [day, setDay] = useState(transaction.day?.toString() || '')
  const [description, setDescription] = useState(transaction.description)
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [transactionType, setTransactionType] = useState(transaction.transactionType || '')
  const [paymentMethod, setPaymentMethod] = useState(transaction.paymentMethod || '')
  const [categoryId, setCategoryId] = useState<number | undefined>(transaction.categoryId)
  const [isPaid, setIsPaid] = useState(transaction.isPaid)
  const [notes, setNotes] = useState(transaction.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Get category info for the selected category
    const selectedCategory = categoryId ? categories.find(c => c.id === categoryId) : undefined

    onSave({
      day: day ? parseInt(day) : undefined,
      description,
      amount: parseFloat(amount),
      transactionType: transactionType || undefined,
      paymentMethod: paymentMethod || undefined,
      categoryId: categoryId,
      categoryName: selectedCategory?.name,
      categoryIcon: selectedCategory?.icon,
      categoryColor: selectedCategory?.color,
      isPaid,
      notes: notes || undefined,
    })
  }

  return (
    <tr className="editing">
      <td>
        <input
          type="number"
          min="1"
          max="31"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          style={{ width: '50px' }}
        />
      </td>
      <td>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          style={{ width: '100%' }}
        />
      </td>
      <td>
        <select
          value={categoryId || ''}
          onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : undefined)}
          style={{ width: '100%', fontSize: '0.9rem' }}
        >
          <option value="">-</option>
          {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{ width: '100px' }}
        />
      </td>
      <td>
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="">Normal</option>
          <option value="Inversión">Inversión</option>
          <option value="Deuda">Deuda</option>
          <option value="Ahorro">Ahorro</option>
        </select>
      </td>
      <td>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="">-</option>
          <option value="BG">BG</option>
          <option value="TDC(BANISTMO)">TDC(BANISTMO)</option>
          <option value="TDC(BAC)">TDC(BAC)</option>
          <option value="YAPPY">YAPPY</option>
          <option value="CASH">CASH</option>
        </select>
      </td>
      <td>
        <input
          type="checkbox"
          checked={isPaid}
          onChange={(e) => setIsPaid(e.target.checked)}
        />
      </td>
      <td>-</td>
      <td>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSubmit}
            className="save-btn"
            title="Guardar"
            type="button"
          >
            ✓
          </button>
          <button
            onClick={onCancel}
            className="cancel-btn"
            title="Cancelar"
            type="button"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}
