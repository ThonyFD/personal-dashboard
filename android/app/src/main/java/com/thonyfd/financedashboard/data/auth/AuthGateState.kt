package com.thonyfd.financedashboard.data.auth

import io.github.jan.supabase.auth.status.SessionStatus

enum class AuthGateState { Loading, LoggedIn, LoggedOut }

// RefreshFailure keeps the saved session and retries in the background (e.g. offline cold start),
// so it counts as logged in instead of bouncing the user to the login screen.
fun SessionStatus.toGateState(): AuthGateState = when (this) {
    is SessionStatus.Initializing -> AuthGateState.Loading
    is SessionStatus.Authenticated -> AuthGateState.LoggedIn
    is SessionStatus.RefreshFailure -> AuthGateState.LoggedIn
    is SessionStatus.NotAuthenticated -> AuthGateState.LoggedOut
}
