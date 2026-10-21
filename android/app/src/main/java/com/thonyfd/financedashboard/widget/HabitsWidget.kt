package com.thonyfd.financedashboard.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextDecoration
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.thonyfd.financedashboard.data.models.HabitsWidgetItem
import com.thonyfd.financedashboard.data.models.MoodScale
import com.thonyfd.financedashboard.data.repository.HabitRepository
import com.thonyfd.financedashboard.data.repository.MoodRepository
import com.thonyfd.financedashboard.ui.MainActivity
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

private object HabitsPalette {
    val Background = Color(0xFF081022)
    val Surface = Color(0xFF111A2E)
    val Cyan = Color(0xFF00D9FF)
    val Green = Color(0xFF39FF14)
    val Violet = Color(0xFF7A5CFF)
    val Ice = Color(0xFFE8FFFF)
    val Muted = Color(0xFF8A94A8)
    val Error = Color(0xFFFF5C7A)
}

private val COMPACT_WIDTH = 260.dp

class HabitsWidget : GlanceAppWidget() {

    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) = coroutineScope {
        // Pinta la caché al instante y refresca en paralelo si es de otro día o no existe
        if (HabitsWidgetStateStore.loadWidgetData(context).isStale) {
            launch { HabitsWidgetRefresher.refresh(context) }
        }
        val opacity = WidgetAppearancePreferences.getOpacity(context, WidgetKind.HABITS)

        provideContent {
            // Lectura reactiva: cualquier escritura en el store recompone el widget
            val flow = remember { HabitsWidgetStateStore.observe(context) }
            val data by flow.collectAsState(initial = HabitsWidgetData(isRefreshing = true))
            GlanceTheme {
                HabitsWidgetContent(data = data, backgroundOpacity = opacity)
            }
        }
    }
}

/** Punto único de refresco: evita peticiones simultáneas y deja el error persistido. */
object HabitsWidgetRefresher {
    private val mutex = Mutex()

    suspend fun refresh(context: Context): Boolean = mutex.withLock {
        HabitsWidgetStateStore.setRefreshing(context, true)
        runCatching { HabitRepository().buildWidgetData(LocalDate.now()) }
            .onSuccess { HabitsWidgetStateStore.saveWidgetData(context, it) }
            .onFailure { HabitsWidgetStateStore.setError(context) }
            .isSuccess
    }
}

@Composable
private fun HabitsWidgetContent(data: HabitsWidgetData, backgroundOpacity: Float) {
    val compact = LocalSize.current.width < COMPACT_WIDTH
    val progress = if (data.dueCount == 0) 0f else data.completedCount.toFloat() / data.dueCount
    val openHabits = Intent(LocalContext.current, MainActivity::class.java).apply {
        putExtra(MainActivity.EXTRA_OPEN_TAB, MainActivity.TAB_HABITS)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

    Row(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(HabitsPalette.Background.copy(alpha = backgroundOpacity)))
            .cornerRadius(24.dp)
            .padding(12.dp)
    ) {
        if (!compact) {
            ProgressPanel(data = data, progress = progress, openHabits = openHabits)
            Spacer(GlanceModifier.width(10.dp))
        }

        Column(modifier = GlanceModifier.defaultWeight().fillMaxHeight()) {
            Header(data = data, compact = compact, progress = progress, openHabits = openHabits)
            Spacer(GlanceModifier.height(6.dp))
            MoodRow(mood = data.mood, compact = compact)
            Spacer(GlanceModifier.height(6.dp))
            if (data.isError) {
                ErrorBanner(lastUpdated = data.lastUpdated)
                Spacer(GlanceModifier.height(6.dp))
            }
            HabitList(data = data)
        }
    }
}

@Composable
private fun ProgressPanel(data: HabitsWidgetData, progress: Float, openHabits: Intent) {
    val allDone = data.dueCount > 0 && data.completedCount >= data.dueCount
    Column(
        modifier = GlanceModifier
            .width(96.dp)
            .fillMaxHeight()
            .background(ColorProvider(HabitsPalette.Surface))
            .cornerRadius(18.dp)
            .padding(horizontal = 10.dp, vertical = 12.dp)
            .clickable(actionStartActivity(openHabits)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "${(progress * 100).toInt()}%",
            style = TextStyle(
                color = ColorProvider(if (allDone) HabitsPalette.Green else HabitsPalette.Ice),
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
            )
        )
        Spacer(GlanceModifier.height(6.dp))
        LinearProgressIndicator(
            progress = progress,
            modifier = GlanceModifier.fillMaxWidth().height(6.dp).cornerRadius(3.dp),
            color = ColorProvider(if (allDone) HabitsPalette.Green else HabitsPalette.Cyan),
            backgroundColor = ColorProvider(HabitsPalette.Ice.copy(alpha = 0.12f))
        )
        Spacer(GlanceModifier.height(6.dp))
        Text(
            text = "${data.completedCount} de ${data.dueCount}",
            style = TextStyle(color = ColorProvider(HabitsPalette.Muted), fontSize = 10.sp, fontWeight = FontWeight.Medium)
        )
        Spacer(GlanceModifier.height(10.dp))
        Text(
            text = "🔥 ${data.streak}d",
            modifier = GlanceModifier
                .background(ColorProvider(HabitsPalette.Violet.copy(alpha = 0.22f)))
                .cornerRadius(12.dp)
                .padding(horizontal = 10.dp, vertical = 4.dp),
            style = TextStyle(color = ColorProvider(HabitsPalette.Ice), fontSize = 11.sp, fontWeight = FontWeight.Bold)
        )
    }
}

@Composable
private fun Header(data: HabitsWidgetData, compact: Boolean, progress: Float, openHabits: Intent) {
    Column(modifier = GlanceModifier.fillMaxWidth()) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = GlanceModifier.defaultWeight().clickable(actionStartActivity(openHabits))) {
                Text(
                    text = if (compact) "HÁBITOS  ${data.completedCount}/${data.dueCount}" else "HÁBITOS DE HOY",
                    style = TextStyle(color = ColorProvider(HabitsPalette.Cyan), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                )
                Text(
                    text = when {
                        data.isRefreshing -> "Actualizando…"
                        data.lastUpdated == "--:--" -> "Sin datos"
                        else -> "Act. ${data.lastUpdated}"
                    },
                    style = TextStyle(color = ColorProvider(HabitsPalette.Muted), fontSize = 9.sp)
                )
            }
            Box(
                modifier = GlanceModifier
                    .size(30.dp)
                    .background(ColorProvider(HabitsPalette.Surface))
                    .cornerRadius(15.dp)
                    .clickable(actionRunCallback<RefreshHabitsAction>()),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (data.isRefreshing) "…" else "⟳",
                    style = TextStyle(color = ColorProvider(HabitsPalette.Cyan), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                )
            }
        }
        if (compact) {
            Spacer(GlanceModifier.height(5.dp))
            LinearProgressIndicator(
                progress = progress,
                modifier = GlanceModifier.fillMaxWidth().height(4.dp).cornerRadius(2.dp),
                color = ColorProvider(HabitsPalette.Cyan),
                backgroundColor = ColorProvider(HabitsPalette.Ice.copy(alpha = 0.12f))
            )
        }
    }
}

/** Registro rápido de mood: un toque por cara guarda un check-in con la hora actual. */
@Composable
private fun MoodRow(mood: MoodWidgetState, compact: Boolean) {
    val (status, statusColor) = when {
        mood.status == MoodSaveStatus.SAVING -> "Guardando…" to HabitsPalette.Muted
        mood.status == MoodSaveStatus.ERROR -> "No se guardó, toca otra vez" to HabitsPalette.Error
        mood.lastScore != null -> "${mood.lastTime} · ${mood.countToday} hoy" to HabitsPalette.Muted
        else -> "¿Cómo estás?" to HabitsPalette.Muted
    }
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .background(ColorProvider(HabitsPalette.Surface))
            .cornerRadius(14.dp)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (!compact) {
            Text(
                text = status,
                modifier = GlanceModifier.defaultWeight(),
                maxLines = 1,
                style = TextStyle(color = ColorProvider(statusColor), fontSize = 10.sp, fontWeight = FontWeight.Medium)
            )
        }
        MoodScale.scores.forEach { score ->
            val selected = mood.lastScore == score && mood.status != MoodSaveStatus.ERROR
            Box(
                modifier = GlanceModifier
                    .size(30.dp)
                    .background(ColorProvider(if (selected) HabitsPalette.Cyan.copy(alpha = 0.22f) else Color.Transparent))
                    .cornerRadius(15.dp)
                    .clickable(
                        actionRunCallback<LogMoodAction>(actionParametersOf(LogMoodAction.scoreKey to score))
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(text = MoodScale.emoji(score), style = TextStyle(fontSize = 16.sp))
            }
            if (compact && score < 5) Spacer(GlanceModifier.defaultWeight())
        }
    }
}

@Composable
private fun ErrorBanner(lastUpdated: String) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .background(ColorProvider(HabitsPalette.Error.copy(alpha = 0.16f)))
            .cornerRadius(10.dp)
            .padding(horizontal = 8.dp, vertical = 4.dp)
            .clickable(actionRunCallback<RefreshHabitsAction>()),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = if (lastUpdated == "--:--") "Sin conexión · toca para reintentar" else "Sin conexión · datos de las $lastUpdated",
            style = TextStyle(color = ColorProvider(HabitsPalette.Error), fontSize = 10.sp, fontWeight = FontWeight.Medium)
        )
    }
}

@Composable
private fun HabitList(data: HabitsWidgetData) {
    LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
        items(items = data.items, itemId = { it.id }) { item ->
            Column(modifier = GlanceModifier.fillMaxWidth()) {
                HabitRow(item)
                Spacer(GlanceModifier.height(5.dp))
            }
        }
        if (data.items.isEmpty()) {
            item {
                Text(
                    text = when {
                        data.lastUpdated == "--:--" && data.isRefreshing -> "Cargando hábitos…"
                        data.lastUpdated == "--:--" -> "Toca ⟳ para cargar"
                        else -> "Sin hábitos pendientes hoy ✨"
                    },
                    modifier = GlanceModifier.padding(vertical = 16.dp),
                    style = TextStyle(color = ColorProvider(HabitsPalette.Muted), fontSize = 12.sp)
                )
            }
        }
    }
}

@Composable
private fun HabitRow(item: HabitsWidgetItem) {
    val accent = parseAccent(item.colorHex)
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .height(46.dp)
            .background(ColorProvider(if (item.completed) HabitsPalette.Surface.copy(alpha = 0.6f) else accent.copy(alpha = 0.14f)))
            .cornerRadius(14.dp)
            .padding(start = 6.dp, end = 6.dp)
            .clickable(
                actionRunCallback<ToggleHabitAction>(
                    actionParametersOf(ToggleHabitAction.habitIdKey to item.id)
                )
            ),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = GlanceModifier
                .size(34.dp)
                .background(ColorProvider(accent.copy(alpha = if (item.completed) 0.10f else 0.24f)))
                .cornerRadius(11.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(text = item.icon, style = TextStyle(fontSize = 17.sp))
        }
        Spacer(GlanceModifier.width(9.dp))
        Text(
            text = item.name,
            modifier = GlanceModifier.defaultWeight(),
            maxLines = 1,
            style = TextStyle(
                color = ColorProvider(if (item.completed) HabitsPalette.Muted else HabitsPalette.Ice),
                fontSize = 13.sp,
                fontWeight = if (item.completed) FontWeight.Normal else FontWeight.Medium,
                textDecoration = if (item.completed) TextDecoration.LineThrough else TextDecoration.None
            )
        )
        Spacer(GlanceModifier.width(6.dp))
        Box(
            modifier = GlanceModifier
                .size(30.dp)
                .background(ColorProvider(if (item.completed) HabitsPalette.Green else accent.copy(alpha = 0.18f)))
                .cornerRadius(15.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (item.completed) "✓" else "",
                style = TextStyle(
                    color = ColorProvider(HabitsPalette.Background),
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold
                )
            )
        }
    }
}

private fun parseAccent(colorHex: String?): Color =
    colorHex?.let { runCatching { Color(android.graphics.Color.parseColor(it)) }.getOrNull() }
        ?: HabitsPalette.Cyan

class LogMoodAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val score = parameters[scoreKey] ?: return
        HabitsWidgetStateStore.setMoodStatus(context, MoodSaveStatus.SAVING)
        HabitsWidget().update(context, glanceId)

        runCatching { MoodRepository().addCheckin(score, source = "widget") }
            .onSuccess {
                val time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
                HabitsWidgetStateStore.recordMood(context, score, time)
            }
            .onFailure { HabitsWidgetStateStore.setMoodStatus(context, MoodSaveStatus.ERROR) }
        HabitsWidget().update(context, glanceId)
    }

    companion object {
        val scoreKey = ActionParameters.Key<Int>("mood_score")
    }
}

class RefreshHabitsAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        HabitsWidgetRefresher.refresh(context)
        HabitsWidget().update(context, glanceId)
    }
}

class ToggleHabitAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val habitId = parameters[habitIdKey] ?: return
        // Se lee el estado actual del store (no del parámetro) para que toques rápidos no se pisen
        val wasCompleted = HabitsWidgetStateStore.loadWidgetData(context)
            .items.firstOrNull { it.id == habitId }?.completed ?: return
        val isCompleted = !wasCompleted

        HabitsWidgetStateStore.setItemCompleted(context, habitId, isCompleted)
        HabitsWidget().update(context, glanceId)

        val saved = runCatching {
            val repository = HabitRepository()
            if (isCompleted) {
                repository.toggleHabitLog(habitId, LocalDate.now())
            } else {
                repository.removeHabitLog(habitId, LocalDate.now())
            }
        }.isSuccess

        if (saved) {
            HabitsWidgetRefresher.refresh(context)
        } else {
            HabitsWidgetStateStore.setItemCompleted(context, habitId, wasCompleted)
            HabitsWidgetStateStore.setError(context)
        }
        HabitsWidget().update(context, glanceId)
    }

    companion object {
        val habitIdKey = ActionParameters.Key<Long>("habit_id")
    }
}
