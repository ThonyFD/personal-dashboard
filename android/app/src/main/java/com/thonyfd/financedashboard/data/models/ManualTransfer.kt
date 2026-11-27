package com.thonyfd.financedashboard.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneId

// Transfers the owner types in by hand: bank-app transfers that send no email, so
// the Gmail sync never sees them. Same shape as the web form
// (packages/supabase-queries/src/manual-transfers.ts): a TRANSFER row in
// transactions with no email and provider 'manual'. The budget alerts skip them.

const val MANUAL_PROVIDER = "manual"

private val PANAMA: ZoneId = ZoneId.of("America/Panama")

@Serializable
data class MerchantOption(
    val id: Long,
    val name: String
)

@Serializable
data class ManualTransferInsert(
    @SerialName("email_id") val emailId: Long?,
    @SerialName("merchant_id") val merchantId: Long,
    @SerialName("merchant_name") val merchantName: String,
    @SerialName("merchant_raw") val merchantRaw: String,
    @SerialName("txn_type") val txnType: String,
    val channel: String,
    val amount: Double,
    val currency: String,
    @SerialName("txn_date") val txnDate: String,
    val provider: String,
    val description: String?,
    @SerialName("idempotency_key") val idempotencyKey: String
)

/** Positive amount rounded to cents, or null. Accepts "25.50" and "25,50". */
fun parseManualAmount(text: String): Double? {
    val normalized = text.trim().let { if (it.contains('.')) it else it.replace(',', '.') }
    val value = normalized.toBigDecimalOrNull() ?: return null
    if (value <= BigDecimal.ZERO) return null
    return value.setScale(2, RoundingMode.HALF_UP).toDouble()
}

/** `key` is generated once per dialog, so a double tap saves a single row. */
fun manualTransferInsert(
    merchant: MerchantOption,
    amount: Double,
    txnDate: LocalDate,
    note: String,
    key: String
): ManualTransferInsert {
    val name = merchant.name.trim()
    return ManualTransferInsert(
        emailId = null,
        merchantId = merchant.id,
        merchantName = name,
        merchantRaw = name,
        txnType = "TRANSFER",
        channel = "BANK_TRANSFER",
        amount = amount,
        currency = "USD",
        txnDate = txnDate.toString(),
        provider = MANUAL_PROVIDER,
        description = note.trim().ifEmpty { null },
        idempotencyKey = "$MANUAL_PROVIDER:$key"
    )
}

fun isManualProvider(provider: String?): Boolean = provider == MANUAL_PROVIDER

/** Merchants whose name contains the query, in the list's order (most used first). */
fun matchMerchants(all: List<MerchantOption>, query: String, limit: Int = 6): List<MerchantOption> {
    val q = query.trim()
    val hits = if (q.isEmpty()) all else all.filter { it.name.contains(q, ignoreCase = true) }
    return hits.take(limit)
}

fun todayInPanama(clock: Clock = Clock.systemUTC()): LocalDate = LocalDate.now(clock.withZone(PANAMA))
