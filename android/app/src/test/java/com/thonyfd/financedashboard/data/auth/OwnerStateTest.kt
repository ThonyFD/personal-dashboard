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
