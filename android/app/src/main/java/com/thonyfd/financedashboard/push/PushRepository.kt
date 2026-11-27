package com.thonyfd.financedashboard.push

import android.content.Context
import android.os.Build
import android.util.Log
import com.google.android.gms.tasks.Task
import com.google.firebase.messaging.FirebaseMessaging
import com.thonyfd.financedashboard.data.SupabaseConfig
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

// No default for platform: supabase-kt's Json does not encode defaults.
@Serializable
data class PushKeys(val fcmToken: String, val platform: String)

/** Row in push_subscriptions. The sender reads keys.fcmToken (see scripts/production/lib/push.ts). */
@Serializable
data class PushSubscriptionRow(
    val endpoint: String,
    val keys: PushKeys,
    @SerialName("user_email") val userEmail: String,
    @SerialName("user_agent") val userAgent: String,
    @SerialName("is_active") val isActive: Boolean
)

fun subscriptionRow(token: String, email: String, deviceModel: String): PushSubscriptionRow =
    PushSubscriptionRow(
        endpoint = token,
        keys = PushKeys(fcmToken = token, platform = "android"),
        userEmail = email,
        userAgent = "Android app ($deviceModel)",
        isActive = true
    )

/**
 * Prod push_subscriptions has no UNIQUE on endpoint (only the id primary key, unlike
 * packages/sql/schema.sql), so registration cannot upsert ON CONFLICT: it looks the token
 * up and either inserts a row or reactivates the oldest one with that token.
 */
sealed interface RegistrationPlan {
    data object Insert : RegistrationPlan
    data class Activate(val id: Long) : RegistrationPlan
}

fun registrationPlan(existingIds: List<Long>): RegistrationPlan =
    existingIds.minOrNull()?.let { RegistrationPlan.Activate(it) } ?: RegistrationPlan.Insert

@Serializable
private data class SubscriptionId(val id: Long)

@Serializable
private data class ActiveUpdate(@SerialName("is_active") val isActive: Boolean)

suspend fun <T> Task<T>.awaitResult(): T = suspendCancellableCoroutine { cont ->
    addOnCompleteListener { task ->
        val error = task.exception
        when {
            error != null -> cont.resumeWithException(error)
            task.isCanceled -> cont.cancel()
            else -> cont.resume(task.result)
        }
    }
}

/**
 * This phone's row in push_subscriptions, one per device like the web. Logs never carry
 * the token or the email.
 */
object PushRepository {
    private const val PREFS_NAME = "push"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_DELETE_PENDING = "token_delete_pending"
    private const val TABLE = "push_subscriptions"

    private val supabase get() = SupabaseConfig.client

    // The registration-token API is deprecated since firebase-messaging 25.1 in favour of
    // installation IDs, which need the FCM v2 send API. The sender (firebase-admin) still
    // sends to tokens, so the app keeps the token API (see FinancePushService.onNewToken).
    @Suppress("DEPRECATION")
    private suspend fun currentToken(): String = FirebaseMessaging.getInstance().token.awaitResult()

    suspend fun isEnabledOnThisDevice(): Boolean {
        SupabaseConfig.awaitAuth()
        val token = currentToken()
        return supabase.from(TABLE)
            .select(Columns.list("id")) {
                filter {
                    eq("endpoint", token)
                    eq("is_active", true)
                }
                limit(1)
            }
            .decodeList<SubscriptionId>()
            .isNotEmpty()
    }

    suspend fun enable(context: Context) = register(context, currentToken())

    suspend fun register(context: Context, token: String) {
        SupabaseConfig.awaitAuth()
        val email = supabase.auth.currentUserOrNull()?.email ?: throw IllegalStateException("No session")
        val row = subscriptionRow(token, email, Build.MODEL)
        val existingIds = supabase.from(TABLE)
            .select(Columns.list("id")) { filter { eq("endpoint", token) } }
            .decodeList<SubscriptionId>()
            .map { it.id }
        when (val plan = registrationPlan(existingIds)) {
            RegistrationPlan.Insert -> supabase.from(TABLE).insert(row)
            is RegistrationPlan.Activate -> supabase.from(TABLE).update(row) { filter { eq("id", plan.id) } }
        }
        setFlag(context, true)
        // A delete left pending by an offline sign out must not kill this new registration.
        setDeletePending(context, false)
        Log.i("Push", "Push enabled on this device")
    }

    suspend fun disable(context: Context) {
        SupabaseConfig.awaitAuth()
        val token = currentToken()
        supabase.from(TABLE).update(ActiveUpdate(isActive = false)) {
            filter { eq("endpoint", token) }
        }
        setFlag(context, false)
        Log.i("Push", "Push disabled on this device")
    }

    /**
     * Before sign out from the menu, while the session still exists. Runs whatever the local
     * flag says: the server row may be on even when the flag is off. Never throws.
     */
    suspend fun disableOnSignOut(context: Context) {
        if (!PushSetup.isAvailable) return
        signOutCleanup(
            disableRow = { disable(context) },
            deleteToken = ::deleteToken,
            setDeletePending = { setDeletePending(context, it) }
        )
        setFlag(context, false)
    }

    /** Session lost without the menu (expired or revoked): no session left, so token only. */
    suspend fun cleanupAfterSessionLoss(context: Context) {
        if (!PushSetup.isAvailable) return
        signOutCleanup(disableRow = {}, deleteToken = ::deleteToken, setDeletePending = { setDeletePending(context, it) })
        setFlag(context, false)
    }

    /** App start: finish a token delete that failed at sign out (offline). */
    suspend fun retryPendingTokenDelete(context: Context) {
        if (!PushSetup.isAvailable || !isDeletePending(context)) return
        signOutCleanup(disableRow = {}, deleteToken = ::deleteToken, setDeletePending = { setDeletePending(context, it) })
    }

    @Suppress("DEPRECATION") // same token API as currentToken()
    private suspend fun deleteToken() {
        FirebaseMessaging.getInstance().deleteToken().awaitResult<Void?>()
    }

    fun isFlagOn(context: Context): Boolean =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)

    private fun setFlag(context: Context, value: Boolean) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, value).apply()
    }

    private fun isDeletePending(context: Context): Boolean =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_DELETE_PENDING, false)

    private fun setDeletePending(context: Context, value: Boolean) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putBoolean(KEY_DELETE_PENDING, value).apply()
    }
}
