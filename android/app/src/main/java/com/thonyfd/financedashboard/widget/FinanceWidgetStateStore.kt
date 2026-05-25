package com.thonyfd.financedashboard.widget

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.thonyfd.financedashboard.data.models.CategorySpend
import com.thonyfd.financedashboard.data.models.Transaction
import com.thonyfd.financedashboard.data.models.UpcomingPayment
import com.thonyfd.financedashboard.data.models.WidgetData
import kotlinx.coroutines.flow.first
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDate

private val Context.widgetDataStore by preferencesDataStore(name = "widget_state")

object FinanceWidgetStateStore {

    private val MONTHLY_SPEND    = doublePreferencesKey("monthly_spend")
    private val LAST_UPDATED     = stringPreferencesKey("last_updated")
    private val RECENT_TXNS      = stringPreferencesKey("recent_txns")
    private val UPCOMING         = stringPreferencesKey("upcoming")
    private val CATEGORIES       = stringPreferencesKey("categories")
    private val IS_ERROR         = stringPreferencesKey("is_error")
    private val MONTH_LABEL      = stringPreferencesKey("month_label")
    private val TXN_COUNT        = intPreferencesKey("txn_count")
    private val PENDING_COUNT    = intPreferencesKey("pending_count")
    private val IS_CURRENT_MONTH = stringPreferencesKey("is_current_month")
    private val SELECTED_YEAR    = intPreferencesKey("selected_year")
    private val SELECTED_MONTH   = intPreferencesKey("selected_month")
    private val TOTAL_GASTOS     = doublePreferencesKey("total_gastos")
    private val TOTAL_INVERSION  = doublePreferencesKey("total_inversion")
    private val TOTAL_DEUDA      = doublePreferencesKey("total_deuda")
    private val TOTAL_AHORRO     = doublePreferencesKey("total_ahorro")
    private val TOTAL_SPENT      = doublePreferencesKey("total_spent")
    private val SALDO_FINAL      = doublePreferencesKey("saldo_final")

    private val json = Json { ignoreUnknownKeys = true }

    // ------------------------------------------------------------------
    // Selected month (for navigation)
    // ------------------------------------------------------------------
    suspend fun getSelectedYearMonth(context: Context): Pair<Int, Int> {
        val prefs = context.widgetDataStore.data.first()
        val today = LocalDate.now()
        return Pair(
            prefs[SELECTED_YEAR] ?: today.year,
            prefs[SELECTED_MONTH] ?: today.monthValue
        )
    }

    suspend fun setSelectedYearMonth(context: Context, year: Int, month: Int) {
        context.widgetDataStore.edit { prefs ->
            prefs[SELECTED_YEAR] = year
            prefs[SELECTED_MONTH] = month
        }
    }

    // ------------------------------------------------------------------
    // Save / Load widget data
    // ------------------------------------------------------------------
    suspend fun saveWidgetData(context: Context, data: WidgetData) {
        context.widgetDataStore.edit { prefs ->
            prefs[MONTHLY_SPEND]    = data.monthlySpend
            prefs[LAST_UPDATED]     = data.lastUpdated
            prefs[MONTH_LABEL]      = data.monthLabel
            prefs[TXN_COUNT]        = data.txnCount
            prefs[PENDING_COUNT]    = data.pendingCount
            prefs[IS_CURRENT_MONTH] = data.isCurrentMonth.toString()
            prefs[IS_ERROR]         = "false"
            prefs[TOTAL_GASTOS]     = data.totalGastos
            prefs[TOTAL_INVERSION]  = data.totalInversion
            prefs[TOTAL_DEUDA]      = data.totalDeuda
            prefs[TOTAL_AHORRO]     = data.totalAhorro
            prefs[TOTAL_SPENT]      = data.totalSpent
            prefs[SALDO_FINAL]      = data.saldoFinal
            prefs[RECENT_TXNS]      = json.encodeToString(data.recentTransactions)
            prefs[UPCOMING] = json.encodeToString(data.upcomingPayments.map {
                listOf(
                    it.description,
                    it.amount.toString(),
                    it.day?.toString() ?: "",
                    it.daysUntil.toString(),
                    it.paymentMethod ?: "",
                    it.transactionType ?: ""
                )
            })
            prefs[CATEGORIES] = json.encodeToString(data.topCategories.map {
                listOf(it.name, it.emoji, it.amount.toString(), it.percentage.toString())
            })
        }
    }

    suspend fun loadWidgetData(context: Context): WidgetData {
        val prefs: Preferences = context.widgetDataStore.data.first()

        val isError         = prefs[IS_ERROR] == "true"
        val monthlySpend    = prefs[MONTHLY_SPEND] ?: 0.0
        val lastUpdated     = prefs[LAST_UPDATED] ?: "--:--"
        val monthLabel      = prefs[MONTH_LABEL] ?: ""
        val txnCount        = prefs[TXN_COUNT] ?: 0
        val pendingCount    = prefs[PENDING_COUNT] ?: 0
        val isCurrentMonth  = prefs[IS_CURRENT_MONTH] != "false"

        val recentTxns: List<Transaction> = runCatching {
            prefs[RECENT_TXNS]?.let { json.decodeFromString<List<Transaction>>(it) } ?: emptyList()
        }.getOrDefault(emptyList())

        val upcomingPayments: List<UpcomingPayment> = runCatching {
            prefs[UPCOMING]?.let { raw ->
                json.decodeFromString<List<List<String>>>(raw).map { row ->
                    UpcomingPayment(
                        description     = row[0],
                        amount          = row[1].toDouble(),
                        day             = row[2].toIntOrNull(),
                        daysUntil       = row[3].toIntOrNull() ?: 0,
                        paymentMethod   = row.getOrNull(4)?.takeIf { it.isNotEmpty() },
                        transactionType = row.getOrNull(5)?.takeIf { it.isNotEmpty() }
                    )
                }
            } ?: emptyList()
        }.getOrDefault(emptyList())

        val categories: List<CategorySpend> = runCatching {
            prefs[CATEGORIES]?.let { raw ->
                json.decodeFromString<List<List<String>>>(raw).map { row ->
                    CategorySpend(
                        name       = row[0],
                        emoji      = row[1],
                        amount     = row[2].toDouble(),
                        percentage = row[3].toInt()
                    )
                }
            } ?: emptyList()
        }.getOrDefault(emptyList())

        return WidgetData(
            monthlySpend        = monthlySpend,
            monthlyBudget       = null,
            monthLabel          = monthLabel,
            txnCount            = txnCount,
            pendingCount        = pendingCount,
            isCurrentMonth      = isCurrentMonth,
            recentTransactions  = recentTxns,
            upcomingPayments    = upcomingPayments,
            topCategories       = categories,
            lastUpdated         = lastUpdated,
            isError             = isError,
            totalGastos         = prefs[TOTAL_GASTOS] ?: 0.0,
            totalInversion      = prefs[TOTAL_INVERSION] ?: 0.0,
            totalDeuda          = prefs[TOTAL_DEUDA] ?: 0.0,
            totalAhorro         = prefs[TOTAL_AHORRO] ?: 0.0,
            totalSpent          = prefs[TOTAL_SPENT] ?: 0.0,
            saldoFinal          = prefs[SALDO_FINAL] ?: 0.0
        )
    }
}
