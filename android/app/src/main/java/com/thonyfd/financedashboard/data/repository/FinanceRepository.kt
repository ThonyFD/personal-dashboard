package com.thonyfd.financedashboard.data.repository

import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.models.CategorySpend
import com.thonyfd.financedashboard.data.models.ManualTransactionRow
import com.thonyfd.financedashboard.data.models.MonthlyIncomeRow
import com.thonyfd.financedashboard.data.models.Transaction
import com.thonyfd.financedashboard.data.models.UpcomingPayment
import com.thonyfd.financedashboard.data.models.WidgetData
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

class FinanceRepository {

    private val supabase = SupabaseConfig.client
    // DB stores uppercase enum values. INCOME = Yappy received / deposits (not an expense).
    // REFUND = money returned. Everything else (PURCHASE, PAYMENT, TRANSFER, FEE, WITHDRAWAL) is outgoing.
    private val nonExpenseTypes = setOf("INCOME", "REFUND")

    suspend fun getWidgetData(
        year: Int = LocalDate.now().year,
        month: Int = LocalDate.now().monthValue
    ): WidgetData {
        val today = LocalDate.now()
        val firstOfMonth = LocalDate.of(year, month, 1)
        val lastOfMonth = firstOfMonth.withDayOfMonth(firstOfMonth.lengthOfMonth())
        val effectiveEnd = if (lastOfMonth.isAfter(today)) today else lastOfMonth
        val isCurrentMonth = (year == today.year && month == today.monthValue)

        // All transactions for the selected month (sorted desc for recent list)
        // v_transactions flattens the merchants→categories join into category_name / category_icon
        val monthlyTxns = supabase.from("v_transactions")
            .select {
                filter {
                    gte("txn_date", firstOfMonth.toString())
                    lte("txn_date", effectiveEnd.toString())
                }
                order("txn_date", Order.DESCENDING)
                limit(500)
            }
            .decodeList<Transaction>()
            .filter { it.txnDate in firstOfMonth.toString()..effectiveEnd.toString() }
            .filter { it.txnType.uppercase() !in nonExpenseTypes }

        // Pending manual transactions for selected month
        val pendingPayments = fetchPendingPayments(year, month, today)

        val monthLabel = firstOfMonth
            .format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale("es")))
            .replaceFirstChar { it.uppercase() }

        val monthlySpend = monthlyTxns.sumOf { it.amount }
        val topCategories = computeTopCategories(monthlyTxns)
        val updatedAt = DateTimeFormatter.ofPattern("HH:mm").format(java.time.LocalTime.now())

        val manualTxns = fetchAllManualTransactions(year, month)
        val totalGastos    = manualTxns.filter { it.transactionType == null }.sumOf { it.amount }
        val totalInversion = manualTxns.filter { it.transactionType == "Inversión" }.sumOf { it.amount }
        val totalDeuda     = manualTxns.filter { it.transactionType == "Deuda" }.sumOf { it.amount }
        val totalAhorro    = manualTxns.filter { it.transactionType == "Ahorro" }.sumOf { it.amount }
        val totalSpent     = totalGastos + totalInversion + totalDeuda + totalAhorro
        val totalIncome    = fetchIncomeTotal(year, month)

        return WidgetData(
            monthlySpend = monthlySpend,
            monthlyBudget = null,
            monthLabel = monthLabel,
            txnCount = monthlyTxns.size,
            pendingCount = pendingPayments.size,
            isCurrentMonth = isCurrentMonth,
            recentTransactions = monthlyTxns.take(5),
            upcomingPayments = pendingPayments,
            topCategories = topCategories,
            lastUpdated = updatedAt,
            totalGastos = totalGastos,
            totalInversion = totalInversion,
            totalDeuda = totalDeuda,
            totalAhorro = totalAhorro,
            totalSpent = totalSpent,
            saldoFinal = totalIncome - totalSpent
        )
    }

    private suspend fun fetchAllManualTransactions(year: Int, month: Int): List<ManualTransactionRow> =
        supabase.from("manual_transactions")
            .select {
                filter {
                    eq("year", year)
                    eq("month", month)
                }
            }
            .decodeList<ManualTransactionRow>()

    private suspend fun fetchIncomeTotal(year: Int, month: Int): Double =
        supabase.from("monthly_incomes")
            .select {
                filter {
                    eq("year", year)
                    eq("month", month)
                }
            }
            .decodeList<MonthlyIncomeRow>()
            .sumOf { it.amount }

    // ---------------------------------------------------------------------------
    // Pending payments from manual_transactions (same data as Monthly Control).
    // Current month → only unpaid. Past months → all (overdue view).
    // ---------------------------------------------------------------------------
    private suspend fun fetchPendingPayments(
        year: Int,
        month: Int,
        today: LocalDate
    ): List<UpcomingPayment> {
        val todayDay = if (today.year == year && today.monthValue == month) today.dayOfMonth else 31

        val rows = supabase.from("manual_transactions")
            .select {
                filter {
                    eq("year", year)
                    eq("month", month)
                    eq("is_paid", false)
                }
                order("day", Order.ASCENDING)
                limit(20)
            }
            .decodeList<ManualTransactionRow>()

        return rows.map { row ->
            UpcomingPayment(
                description = row.description,
                amount = row.amount,
                day = row.day,
                daysUntil = if (row.day != null) row.day - todayDay else 0,
                paymentMethod = row.paymentMethod,
                transactionType = row.transactionType
            )
        }
    }

    // ---------------------------------------------------------------------------
    // Category transactions filter
    // ---------------------------------------------------------------------------
    suspend fun getTransactionsByCategory(
        categoryName: String,
        year: Int,
        month: Int
    ): List<Transaction> {
        val today = LocalDate.now()
        val firstOfMonth = LocalDate.of(year, month, 1)
        val lastOfMonth = firstOfMonth.withDayOfMonth(firstOfMonth.lengthOfMonth())
        val effectiveEnd = if (lastOfMonth.isAfter(today)) today else lastOfMonth

        return supabase.from("v_transactions")
            .select {
                filter {
                    gte("txn_date", firstOfMonth.toString())
                    lte("txn_date", effectiveEnd.toString())
                }
                order("txn_date", Order.DESCENDING)
                limit(500)
            }
            .decodeList<Transaction>()
            .filter { it.txnType.uppercase() !in nonExpenseTypes }
            .filter { resolveTransactionCategory(it).first == categoryName }
    }

    private fun resolveTransactionCategory(txn: Transaction): Pair<String, String> =
        if (txn.categoryName != null) Pair(txn.categoryName, txn.categoryIcon ?: "💳")
        else Pair("Otros", "💳")

    // ---------------------------------------------------------------------------
    // Top categories
    // ---------------------------------------------------------------------------
    private fun computeTopCategories(transactions: List<Transaction>): List<CategorySpend> {
        val total = transactions.sumOf { it.amount }.takeIf { it > 0 } ?: return emptyList()

        val categoryMap = mutableMapOf<String, Triple<String, String, Double>>()
        for (txn in transactions) {
            val (key, emoji) = resolveTransactionCategory(txn)
            val existing = categoryMap[key]
            categoryMap[key] = Triple(key, emoji, (existing?.third ?: 0.0) + txn.amount)
        }

        return categoryMap.values
            .sortedByDescending { it.third }
            .map { (name, emoji, amount) ->
                CategorySpend(
                    name = name,
                    emoji = emoji,
                    amount = (amount * 100).roundToInt() / 100.0,
                    percentage = ((amount / total) * 100).roundToInt()
                )
            }
    }
}
