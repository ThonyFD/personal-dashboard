package com.thonyfd.financedashboard.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ---- Supabase rows (read) ----

@Serializable
data class MonthlyIncomeRow(
    val id: Long,
    val year: Int,
    val month: Int,
    val source: String,
    val amount: Double,
    val notes: String? = null
)

// ManualTransactionRow is in Models.kt (already used by widget)
// Adding categoryId field it was missing:
@Serializable
data class FullManualTransactionRow(
    val id: Long,
    val year: Int,
    val month: Int,
    val day: Int? = null,
    val description: String,
    val amount: Double,
    @SerialName("transaction_type") val transactionType: String? = null,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("is_paid") val isPaid: Boolean,
    val notes: String? = null,
    @SerialName("category_id") val categoryId: Int? = null
)

// ---- Insert / Update payloads ----

@Serializable
data class MonthlyIncomeInsert(
    val year: Int,
    val month: Int,
    val source: String,
    val amount: Double,
    val notes: String? = null
)

@Serializable
data class ManualTransactionInsert(
    val year: Int,
    val month: Int,
    val day: Int? = null,
    val description: String,
    val amount: Double,
    @SerialName("transaction_type") val transactionType: String? = null,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("is_paid") val isPaid: Boolean = false,
    val notes: String? = null
)

@Serializable
data class IsPaidUpdate(@SerialName("is_paid") val isPaid: Boolean)

// ---- UI State ----

data class MonthlyControlState(
    val year: Int,
    val month: Int,
    val incomes: List<MonthlyIncomeRow> = emptyList(),
    val transactions: List<FullManualTransactionRow> = emptyList(),
    val previousBalance: Double = 0.0,
    val isLoading: Boolean = true,
    val error: String? = null
) {
    val totalIncome: Double get() = incomes.sumOf { it.amount }
    val available: Double get() = totalIncome + previousBalance
    val totalGastos: Double get() = transactions.filter { it.transactionType == null }.sumOf { it.amount }
    val totalInversion: Double get() = transactions.filter { it.transactionType == "Inversión" }.sumOf { it.amount }
    val totalDeuda: Double get() = transactions.filter { it.transactionType == "Deuda" }.sumOf { it.amount }
    val totalAhorro: Double get() = transactions.filter { it.transactionType == "Ahorro" }.sumOf { it.amount }
    val totalSpent: Double get() = totalGastos + totalInversion + totalDeuda + totalAhorro
    val saldoFinal: Double get() = available - totalSpent
    val pendingCount: Int get() = transactions.count { !it.isPaid }
    val paidCount: Int get() = transactions.count { it.isPaid }
}

val PAYMENT_METHODS = listOf("BG", "TDC(BANISTMO)", "TDC(BAC)", "YAPPY", "CASH")
val TRANSACTION_TYPES = listOf("", "Inversión", "Deuda", "Ahorro")
val TRANSACTION_TYPE_LABELS = mapOf(
    "" to "Gasto Normal",
    "Inversión" to "Inversión",
    "Deuda" to "Deuda",
    "Ahorro" to "Ahorro"
)
