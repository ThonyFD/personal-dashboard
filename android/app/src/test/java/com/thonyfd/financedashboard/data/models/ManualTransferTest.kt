package com.thonyfd.financedashboard.data.models

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

class ManualTransferTest {

    @Test
    fun `amount accepts a dot or a comma as decimal separator`() {
        assertEquals(25.0, parseManualAmount("25")!!, 0.0)
        assertEquals(25.5, parseManualAmount(" 25.50 ")!!, 0.0)
        assertEquals(25.5, parseManualAmount("25,50")!!, 0.0)
    }

    @Test
    fun `amount rounds to cents`() {
        assertEquals(10.01, parseManualAmount("10.005")!!, 0.0)
    }

    @Test
    fun `amount is null when empty, zero, negative or not a number`() {
        assertNull(parseManualAmount(""))
        assertNull(parseManualAmount("0"))
        assertNull(parseManualAmount("-5"))
        assertNull(parseManualAmount("abc"))
        assertNull(parseManualAmount("1,234.50"))
    }

    @Test
    fun `insert row is a bank transfer without email, marked as manual`() {
        val row = manualTransferInsert(
            merchant = MerchantOption(id = 42, name = "KG"),
            amount = 25.0,
            txnDate = LocalDate.of(2026, 11, 25),
            note = "  almuerzo  ",
            key = "abc-123"
        )
        assertEquals(null, row.emailId)
        assertEquals(42L, row.merchantId)
        assertEquals("KG", row.merchantName)
        assertEquals("KG", row.merchantRaw)
        assertEquals("TRANSFER", row.txnType)
        assertEquals("BANK_TRANSFER", row.channel)
        assertEquals(25.0, row.amount, 0.0)
        assertEquals("USD", row.currency)
        assertEquals("2026-11-25", row.txnDate)
        assertEquals(MANUAL_PROVIDER, row.provider)
        assertEquals("almuerzo", row.description)
        assertEquals("manual:abc-123", row.idempotencyKey)
    }

    @Test
    fun `blank note is stored as null`() {
        val row = manualTransferInsert(MerchantOption(1, "X"), 1.0, LocalDate.of(2026, 1, 1), "   ", "k")
        assertNull(row.description)
    }

    @Test
    fun `manual provider is recognised`() {
        assertTrue(isManualProvider("manual"))
        assertFalse(isManualProvider("yappy"))
        assertFalse(isManualProvider(null))
    }

    @Test
    fun `merchant search keeps list order, ignores case and caps results`() {
        val all = listOf(MerchantOption(1, "Super 99"), MerchantOption(2, "KG"), MerchantOption(3, "Kiosko"))
        assertEquals(listOf(2L, 3L), matchMerchants(all, "k").map { it.id })
        assertEquals(listOf(2L), matchMerchants(all, "k", limit = 1).map { it.id })
        assertEquals(all.take(2), matchMerchants(all, "  ", limit = 2))
    }

    @Test
    fun `today is computed in Panama, not in UTC`() {
        // 2026-11-26 03:00 UTC is still 2026-11-25 22:00 in Panama (UTC-5).
        val clock = Clock.fixed(Instant.parse("2026-11-26T03:00:00Z"), ZoneOffset.UTC)
        assertEquals(LocalDate.of(2026, 11, 25), todayInPanama(clock))
    }
}
