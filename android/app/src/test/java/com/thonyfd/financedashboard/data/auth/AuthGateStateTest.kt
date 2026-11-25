package com.thonyfd.financedashboard.data.auth

import io.github.jan.supabase.auth.status.RefreshFailureCause
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserSession
import org.junit.Assert.assertEquals
import org.junit.Test

class AuthGateStateTest {

    private val session = UserSession(
        accessToken = "a",
        refreshToken = "r",
        expiresIn = 3600,
        tokenType = "bearer",
        user = null
    )

    @Test
    fun mapsInitializingToLoading() {
        assertEquals(AuthGateState.Loading, SessionStatus.Initializing.toGateState())
    }

    @Test
    fun mapsAuthenticatedToLoggedIn() {
        assertEquals(AuthGateState.LoggedIn, SessionStatus.Authenticated(session).toGateState())
    }

    @Test
    fun mapsNotAuthenticatedToLoggedOut() {
        assertEquals(AuthGateState.LoggedOut, SessionStatus.NotAuthenticated(isSignOut = false).toGateState())
    }

    @Test
    fun mapsSignOutToLoggedOut() {
        assertEquals(AuthGateState.LoggedOut, SessionStatus.NotAuthenticated(isSignOut = true).toGateState())
    }

    // Offline cold start: the saved session is kept and refresh is retried, so the app stays usable.
    @Test
    fun mapsRefreshFailureToLoggedIn() {
        val status = SessionStatus.RefreshFailure(RefreshFailureCause.NetworkError(RuntimeException("offline")))
        assertEquals(AuthGateState.LoggedIn, status.toGateState())
    }
}
