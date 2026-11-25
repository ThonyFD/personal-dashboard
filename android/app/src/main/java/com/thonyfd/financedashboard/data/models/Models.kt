package com.thonyfd.financedashboard.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Maps to v_transactions view (flat columns — no nested join needed)
@Serializable
data class Transaction(
    val id: Long,
    @SerialName("txn_type") val txnType: String,
    val amount: Double,
    val currency: String? = "USD",
    @SerialName("merchant_name") val merchantName: String?,
    @SerialName("txn_date") val txnDate: String,
    val provider: String,
    @SerialName("card_last4") val cardLast4: String? = null,
    val description: String? = null,
    @SerialName("category_name") val categoryName: String? = null,
    @SerialName("category_icon") val categoryIcon: String? = null,
)

data class UpcomingPayment(
    val description: String,
    val amount: Double,
    val day: Int?,                  // día del mes (null = sin fecha específica)
    val daysUntil: Int,             // negativo = vencido, 0 = hoy
    val paymentMethod: String?,     // BG, TDC(BANISTMO), TDC(BAC), YAPPY, CASH
    val transactionType: String?    // Inversión, Deuda, Ahorro, null = Gasto normal
)

@Serializable
data class ManualTransactionRow(
    val id: Long,
    val year: Int,
    val month: Int,
    val day: Int? = null,
    val description: String,
    val amount: Double,
    @SerialName("transaction_type") val transactionType: String? = null,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("is_paid") val isPaid: Boolean
)

data class CategorySpend(
    val name: String,
    val emoji: String,
    val amount: Double,
    val percentage: Int
)

data class WidgetData(
    val monthlySpend: Double,
    val monthlyBudget: Double?,
    val monthLabel: String,
    val txnCount: Int,
    val pendingCount: Int,
    val isCurrentMonth: Boolean,
    val recentTransactions: List<Transaction>,
    val upcomingPayments: List<UpcomingPayment>,
    val topCategories: List<CategorySpend>,
    val lastUpdated: String,
    val isError: Boolean = false,
    val errorMessage: String? = null,
    val totalGastos: Double = 0.0,
    val totalInversion: Double = 0.0,
    val totalDeuda: Double = 0.0,
    val totalAhorro: Double = 0.0,
    val totalSpent: Double = 0.0,
    val saldoFinal: Double = 0.0
)
