package com.thonyfd.financedashboard.data.auth

import android.content.Context
import android.util.Log
import com.thonyfd.financedashboard.data.SupabaseConfig
import io.github.jan.supabase.auth.auth
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

/** A cached answer only counts for the account that produced it; no user id means offline, use the last one. */
fun cachedOwnerFor(storedUserId: String?, storedValue: Boolean?, userId: String?): Boolean? =
    if (userId == null || userId == storedUserId) storedValue else null

/** Widget caches belong to the last signed-in account; a different account (or none) wipes them. */
fun shouldClearAccountCaches(lastUserId: String?, currentUserId: String?): Boolean =
    lastUserId != null && lastUserId != currentUserId

/** Background writes are kept only if the same account is still signed in after the fetch. */
fun sameAccount(before: String?, after: String?): Boolean = before != null && before == after

fun SupabaseConfig.currentUserId(): String? = client.auth.currentUserOrNull()?.id

suspend fun SupabaseConfig.fetchIsOwner(): Boolean =
    client.postgrest.rpc("is_owner").decodeAs<Boolean>()

/** Last known ownership per account, so widgets and offline starts do not need the network. */
object OwnerCache {
    private const val PREFS = "account"
    private const val KEY = "is_owner"
    private const val USER_KEY = "is_owner_user_id"

    fun get(context: Context, userId: String?): Boolean? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val stored = if (prefs.contains(KEY)) prefs.getBoolean(KEY, false) else null
        return cachedOwnerFor(prefs.getString(USER_KEY, null), stored, userId)
    }

    fun set(context: Context, userId: String, value: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(USER_KEY, userId)
            .putBoolean(KEY, value)
            .apply()
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).remove(USER_KEY).apply()
    }

    suspend fun resolve(context: Context, userId: String): Boolean = resolveIsOwner(
        fetch = {
            runCatching { SupabaseConfig.fetchIsOwner() }
                .onFailure { if (it !is CancellationException) Log.w("OwnerState", "is_owner failed, using cached value", it) }
                .getOrThrow()
        },
        cached = get(context, userId),
        save = { set(context, userId, it) }
    )
}

/** Remembers which account the on-device caches belong to. */
object AccountTracker {
    private const val PREFS = "account"
    private const val KEY = "last_user_id"

    fun get(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)

    fun set(context: Context, userId: String?) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, userId).apply()
    }
}
