package com.thonyfd.financedashboard.widget

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class AccountCachesTest {

    @Test
    fun clearAccountCachesResetsEveryStore() = runBlocking {
        val cleared = mutableListOf<String>()
        clearAccountCaches(listOf(
            { cleared += "finance" },
            { cleared += "payments" },
            { cleared += "habits" }
        ))
        assertEquals(listOf("finance", "payments", "habits"), cleared)
    }

    @Test
    fun clearAccountCachesContinuesAfterFailure() = runBlocking {
        val cleared = mutableListOf<String>()
        clearAccountCaches(listOf(
            { cleared += "finance" },
            { throw IllegalStateException("datastore busy") },
            { cleared += "habits" }
        ))
        assertEquals(listOf("finance", "habits"), cleared)
    }
}
