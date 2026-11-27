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
