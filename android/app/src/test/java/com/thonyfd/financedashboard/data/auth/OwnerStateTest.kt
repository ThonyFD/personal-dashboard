package com.thonyfd.financedashboard.data.auth

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class OwnerStateTest {

    @Test
    fun ownerStateUsesFetchedValueAndSavesIt() = runBlocking {
        var saved: Boolean? = null
        val result = resolveIsOwner(fetch = { true }, cached = false, save = { saved = it })
        assertTrue(result)
        assertEquals(true, saved)
    }

    @Test
    fun ownerStateFallsBackToCachedValueWhenFetchFails() = runBlocking {
        val result = resolveIsOwner(fetch = { throw IOException("offline") }, cached = true, save = {})
        assertTrue(result)
    }

    @Test
    fun ownerStateDefaultsToFalseWithNoCache() = runBlocking {
        val result = resolveIsOwner(fetch = { throw IOException("offline") }, cached = null, save = {})
        assertFalse(result)
    }
}

class AccountSwitchTest {

    @Test
    fun ownerCacheIgnoresValueFromAnotherAccount() {
        assertEquals(null, cachedOwnerFor(storedUserId = "owner", storedValue = true, userId = "daughter"))
        assertEquals(true, cachedOwnerFor(storedUserId = "owner", storedValue = true, userId = "owner"))
        // No user id (offline refresh failure): last known value
        assertEquals(true, cachedOwnerFor(storedUserId = "owner", storedValue = true, userId = null))
    }

    @Test
    fun accountChangeClearsCaches() {
        assertTrue(shouldClearAccountCaches(lastUserId = "owner", currentUserId = "daughter"))
        assertTrue(shouldClearAccountCaches(lastUserId = "owner", currentUserId = null))
        assertFalse(shouldClearAccountCaches(lastUserId = "owner", currentUserId = "owner"))
        assertFalse(shouldClearAccountCaches(lastUserId = null, currentUserId = "daughter"))
    }

    @Test
    fun widgetWriteDroppedWhenAccountChangedMidFetch() {
        assertTrue(sameAccount(before = "owner", after = "owner"))
        assertFalse(sameAccount(before = "owner", after = "daughter"))
        assertFalse(sameAccount(before = "owner", after = null))
        assertFalse(sameAccount(before = null, after = null))
    }
}
