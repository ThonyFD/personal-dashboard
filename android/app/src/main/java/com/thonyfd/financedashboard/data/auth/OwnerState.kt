package com.thonyfd.financedashboard.data.auth

import android.content.Context
import android.util.Log
import com.thonyfd.financedashboard.data.SupabaseConfig
import io.github.jan.supabase.postgrest.postgrest
import kotlin.coroutines.cancellation.CancellationException

/**
 * Ownership decides which tabs and widgets an account gets. When the RPC fails
 * (offline cold start) the last known value is used so the owner keeps finance.
 */
suspend fun resolveIsOwner(
    fetch: suspend () -> Boolean,
    cached: Boolean?,
    save: suspend (Boolean) -> Unit
): Boolean = try {
    fetch().also { save(it) }
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    cached ?: false
}

suspend fun SupabaseConfig.fetchIsOwner(): Boolean =
    client.postgrest.rpc("is_owner").decodeAs<Boolean>()

/** Last known ownership, so widgets and offline starts do not need the network. */
object OwnerCache {
    private const val PREFS = "account"
    private const val KEY = "is_owner"

    fun get(context: Context): Boolean? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return if (prefs.contains(KEY)) prefs.getBoolean(KEY, false) else null
    }

    fun set(context: Context, value: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY, value).apply()
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply()
    }

    suspend fun resolve(context: Context): Boolean = resolveIsOwner(
        fetch = {
            runCatching { SupabaseConfig.fetchIsOwner() }
                .onFailure { if (it !is CancellationException) Log.w("OwnerState", "is_owner failed, using cached value", it) }
                .getOrThrow()
        },
        cached = get(context),
        save = { set(context, it) }
    )
}
