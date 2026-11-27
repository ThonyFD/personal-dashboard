package com.thonyfd.financedashboard.push

import com.thonyfd.financedashboard.ui.AppTab

// Channel ids and tags shared with scripts/production/lib/push.ts. Changing one
// here means changing it in the sender too.
const val CHANNEL_BUDGET = "budget_alerts"
const val CHANNEL_PAYMENTS = "payment_reminders"
const val TAG_PAYMENT_REMINDER = "payment-reminder"
const val TAG_BUDGET_PREFIX = "budget-alert-"

/** Channel for a push that arrived without one. Unknown tags land in the default channel. */
fun channelForTag(tag: String?): String =
    if (tag == TAG_PAYMENT_REMINDER) CHANNEL_PAYMENTS else CHANNEL_BUDGET

/** Tab index a tap on the push opens, or null to keep the app's normal start tab. */
fun tabForPushTag(tag: String?): Int? = when {
    tag == TAG_PAYMENT_REMINDER -> AppTab.Control.ordinal
    tag != null && tag.startsWith(TAG_BUDGET_PREFIX) -> AppTab.Inicio.ordinal
    else -> null
}

/** Push needs every Firebase value; a fresh worktree without them still builds and runs. */
fun isFirebaseConfigured(appId: String, apiKey: String, senderId: String, projectId: String): Boolean =
    listOf(appId, apiKey, senderId, projectId).none { it.isBlank() }

/** POST_NOTIFICATIONS is a runtime permission from Android 13 (API 33). */
fun needsNotificationPermission(sdkInt: Int, granted: Boolean): Boolean = sdkInt >= 33 && !granted

/**
 * FCM rotated this phone's token. Re-register only if the owner turned push on here.
 * Never throws: when signed out or offline it returns false and the flag stays on, so
 * turning the switch on again from the menu fixes the row.
 */
suspend fun refreshTokenIfEnabled(flagOn: Boolean, token: String, register: suspend (String) -> Unit): Boolean {
    if (!flagOn) return false
    return runCatching { register(token) }.isSuccess
}

/** A widget deep link (explicit tab) wins; otherwise the tag of the push that was tapped. */
fun openTabFromIntent(openTabExtra: Int?, pushTag: String?): Int? = openTabExtra ?: tabForPushTag(pushTag)

private val URL_PATTERN = Regex("""https?://\S+""")

/**
 * Safe one-line description of a push failure for Log. supabase-kt puts the URL and the
 * request headers (with the bearer token) after the first line, so only that line is kept.
 * Network errors name the URL in that line, and its filter holds the FCM token
 * (endpoint=eq.<token>), so URLs are replaced too.
 */
fun pushErrorSummary(error: Throwable): String {
    val name = error.javaClass.simpleName
    val firstLine = error.message?.lineSequence()?.firstOrNull()?.trim()
        ?.replace(URL_PATTERN, "<url>")?.take(160)
    return if (firstLine.isNullOrEmpty()) name else "$name: $firstLine"
}
