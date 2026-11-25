package com.thonyfd.financedashboard.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AppTabsTest {

    @Test
    fun ownerSeesAllFiveTabs() {
        assertEquals(AppTab.entries.toList(), visibleTabs(isOwner = true))
    }

    @Test
    fun nonOwnerSeesTimelineHabitsMood() {
        assertEquals(listOf(AppTab.Timeline, AppTab.Habitos, AppTab.Mood), visibleTabs(isOwner = false))
    }

    @Test
    fun nonOwnerStartsOnHabits() {
        assertEquals(AppTab.Inicio, startTab(isOwner = true))
        assertEquals(AppTab.Habitos, startTab(isOwner = false))
    }

    @Test
    fun nonOwnerIgnoresFinanceDeepLinks() {
        assertNull(resolveDeepLinkTab(0, isOwner = false))
        assertNull(resolveDeepLinkTab(1, isOwner = false))
        assertEquals(AppTab.Habitos, resolveDeepLinkTab(3, isOwner = false))
        assertEquals(AppTab.Control, resolveDeepLinkTab(1, isOwner = true))
    }
}
