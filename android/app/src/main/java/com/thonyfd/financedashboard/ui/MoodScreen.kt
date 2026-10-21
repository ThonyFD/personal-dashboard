package com.thonyfd.financedashboard.ui

import com.thonyfd.financedashboard.ui.theme.AppColors
import java.time.format.DateTimeFormatter
import java.time.ZoneId
import java.time.OffsetDateTime
import java.time.LocalTime
import androidx.glance.appwidget.updateAll
import com.thonyfd.financedashboard.widget.HabitsWidgetStateStore
import com.thonyfd.financedashboard.widget.HabitsWidget
import com.thonyfd.financedashboard.data.models.MoodCheckinRow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.geometry.Offset
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.Canvas
import com.thonyfd.financedashboard.data.models.MoodScale
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.unit.sp
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import kotlinx.coroutines.CancellationException
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ChipColors
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.thonyfd.financedashboard.data.models.MoodLogWithTags
import com.thonyfd.financedashboard.data.models.MoodTagRow
import com.thonyfd.financedashboard.data.repository.MoodRepository
import kotlinx.coroutines.launch
import java.time.LocalDate
import android.widget.Toast

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun MoodScreen(padding: PaddingValues = PaddingValues()) {
    val repo = remember { MoodRepository() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val today = remember { LocalDate.now() }
    var isLoading by remember { mutableStateOf(true) }
    var hasLoaded by remember { mutableStateOf(false) }
    var tags by remember { mutableStateOf<List<MoodTagRow>>(emptyList()) }
    var history by remember { mutableStateOf<List<MoodLogWithTags>>(emptyList()) }
    var score by remember { mutableIntStateOf(3) }
    var journal by remember { mutableStateOf("") }
    val selectedTags = remember { mutableStateListOf<Long>() }
    var checkins by remember { mutableStateOf<List<MoodCheckinRow>>(emptyList()) }
    var savingCheckin by remember { mutableStateOf(false) }

    // Separado del load principal: si falla, el resto de la pantalla sigue funcionando
    fun loadCheckins() {
        scope.launch {
            runCatching { repo.getCheckins(LocalDate.now()) }.onSuccess { checkins = it }
        }
    }

    fun logCheckin(value: Int) {
        if (savingCheckin) return
        scope.launch {
            savingCheckin = true
            runCatching { repo.addCheckin(value, source = "app") }
                .onSuccess {
                    val time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
                    HabitsWidgetStateStore.recordMood(context, value, time)
                    HabitsWidget().updateAll(context)
                    Toast.makeText(context, "${MoodScale.emoji(value)} registrado a las $time", Toast.LENGTH_SHORT).show()
                    loadCheckins()
                }
                .onFailure { Toast.makeText(context, "No se pudo registrar el mood", Toast.LENGTH_SHORT).show() }
            savingCheckin = false
        }
    }

    fun load(showResult: Boolean = false) {
        scope.launch {
            if (!hasLoaded) isLoading = true
            try {
                tags = repo.getMoodTags()
                history = repo.getMoodRange(today.minusDays(13), today)
                repo.getMoodForDate(today)?.let { mood ->
                    score = mood.moodScore
                    journal = mood.journalText.orEmpty()
                    selectedTags.clear()
                    selectedTags.addAll(mood.tagIds)
                }
                hasLoaded = true
                loadCheckins()
                if (showResult) Toast.makeText(context, "Mood actualizado", Toast.LENGTH_SHORT).show()
            } catch (e: CancellationException) {
                throw e // tab cambiada o pantalla cerrada: no es un error
            } catch (e: Exception) {
                Toast.makeText(context, "No se pudo actualizar Mood", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(TimelineBg)
            .padding(padding)
    ) {
        TopAppBar(
            title = {
                Column {
                    Text("Mood", style = MaterialTheme.typography.titleLarge)
                    Text("Registro diario", color = TimelineMuted, style = MaterialTheme.typography.bodySmall)
                }
            },
            actions = {
                IconButton(onClick = { load(showResult = true) }) {
                    Icon(Icons.Outlined.Refresh, "Actualizar")
                }
            },
            colors = appTopBarColors()
        )

        if (isLoading) {
            androidx.compose.foundation.layout.Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TimelinePrimary, strokeWidth = 2.dp, modifier = Modifier.size(32.dp))
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { SectionHeader("Hoy, hora por hora", trailing = if (checkins.isEmpty()) null else "${checkins.size} ${if (checkins.size == 1) "registro" else "registros"}") }

                item {
                    GroupedPanel {
                        MoodDayChart(checkins, Modifier.fillMaxWidth().padding(start = 12.dp, end = 16.dp, top = 16.dp, bottom = 8.dp))
                        PanelDivider(startIndent = 0.dp)
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                if (savingCheckin) "Guardando…" else "¿Cómo estás ahora?",
                                color = TimelineMuted,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.weight(1f).padding(start = 4.dp)
                            )
                            MoodScale.scores.forEach { value ->
                                Box(
                                    Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .clickable(enabled = !savingCheckin) { logCheckin(value) },
                                    contentAlignment = Alignment.Center
                                ) { Text(MoodScale.emoji(value), fontSize = 22.sp) }
                            }
                        }
                    }
                }

                item {
                    SectionHeader("Resumen del día")
                }

                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        (1..5).forEach { value ->
                            val selected = score == value
                            Column(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(18.dp))
                                    .background(if (selected) TimelinePrimary.copy(alpha = 0.14f) else Color.Transparent)
                                    .border(1.dp, if (selected) TimelinePrimary else Color.Transparent, RoundedCornerShape(18.dp))
                                    .clickable { score = value }
                                    .padding(vertical = 10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(moodEmoji(value), fontSize = if (selected) 32.sp else 26.sp)
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    moodLabel(value),
                                    color = if (selected) TimelineText else TimelineMuted,
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        }
                    }
                }

                item {
                    OutlinedTextField(
                        value = journal,
                        onValueChange = { if (it.length <= 280) journal = it },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        placeholder = { Text("Una línea sobre tu día") },
                        supportingText = { Text("${journal.length}/280", color = AppColors.Dim) },
                        colors = appFieldColors(),
                        shape = RoundedCornerShape(16.dp)
                    )
                }

                if (tags.isNotEmpty()) item {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        tags.forEach { tag ->
                            val selected = selectedTags.contains(tag.id)
                            Text(
                                tag.name,
                                Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(if (selected) TimelineText else Color.Transparent)
                                    .border(1.dp, if (selected) TimelineText else AppColors.Hairline, RoundedCornerShape(50))
                                    .clickable {
                                        if (selected) selectedTags.remove(tag.id) else selectedTags.add(tag.id)
                                    }
                                    .padding(horizontal = 14.dp, vertical = 7.dp),
                                color = if (selected) AppColors.Night else TimelineMuted,
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }
                }

                item {
                    Button(
                        onClick = {
                            scope.launch {
                                runCatching { repo.upsertMood(today, score, journal.ifBlank { null }, selectedTags.toList()) }
                                    .onSuccess {
                                        Toast.makeText(context, "Mood guardado", Toast.LENGTH_SHORT).show()
                                        load()
                                    }
                                    .onFailure { Toast.makeText(context, "No se pudo guardar el mood", Toast.LENGTH_SHORT).show() }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = TimelinePrimary, contentColor = AppColors.Night)
                    ) {
                        Text("Guardar mood", style = MaterialTheme.typography.labelLarge)
                    }
                }

                if (history.isNotEmpty()) {
                    item { SectionHeader("Últimos 14 días") }

                    // Mini gráfico: una barra por día, altura según el score
                    item {
                        val days = history.sortedBy { it.logDate }.takeLast(14)
                        GroupedPanel {
                            Row(
                                Modifier.fillMaxWidth().height(96.dp).padding(horizontal = 16.dp, vertical = 14.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.Bottom
                            ) {
                                days.forEach { day ->
                                    Box(
                                        Modifier
                                            .weight(1f)
                                            .fillMaxHeight(day.moodScore.coerceIn(1, 5) / 5f)
                                            .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp, bottomStart = 2.dp, bottomEnd = 2.dp))
                                            .background(moodColor(day.moodScore))
                                    )
                                }
                            }
                        }
                    }

                    item {
                        GroupedPanel {
                            history.forEachIndexed { index, entry ->
                                if (index > 0) PanelDivider(startIndent = 60.dp)
                                Row(
                                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Text(moodEmoji(entry.moodScore), fontSize = 24.sp, modifier = Modifier.width(30.dp))
                                    Spacer(Modifier.width(14.dp))
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(
                                            "${moodShortDate(entry.logDate)} · ${moodLabel(entry.moodScore)}",
                                            color = TimelineText,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        if (!entry.journalText.isNullOrBlank()) {
                                            Text(entry.journalText.orEmpty(), color = TimelineMuted, style = MaterialTheme.typography.bodySmall)
                                        }
                                        if (entry.tagIds.isNotEmpty()) {
                                            Text(
                                                entry.tagIds.mapNotNull { id -> tags.find { tag -> tag.id == id }?.name }.joinToString(" · "),
                                                color = TimelinePrimary,
                                                style = MaterialTheme.typography.labelSmall
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun moodEmoji(score: Int): String = MoodScale.emoji(score)

private fun moodLabel(score: Int): String = MoodScale.label(score)

private fun moodColor(score: Int): Color = when (score) {
    1 -> AppColors.Coral
    2 -> AppColors.Amber
    3 -> AppColors.Mist
    4 -> AppColors.Cyan
    else -> AppColors.Lime
}

private fun moodShortDate(raw: String): String = runCatching {
    val date = LocalDate.parse(raw.take(10))
    val month = date.month.getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale("es")).trimEnd('.')
    if (date == LocalDate.now()) "Hoy" else "${date.dayOfMonth} $month"
}.getOrDefault(raw)

/**
 * Gráfica del día: eje X de 0 a 24 h, eje Y de 1 a 5.
 * Línea fina entre registros y un punto por registro coloreado según el score.
 */
@Composable
private fun MoodDayChart(checkins: List<MoodCheckinRow>, modifier: Modifier = Modifier) {
    val zone = remember { ZoneId.systemDefault() }
    val points = remember(checkins) {
        checkins.mapNotNull { row ->
            runCatching {
                val local = OffsetDateTime.parse(row.checkedAt).atZoneSameInstant(zone).toLocalTime()
                (local.hour + local.minute / 60f) to row.moodScore.coerceIn(1, 5)
            }.getOrNull()
        }
    }
    val nowHour = LocalTime.now().let { it.hour + it.minute / 60f }

    Column(modifier) {
        Row(Modifier.fillMaxWidth().height(132.dp)) {
            // Etiquetas del eje Y
            Column(Modifier.fillMaxHeight().width(28.dp), verticalArrangement = Arrangement.SpaceBetween) {
                (5 downTo 1).forEach { Text(MoodScale.emoji(it), fontSize = 12.sp) }
            }
            Canvas(Modifier.weight(1f).fillMaxHeight()) {
                val w = size.width
                val h = size.height
                fun x(hour: Float) = hour / 24f * w
                fun y(score: Int) = h - (score - 1) / 4f * h

                // Guías horizontales por score y verticales cada 6 h
                for (score in 1..5) {
                    drawLine(AppColors.Hairline, Offset(0f, y(score)), Offset(w, y(score)), strokeWidth = 1.dp.toPx())
                }
                for (hour in listOf(6f, 12f, 18f)) {
                    drawLine(
                        AppColors.Hairline, Offset(x(hour), 0f), Offset(x(hour), h),
                        strokeWidth = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx()))
                    )
                }
                // Hora actual
                drawLine(TimelinePrimary.copy(alpha = 0.35f), Offset(x(nowHour), 0f), Offset(x(nowHour), h), strokeWidth = 1.dp.toPx())

                if (points.size > 1) {
                    val path = Path().apply {
                        moveTo(x(points.first().first), y(points.first().second))
                        points.drop(1).forEach { (hour, score) -> lineTo(x(hour), y(score)) }
                    }
                    drawPath(path, TimelinePrimary.copy(alpha = 0.7f), style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
                }
                points.forEach { (hour, score) ->
                    drawCircle(AppColors.Panel, radius = 6.dp.toPx(), center = Offset(x(hour), y(score)))
                    drawCircle(moodColor(score), radius = 4.dp.toPx(), center = Offset(x(hour), y(score)))
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth().padding(start = 28.dp)) {
            listOf("0h", "6h", "12h", "18h", "24h").forEachIndexed { index, label ->
                Text(
                    label,
                    color = AppColors.Dim,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.weight(1f),
                    textAlign = when (index) {
                        0 -> TextAlign.Start
                        4 -> TextAlign.End
                        else -> TextAlign.Center
                    }
                )
            }
        }
        if (points.isEmpty()) {
            Text(
                "Aún no registras tu mood hoy. Toca una cara para empezar.",
                color = TimelineMuted,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(start = 28.dp, top = 8.dp)
            )
        }
    }
}
