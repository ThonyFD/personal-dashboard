package com.thonyfd.financedashboard.data.repository

import org.junit.Assert.assertEquals
import org.junit.Test

class PendingFirstTest {

    @Test
    fun movesCompletedToBottomKeepingRelativeOrder() {
        val items = listOf("a" to true, "b" to false, "c" to true, "d" to false)
        assertEquals(listOf("b", "d", "a", "c"), items.pendingFirst { it.second }.map { it.first })
    }

    @Test
    fun keepsOrderWhenNothingCompleted() {
        val items = listOf("a", "b", "c")
        assertEquals(items, items.pendingFirst { false })
    }
}
