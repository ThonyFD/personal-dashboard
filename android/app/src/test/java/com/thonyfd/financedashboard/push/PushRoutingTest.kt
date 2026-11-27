package com.thonyfd.financedashboard.push

import com.thonyfd.financedashboard.ui.AppTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.runBlocking
import org.junit.Test

class PushRoutingTest {

    @Test
    fun paymentReminderGoesToPaymentsChannel() {
        assertEquals(CHANNEL_PAYMENTS, channelForTag("payment-reminder"))
    }

    @Test
    fun budgetAlertGoesToBudgetChannel() {
        assertEquals(CHANNEL_BUDGET, channelForTag("budget-alert-42"))
    }

    @Test
    fun unknownOrMissingTagFallsBackToBudget() {
        assertEquals(CHANNEL_BUDGET, channelForTag(null))
        assertEquals(CHANNEL_BUDGET, channelForTag("other"))
    }

    @Test
    fun paymentReminderOpensControl() {
        assertEquals(AppTab.Control.ordinal, tabForPushTag("payment-reminder"))
    }

    @Test
    fun budgetAlertOpensInicio() {
        assertEquals(AppTab.Inicio.ordinal, tabForPushTag("budget-alert-42"))
    }

    @Test
    fun unknownTagOpensNoTab() {
        assertNull(tabForPushTag(null))
        assertNull(tabForPushTag(""))
        assertNull(tabForPushTag("budget"))
    }

    @Test
    fun firebaseNeedsAllFourValues() {
        assertTrue(isFirebaseConfigured("1:2:android:3", "key", "720071149950", "proj"))
        assertFalse(isFirebaseConfigured("", "key", "720071149950", "proj"))
        assertFalse(isFirebaseConfigured("1:2:android:3", " ", "720071149950", "proj"))
        assertFalse(isFirebaseConfigured("1:2:android:3", "key", "", "proj"))
        assertFalse(isFirebaseConfigured("1:2:android:3", "key", "720071149950", ""))
    }

    @Test
    fun permissionOnlyAskedOn13AndUpWhenMissing() {
        assertTrue(needsNotificationPermission(33, granted = false))
        assertFalse(needsNotificationPermission(33, granted = true))
        assertFalse(needsNotificationPermission(32, granted = false))
    }

    @Test
    fun tokenRefreshSkippedWhenFlagOff() = runBlocking {
        var called = false
        assertFalse(refreshTokenIfEnabled(flagOn = false, token = "t") { called = true })
        assertFalse(called)
    }

    @Test
    fun tokenRefreshFailureDoesNotEscape() = runBlocking {
        assertFalse(refreshTokenIfEnabled(flagOn = true, token = "t") { throw IllegalStateException("No session") })
    }

    @Test
    fun tokenRefreshRegistersWhenFlagOn() = runBlocking {
        var got: String? = null
        assertTrue(refreshTokenIfEnabled(flagOn = true, token = "t") { got = it })
        assertEquals("t", got)
    }

    @Test
    fun explicitTabExtraWinsOverPushTag() {
        assertEquals(3, openTabFromIntent(3, "payment-reminder"))
    }

    @Test
    fun pushTagUsedWhenNoTabExtra() {
        assertEquals(AppTab.Control.ordinal, openTabFromIntent(null, "payment-reminder"))
    }

    @Test
    fun nothingWhenNeither() {
        assertNull(openTabFromIntent(null, null))
    }

    @Test
    fun errorSummaryKeepsClassAndFirstLineOnly() {
        val error = IllegalStateException("new row violates row-level security policy\nURL: https://x\nHeaders: [Authorization=Bearer secret]")
        assertEquals("IllegalStateException: new row violates row-level security policy", pushErrorSummary(error))
    }

    @Test
    fun errorSummaryTruncatesLongMessages() {
        assertEquals("IllegalStateException: " + "a".repeat(160), pushErrorSummary(IllegalStateException("a".repeat(500))))
    }

    @Test
    fun errorSummaryWithoutMessage() {
        assertEquals("IllegalStateException", pushErrorSummary(IllegalStateException()))
    }

    @Test
    fun errorSummaryRedactsUrlsThatCarryTheToken() {
        val error = IllegalStateException("HTTP request to https://x.supabase.co/rest/v1/push_subscriptions?endpoint=eq.secret-token (GET) failed with message: timeout")
        assertEquals("IllegalStateException: HTTP request to <url> (GET) failed with message: timeout", pushErrorSummary(error))
    }

    // Sign out must stop pushes even offline: deleting the FCM token needs no session,
    // and the sender turns the row off once FCM rejects the dead token.
    @Test
    fun signOutDeletesTokenEvenWhenTheRowUpdateFails() = runBlocking {
        var deleted = false
        var pending: Boolean? = null
        signOutCleanup(
            disableRow = { throw IllegalStateException("offline") },
            deleteToken = { deleted = true },
            setDeletePending = { pending = it }
        )
        assertTrue(deleted)
        assertEquals(false, pending)
    }

    @Test
    fun failedTokenDeleteStaysPendingForRetry() = runBlocking {
        var pending: Boolean? = null
        signOutCleanup(
            disableRow = {},
            deleteToken = { throw IllegalStateException("offline") },
            setDeletePending = { pending = it }
        )
        assertEquals(true, pending)
    }

    @Test
    fun hangingCallsDoNotBlockSignOut() = runBlocking {
        var pending: Boolean? = null
        val started = System.currentTimeMillis()
        signOutCleanup(
            disableRow = { awaitCancellation() },
            deleteToken = { awaitCancellation() },
            setDeletePending = { pending = it },
            timeoutMs = 50
        )
        assertTrue(System.currentTimeMillis() - started < 2_000)
        assertEquals(true, pending)
    }
}
