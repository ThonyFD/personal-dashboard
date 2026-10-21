package com.thonyfd.financedashboard.ui

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
import androidx.compose.foundation.layout.weight
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.thonyfd.financedashboard.data.models.HabitLogRow
import com.thonyfd.financedashboard.data.models.UserHabitRow
import com.thonyfd.financedashboard.data.repository.HabitRepository
import kotlinx.coroutines.launch
import java.time.LocalDate

private val TimelineBg = Color(0xFF0F0F1A)
private val TimelineSurface = Color(0xFF16213E)
private val TimelinePrimary = Color(0xFF00D9FF)
private val TimelineGreen = Color(0xFF39FF14)
private val TimelineText = Color(0xFFE8FFFF)
private val TimelineMuted = Color(0xFF8A94A7)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimelineScreen(padding: PaddingValues = PaddingValues()) {
    val repo = remember { HabitRepository() }
    val scope = rememberCoroutineScope()
    val today = remember { LocalDate.now() }
    var habits by remember { mutableStateOf<List<UserHabitRow>>(emptyList()) }
    var logs by remember { mutableStateOf<List<HabitLogRow>>(emptyList()) }
    var streak by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var focusHabit by remember { mutableStateOf<UserHabitRow?>(null) }

    fun load() {
        scope.launch {
            isLoading = true
            error = null
            try {
                habits = repo.getHabitsForToday(today)
                logs = repo.getLogsForDate(today)
                streak = repo.computeStreak(
                    habits = repo.getAllHabits(activeOnly = true),
                    logs = repo.getLogsInRange(today.minusDays(365), today),
                    today = today
                )
            } catch (e: Exception) {
                error = e.message ?: "Error desconocido"
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    val completedCount = habits.count { habit -> logs.any { it.userHabitId == habit.id && it.status == "COMPLETED" } }
    val progress = if (habits.isEmpty()) 0f else completedCount.toFloat() / habits.size.toFloat()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(TimelineBg)
            .padding(padding)
    ) {
        TopAppBar(
            title = { Text("Timeline", color = TimelineText) },
            actions = {
                IconButton(onClick = { load() }) {
                    Icon(Icons.Default.Refresh, contentDescription = "Actualizar", tint = TimelinePrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1A1A2E))
        )

        when {
            isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TimelinePrimary)
            }
            error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(error ?: "Error", color = Color(0xFFFF6B6B))
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = TimelineSurface),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Racha viva", color = TimelinePrimary, fontSize = 12.sp)
                            Text("$streak días", color = TimelineText, style = MaterialTheme.typography.headlineMedium)
                            Text("$completedCount/${habits.size} completados hoy", color = TimelineMuted)
                            LinearProgressIndicator(
                                progress = { progress },
                                modifier = Modifier.fillMaxWidth().height(8.dp),
                                color = TimelineGreen,
                                trackColor = Color(0xFF25324C)
                            )
                        }
                    }
                }

                listOf("MORNING", "AFTERNOON", "EVENING").forEach { block ->
                    val blockHabits = habits.filter { it.dayBlock == block }
                    item {
                        Text(
                            text = when (block) {
                                "MORNING" -> "Mañana"
                                "AFTERNOON" -> "Tarde"
                                else -> "Noche"
                            },
                            color = TimelinePrimary,
                            fontSize = 13.sp
                        )
                    }
                    if (blockHabits.isEmpty()) {
                        item {
                            Card(colors = CardDefaults.cardColors(containerColor = TimelineSurface)) {
                                Text(
                                    "Sin hábitos en este bloque",
                                    color = TimelineMuted,
                                    modifier = Modifier.padding(14.dp)
                                )
                            }
                        }
                    } else {
                        items(blockHabits) { habit ->
                            val completed = logs.any { it.userHabitId == habit.id && it.status == "COMPLETED" }
                            Card(
                                colors = CardDefaults.cardColors(containerColor = TimelineSurface),
                                shape = RoundedCornerShape(18.dp)
                            ) {
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = completed,
                                        onCheckedChange = {
                                            scope.launch {
                                                if (completed) repo.removeHabitLog(habit.id, today)
                                                else repo.toggleHabitLog(habit.id, today, "COMPLETED", habit.targetDurationMinutes)
                                                load()
                                            }
                                        }
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(habit.name, color = TimelineText)
                                        Text("${habit.targetDurationMinutes} min", color = TimelineMuted, fontSize = 12.sp)
                                    }
                                    OutlinedButton(onClick = { focusHabit = habit }) {
                                        Icon(Icons.Default.PlayArrow, null)
                                        Spacer(Modifier.padding(horizontal = 2.dp))
                                        Text("Focus")
                                    }
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
            onSave = { minutes ->
                scope.launch {
                    repo.toggleHabitLog(habit.id, today, "COMPLETED", minutes)
                    focusHabit = null
                    load()
                }
            }
        )
    }
}

@Composable
private fun FocusTimerDialog(
    habit: UserHabitRow,
    onDismiss: () -> Unit,
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
        Card(colors = CardDefaults.cardColors(containerColor = TimelineSurface), shape = RoundedCornerShape(22.dp)) {
            Column(
                Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(habit.name, color = TimelineText, style = MaterialTheme.typography.headlineSmall)
                Text(
                    text = "%02d:%02d".format(remaining / 60, remaining % 60),
                    color = TimelinePrimary,
                    style = MaterialTheme.typography.displaySmall
                )
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = { running = !running }) {
                        Text(if (running) "Pausar" else "Iniciar")
                    }
                    Button(onClick = { onSave(maxOf(1, (habit.targetDurationMinutes * 60 - remaining) / 60)) }) {
                        Text("Guardar")
                    }
                }
            }
        }
    }
}
