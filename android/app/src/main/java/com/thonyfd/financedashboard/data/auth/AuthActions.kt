package com.thonyfd.financedashboard.data.auth

import java.io.IOException

const val NETWORK_ERROR_MESSAGE = "Sin conexión, intenta de nuevo"
const val GENERIC_ERROR_MESSAGE = "No se pudo iniciar sesión"

/**
 * compose-auth 3.1.4 reports every failure (including no network) as NativeSignInResult.Error,
 * so connectivity is inferred from the device state and the cause chain.
 * Supabase's HttpRequestException extends IOException, so it is covered too.
 */
fun signInErrorMessage(error: Throwable?, isOnline: Boolean): String {
    val networkCause = generateSequence(error) { it.cause }.any { it is IOException }
    return if (!isOnline || networkCause) NETWORK_ERROR_MESSAGE else GENERIC_ERROR_MESSAGE
}

/** Auth.signOut() throws before clearing the local session when offline; clear it anyway. */
suspend fun signOutWithFallback(signOut: suspend () -> Unit, clearSession: suspend () -> Unit) {
    runCatching { signOut() }.onFailure { runCatching { clearSession() } }
}
