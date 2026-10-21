package com.thonyfd.financedashboard.widget

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.thonyfd.financedashboard.data.models.CategorySpend
import com.thonyfd.financedashboard.data.models.UpcomingPayment
import com.thonyfd.financedashboard.data.models.WidgetData
import kotlinx.coroutines.flow.first
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.paymentsWidgetDataStore by preferencesDataStore(name = "payments_widget_state")

data class PaymentsWidgetData(
    val lastUpdated: String = "--:--",
    val isError: Boolean = false,
    val upcomingPayments: List<UpcomingPayment> = emptyList(),
    val topCategories: List<CategorySpend> = emptyList(),
    val totalGastos: Double = 0.0,
    val totalInversion: Double = 0.0,
    val totalDeuda: Double = 0.0,
    val totalAhorro: Double = 0.0,
    val totalSpent: Double = 0.0,
    val saldoFinal: Double = 0.0
)

object PaymentsWidgetStateStore {

    private val LAST_UPDATED    = stringPreferencesKey("last_updated")
    private val UPCOMING        = stringPreferencesKey("upcoming")
    private val CATEGORIES      = stringPreferencesKey("categories")
    private val IS_ERROR        = stringPreferencesKey("is_error")
    private val TOTAL_GASTOS    = doublePreferencesKey("total_gastos")
    private val TOTAL_INVERSION = doublePreferencesKey("total_inversion")
    private val TOTAL_DEUDA     = doublePreferencesKey("total_deuda")
    private val TOTAL_AHORRO    = doublePreferencesKey("total_ahorro")
    private val TOTAL_SPENT     = doublePreferencesKey("total_spent")
    private val SALDO_FINAL     = doublePreferencesKey("saldo_final")

    private val json = Json { ignoreUnknownKeys = true }

    // ------------------------------------------------------------------
    // Save from WidgetData (shared API response model)
    // ------------------------------------------------------------------
    suspend fun saveWidgetData(context: Context, data: WidgetData) {
        context.paymentsWidgetDataStore.edit { prefs ->
            prefs[LAST_UPDATED]    = data.lastUpdated
            prefs[IS_ERROR]        = "false"
            prefs[TOTAL_GASTOS]    = data.totalGastos
            prefs[TOTAL_INVERSION] = data.totalInversion
            prefs[TOTAL_DEUDA]     = data.totalDeuda
            prefs[TOTAL_AHORRO]    = data.totalAhorro
            prefs[TOTAL_SPENT]     = data.totalSpent
            prefs[SALDO_FINAL]     = data.saldoFinal
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

    // ------------------------------------------------------------------
    // Load
    // ------------------------------------------------------------------
    suspend fun loadWidgetData(context: Context): PaymentsWidgetData {
        val prefs: Preferences = context.paymentsWidgetDataStore.data.first()

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

        return PaymentsWidgetData(
            lastUpdated    = prefs[LAST_UPDATED] ?: "--:--",
            isError        = prefs[IS_ERROR] == "true",
            upcomingPayments = upcomingPayments,
            topCategories  = categories,
            totalGastos    = prefs[TOTAL_GASTOS] ?: 0.0,
            totalInversion = prefs[TOTAL_INVERSION] ?: 0.0,
            totalDeuda     = prefs[TOTAL_DEUDA] ?: 0.0,
            totalAhorro    = prefs[TOTAL_AHORRO] ?: 0.0,
            totalSpent     = prefs[TOTAL_SPENT] ?: 0.0,
            saldoFinal     = prefs[SALDO_FINAL] ?: 0.0
        )
    }

    suspend fun invalidateCache(context: Context) {
        context.paymentsWidgetDataStore.edit { prefs ->
            prefs[LAST_UPDATED] = "--:--"
        }
    }
}
