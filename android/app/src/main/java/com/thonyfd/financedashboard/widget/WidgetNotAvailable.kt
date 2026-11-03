package com.thonyfd.financedashboard.widget

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
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
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.thonyfd.financedashboard.ui.MainActivity

/** Shown by finance widgets when the signed-in account is not the owner. */
@Composable
internal fun WidgetNotAvailable(backgroundOpacity: Float) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color(0xFF1A1A2E).copy(alpha = backgroundOpacity)))
            .padding(16.dp)
            .clickable(actionStartActivity<MainActivity>()),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "No disponible para esta cuenta",
            style = TextStyle(
                color = ColorProvider(Color(0xFF8A94A8)),
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )
        )
    }
}
