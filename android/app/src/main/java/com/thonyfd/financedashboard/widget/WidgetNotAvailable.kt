package com.thonyfd.financedashboard.widget

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import com.thonyfd.financedashboard.ui.MainActivity

/** Shown by finance widgets when the signed-in account is not the owner. */
@Composable
internal fun WidgetNotAvailable() {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(WidgetTheme.colors.bg)
            .padding(16.dp)
            .clickable(actionStartActivity<MainActivity>()),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "No disponible para esta cuenta",
            style = TextStyle(
                color = WidgetTheme.colors.textSecondary,
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )
        )
    }
}
