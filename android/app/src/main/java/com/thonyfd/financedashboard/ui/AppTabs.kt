package com.thonyfd.financedashboard.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.ui.graphics.vector.ImageVector

/** Bottom tabs. Order matches the legacy tab index used by widget deep links (0..4). */
enum class AppTab(val label: String, val icon: ImageVector) {
    Inicio("Inicio", Icons.Default.Home),
    Control("Control", Icons.Default.DateRange),
    Timeline("Timeline", Icons.Default.Timeline),
    Habitos("Hábitos", Icons.Default.AutoAwesome),
    Mood("Mood", Icons.Default.Favorite)
}

private val financeTabs = setOf(AppTab.Inicio, AppTab.Control)

fun visibleTabs(isOwner: Boolean): List<AppTab> =
    if (isOwner) AppTab.entries.toList() else AppTab.entries.filterNot { it in financeTabs }

fun startTab(isOwner: Boolean): AppTab = if (isOwner) AppTab.Inicio else AppTab.Habitos

fun resolveDeepLinkTab(index: Int, isOwner: Boolean): AppTab? =
    AppTab.entries.getOrNull(index)?.takeIf { it in visibleTabs(isOwner) }
