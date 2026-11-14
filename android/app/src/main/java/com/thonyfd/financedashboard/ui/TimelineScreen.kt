package com.thonyfd.financedashboard.ui

import com.thonyfd.financedashboard.ui.theme.AppTheme
import com.thonyfd.financedashboard.data.models.HabitIcons
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import kotlinx.coroutines.CancellationException
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.thonyfd.financedashboard.data.models.HabitLogRow
import com.thonyfd.financedashboard.data.models.UserHabitRow
import com.thonyfd.financedashboard.data.repository.HabitRepository
import kotlinx.coroutines.launch
import java.time.LocalDate
import android.widget.Toast

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimelineScreen(padding: PaddingValues = PaddingValues(), onOpenMenu: (() -> Unit)? = null) {
    val repo = remember { HabitRepository() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val today = remember { LocalDate.now() }
    var habits by remember { mutableStateOf<List<UserHabitRow>>(emptyList()) }
    var logs by remember { mutableStateOf<List<HabitLogRow>>(emptyList()) }
    var streak by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var hasLoaded by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var focusHabit by remember { mutableStateOf<UserHabitRow?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var savingFocus by remember { mutableStateOf(false) }
    var pendingIds by remember { mutableStateOf<Set<Long>>(emptySet()) }

    fun load(showResult: Boolean = false) {
        scope.launch {
            if (!hasLoaded) isLoading = true
            refreshing = true
            error = null
            try {
                habits = repo.getHabitsForToday(today)
                logs = repo.getLogsForDate(today)
                streak = repo.computeStreak(
                    habits = repo.getAllHabits(activeOnly = true),
                    logs = repo.getLogsInRange(today.minusDays(365), today),
                    today = today
                )
                hasLoaded = true
                if (showResult) Toast.makeText(context, "Timeline actualizado", Toast.LENGTH_SHORT).show()
            } catch (e: CancellationException) {
                throw e // tab cambiada o pantalla cerrada: no es un error
            } catch (e: Exception) {
                error = e.message ?: "Error desconocido"
                Toast.makeText(context, "No se pudo actualizar el timeline", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
                refreshing = false
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    val completedCount = habits.count { habit -> logs.any { it.userHabitId == habit.id && it.status == "COMPLETED" } }
    val progress = if (habits.isEmpty()) 0f else completedCount.toFloat() / habits.size.toFloat()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.bg)
            .padding(padding)
    ) {
        TopAppBar(
            navigationIcon = { onOpenMenu?.let { AppIconButton(Icons.Outlined.Menu, "Menú", onClick = it) } },
            title = {
                Column {
                    Text("Timeline", style = MaterialTheme.typography.titleLarge)
                    Text("Tu día por bloques", color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodySmall)
                }
            },
            actions = {
                AppIconButton(Icons.Outlined.Refresh, "Actualizar", onClick = { if (!refreshing) load(showResult = true) }, loading = refreshing && hasLoaded)
            },
            colors = appTopBarColors()
        )

        when {
            isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppTheme.colors.accent, strokeWidth = 2.dp, modifier = Modifier.size(32.dp))
            }
            error != null && !hasLoaded -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No se pudo cargar el timeline", color = AppTheme.colors.text, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text(error ?: "", color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(16.dp))
                    AppButton("Reintentar", onClick = { load(showResult = true) }, style = AppButtonStyle.Secondary, loading = refreshing)
                }
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Column(Modifier.padding(top = 8.dp, start = 2.dp, bottom = 4.dp)) {
                        Text("Racha", color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodyMedium)
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text("$streak", color = AppTheme.colors.text, style = AppTheme.moneyStyle.copy(fontFamily = AppTheme.fonts.display), fontSize = 52.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1.5).sp)
                            Spacer(Modifier.width(8.dp))
                            Text(if (streak == 1) "día" else "días", color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 10.dp))
                        }
                        Spacer(Modifier.height(10.dp))
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                            color = if (progress >= 1f) AppTheme.colors.positive else AppTheme.colors.accent,
                            trackColor = AppTheme.colors.surface,
                            gapSize = 0.dp,
                            drawStopIndicator = {}
                        )
                        Spacer(Modifier.height(8.dp))
                        Text("$completedCount de ${habits.size} completados hoy", color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodySmall)
                    }
                }

                listOf("MORNING", "AFTERNOON", "EVENING").forEach { block ->
                    val blockHabits = habits.filter { it.dayBlock == block }
                    val blockDone = blockHabits.count { habit -> logs.any { it.userHabitId == habit.id && it.status == "COMPLETED" } }
                    item {
                        SectionHeader(
                            when (block) {
                                "MORNING" -> "Mañana"
                                "AFTERNOON" -> "Tarde"
                                else -> "Noche"
                            },
                            trailing = if (blockHabits.isEmpty()) null else "$blockDone de ${blockHabits.size}"
                        )
                    }
                    item {
                        GroupedPanel {
                            if (blockHabits.isEmpty()) {
                                EmptyRow("Sin hábitos en este bloque")
                            }
                            blockHabits.forEachIndexed { index, habit ->
                                val completed = logs.any { it.userHabitId == habit.id && it.status == "COMPLETED" }
                                if (index > 0) PanelDivider(startIndent = 60.dp)
                                Row(
                                    Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 12.dp, bottom = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    CheckCircle(
                                        checked = completed,
                                        size = 28.dp,
                                        loading = habit.id in pendingIds,
                                        onClick = {
                                            scope.launch {
                                                pendingIds = pendingIds + habit.id
                                                runCatching {
                                                    if (completed) repo.removeHabitLog(habit.id, today)
                                                    else repo.toggleHabitLog(habit.id, today, "COMPLETED", habit.targetDurationMinutes)
                                                }.onSuccess {
                                                    load()
                                                }.onFailure { Toast.makeText(context, "No se pudo guardar el cambio", Toast.LENGTH_SHORT).show() }
                                                pendingIds = pendingIds - habit.id
                                            }
                                        }
                                    )
                                    Spacer(Modifier.width(16.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            "${HabitIcons.resolve(habit.iconIdentifier)}  ${habit.name}",
                                            color = if (completed) AppTheme.colors.textSecondary else AppTheme.colors.text,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 1
                                        )
                                        Text("${habit.targetDurationMinutes} min", color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodySmall)
                                    }
                                    AppButton("Enfoque", onClick = { focusHabit = habit }, style = AppButtonStyle.Text, leadingIcon = Icons.Default.PlayArrow)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    focusHabit?.let { habit ->
        FocusTimerDialog(
            habit = habit,
            onDismiss = { focusHabit = null },
            saving = savingFocus,
            onSave = { minutes ->
                if (!savingFocus) scope.launch {
                    savingFocus = true
                    runCatching { repo.toggleHabitLog(habit.id, today, "COMPLETED", minutes) }
                        .onSuccess {
                            focusHabit = null
                            Toast.makeText(context, "Sesión guardada", Toast.LENGTH_SHORT).show()
                            load()
                        }
                        .onFailure { Toast.makeText(context, "No se pudo guardar la sesión", Toast.LENGTH_SHORT).show() }
                    savingFocus = false
                }
            }
        )
    }
}

@Composable
private fun FocusTimerDialog(
    habit: UserHabitRow,
    onDismiss: () -> Unit,
    saving: Boolean = false,
    onSave: (Int) -> Unit
) {
    var remaining by remember(habit.id) { mutableIntStateOf(habit.targetDurationMinutes * 60) }
    var running by remember { mutableStateOf(false) }

    LaunchedEffect(running, remaining) {
        if (!running || remaining <= 0) return@LaunchedEffect
        kotlinx.coroutines.delay(1000)
        remaining -= 1
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(colors = CardDefaults.cardColors(containerColor = AppTheme.colors.surface), shape = RoundedCornerShape(28.dp)) {
            Column(
                Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(habit.name, color = AppTheme.colors.text, style = MaterialTheme.typography.headlineSmall)
                Text(
                    text = "%02d:%02d".format(remaining / 60, remaining % 60),
                    color = AppTheme.colors.text,
                    style = AppTheme.moneyStyle.copy(fontFamily = AppTheme.fonts.display),
                    fontSize = 56.sp,
                    fontWeight = FontWeight.Medium
                )
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AppButton(if (running) "Pausar" else "Iniciar", onClick = { running = !running }, style = AppButtonStyle.Secondary, enabled = !saving)
                    AppButton("Guardar", onClick = { onSave(maxOf(1, (habit.targetDurationMinutes * 60 - remaining) / 60)) }, loading = saving)
                }
            }
        }
    }
}
