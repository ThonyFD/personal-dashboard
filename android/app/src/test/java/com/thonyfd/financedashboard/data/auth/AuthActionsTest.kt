package com.thonyfd.financedashboard.data.auth

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class AuthActionsTest {

    @Test
    fun offlineErrorShowsNetworkMessage() {
        assertEquals(NETWORK_ERROR_MESSAGE, signInErrorMessage(RuntimeException("boom"), isOnline = false))
    }

    @Test
    fun ioExceptionInCauseChainShowsNetworkMessage() {
        val error = IllegalStateException("wrapped", IOException("Unable to resolve host"))
        assertEquals(NETWORK_ERROR_MESSAGE, signInErrorMessage(error, isOnline = true))
    }

    @Test
    fun otherErrorShowsGenericMessage() {
        assertEquals(GENERIC_ERROR_MESSAGE, signInErrorMessage(IllegalStateException("bad token"), isOnline = true))
    }

    @Test
    fun signOutFallsBackToLocalClearWhenServerCallFails() = runBlocking {
        var cleared = false
        signOutWithFallback(
            signOut = { throw IOException("offline") },
            clearSession = { cleared = true }
        )
        assertTrue(cleared)
    }
}
