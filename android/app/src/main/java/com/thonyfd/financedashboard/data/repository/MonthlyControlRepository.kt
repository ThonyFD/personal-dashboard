package com.thonyfd.financedashboard.data.repository

import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.models.FullManualTransactionRow
import com.thonyfd.financedashboard.data.models.IsPaidUpdate
import com.thonyfd.financedashboard.data.models.ManualTransactionInsert
import com.thonyfd.financedashboard.data.models.MonthlyIncomeInsert
import com.thonyfd.financedashboard.data.models.MonthlyIncomeRow
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order

class MonthlyControlRepository {

    private val supabase = SupabaseConfig.client

    // ---- Transactions ----

    suspend fun fetchTransactions(year: Int, month: Int): List<FullManualTransactionRow> =
        supabase.from("manual_transactions")
            .select {
                filter {
                    eq("year", year)
                    eq("month", month)
                }
                order("day", Order.ASCENDING)
                order("description", Order.ASCENDING)
            }
            .decodeList<FullManualTransactionRow>()

    suspend fun addTransaction(txn: ManualTransactionInsert) {
        supabase.from("manual_transactions").insert(txn)
    }

    suspend fun updateTransaction(id: Long, txn: ManualTransactionInsert) {
        supabase.from("manual_transactions")
            .update(txn) { filter { eq("id", id) } }
    }

    suspend fun deleteTransaction(id: Long) {
        supabase.from("manual_transactions")
            .delete { filter { eq("id", id) } }
    }

    suspend fun togglePaid(id: Long, newValue: Boolean) {
        supabase.from("manual_transactions")
            .update(IsPaidUpdate(isPaid = newValue)) { filter { eq("id", id) } }
    }

    suspend fun copyFromPreviousMonth(
        fromYear: Int, fromMonth: Int,
        toYear: Int, toMonth: Int
    ): Int {
        val prev = fetchTransactions(fromYear, fromMonth)
        prev.forEach { row ->
            supabase.from("manual_transactions").insert(
                ManualTransactionInsert(
                    year = toYear, month = toMonth,
                    day = row.day,
                    description = row.description,
                    amount = row.amount,
                    transactionType = row.transactionType,
                    paymentMethod = row.paymentMethod,
                    isPaid = false,
                    notes = row.notes
                )
            )
        }
        return prev.size
    }

    // ---- Incomes ----

    suspend fun fetchIncomes(year: Int, month: Int): List<MonthlyIncomeRow> =
        supabase.from("monthly_incomes")
            .select {
                filter {
                    eq("year", year)
                    eq("month", month)
                }
                order("source", Order.ASCENDING)
            }
            .decodeList<MonthlyIncomeRow>()

    suspend fun addIncome(income: MonthlyIncomeInsert) {
        supabase.from("monthly_incomes").insert(income)
    }

    suspend fun deleteIncome(id: Long) {
        supabase.from("monthly_incomes")
            .delete { filter { eq("id", id) } }
    }
}
