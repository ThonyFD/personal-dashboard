package com.thonyfd.financedashboard.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.thonyfd.financedashboard.data.repository.HabitRepository
import com.thonyfd.financedashboard.ui.MainActivity

class HabitsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        var data = HabitsWidgetStateStore.loadWidgetData(context)
        if (data.lastUpdated == "--:--") {
            data = try {
                val fresh = HabitRepository().buildWidgetData()
                HabitsWidgetStateStore.saveWidgetData(context, fresh)
                HabitsWidgetStateStore.loadWidgetData(context)
            } catch (e: Exception) {
                data.copy(isError = true)
            }
        }

        provideContent {
            GlanceTheme {
                HabitsWidgetContent(data)
            }
        }
    }
}

@Composable
private fun HabitsWidgetContent(data: HabitsWidgetData) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color(0xFF1A1A2E)))
            .padding(10.dp)
            .clickable(actionStartActivity<MainActivity>())
    ) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "⚡ Hábitos Hoy",
                style = TextStyle(color = ColorProvider(Color(0xFF00D9FF)), fontSize = 13.sp, fontWeight = FontWeight.Bold)
            )
            Spacer(GlanceModifier.defaultWeight())
            Text(
                text = "${data.completedCount}/${data.dueCount}",
                style = TextStyle(color = ColorProvider(Color(0xFFE8FFFF)), fontSize = 11.sp, fontWeight = FontWeight.Bold)
            )
        }

        Spacer(GlanceModifier.height(6.dp))
        Text(
            text = "Racha: ${data.streak} días",
            style = TextStyle(color = ColorProvider(Color(0xFF39FF14)), fontSize = 10.sp, fontWeight = FontWeight.Bold)
        )
        Spacer(GlanceModifier.height(6.dp))

        data.items.forEach { item ->
            Row(
                modifier = GlanceModifier.fillMaxWidth().padding(vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = item.icon, style = TextStyle(fontSize = 13.sp))
                Spacer(GlanceModifier.width(6.dp))
                Text(
                    text = item.name,
                    modifier = GlanceModifier.defaultWeight(),
                    style = TextStyle(color = ColorProvider(Color(0xFFE8FFFF)), fontSize = 10.sp)
                )
                Text(
                    text = if (item.completed) "✓" else "○",
                    modifier = GlanceModifier
                        .background(ColorProvider(if (item.completed) Color(0x2200FF88) else Color(0x22111A2E)))
                        .cornerRadius(10.dp)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    style = TextStyle(
                        color = ColorProvider(if (item.completed) Color(0xFF39FF14) else Color(0xFF5E677A)),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        }
    }
}
