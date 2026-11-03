package com.thonyfd.financedashboard.widget

import android.content.Context
import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.auth.OwnerCache
import kotlin.coroutines.cancellation.CancellationException

/** Runs every clearer even when one fails, so one busy store never leaks the previous account's data. */
suspend fun clearAccountCaches(clearers: List<suspend () -> Unit>) {
    clearers.forEach { clear ->
        try {
            clear()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // Keep going: the remaining stores must still be wiped
        }
    }
}

/** Wipes every widget store and the cached ownership, then redraws the widgets. Called on sign-out. */
suspend fun clearAllAccountCaches(context: Context) {
    clearAccountCaches(listOf(
        { FinanceWidgetStateStore.clear(context) },
        { PaymentsWidgetStateStore.clear(context) },
        { HabitsWidgetStateStore.clear(context) },
        { OwnerCache.clear(context) }
    ))
    runCatching { WidgetAppearancePreferences.refreshAll(context) }
}

/** Loads the new account's data into the widgets right after sign-in. */
suspend fun refreshWidgetsForAccount(context: Context) {
    runCatching { HabitsWidgetRefresher.refresh(context) }
    runCatching { WidgetAppearancePreferences.refreshAll(context) }
}

/**
 * Finance widgets render only for the owner. The cached answer is preferred so a
 * widget redraw does not hit the network; it is resolved online only when unknown.
 */
suspend fun widgetIsOwner(context: Context): Boolean =
    OwnerCache.get(context) ?: run {
        SupabaseConfig.awaitAuth()
        OwnerCache.resolve(context)
    }
