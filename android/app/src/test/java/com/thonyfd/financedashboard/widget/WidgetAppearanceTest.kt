package com.thonyfd.financedashboard.widget

import org.junit.Assert.assertEquals
import org.junit.Test

class WidgetAppearanceTest {

    @Test
    fun nonOwnerOnlySeesHabits() {
        assertEquals(listOf(WidgetKind.HABITS), visibleWidgetKinds(isOwner = false))
    }

    @Test
    fun ownerSeesAllKindsInOrder() {
        assertEquals(
            listOf(WidgetKind.FINANCE, WidgetKind.PAYMENTS, WidgetKind.HABITS),
            visibleWidgetKinds(isOwner = true)
        )
    }

    @Test
    fun preferenceKeysAreDistinctAcrossKinds() {
        val keys = WidgetKind.entries.flatMap { listOf(it.preferenceKey, it.skinKey, it.modeKey) }
        assertEquals(keys.size, keys.toSet().size)
    }
}
