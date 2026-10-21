package com.thonyfd.financedashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.thonyfd.financedashboard.data.models.HabitTemplateRow
import com.thonyfd.financedashboard.data.models.UserHabitInsert
import com.thonyfd.financedashboard.data.models.UserHabitRow
import com.thonyfd.financedashboard.data.repository.HabitRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitsScreen(padding: PaddingValues = PaddingValues()) {
    val repo = remember { HabitRepository() }
    val scope = rememberCoroutineScope()
    var habits by remember { mutableStateOf<List<UserHabitRow>>(emptyList()) }
    var templates by remember { mutableStateOf<List<HabitTemplateRow>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var editor by remember { mutableStateOf<UserHabitRow?>(null) }
    var showCreate by remember { mutableStateOf(false) }

    fun load() {
        scope.launch {
            isLoading = true
            habits = repo.getAllHabits()
            templates = repo.getHabitTemplates()
            isLoading = false
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
            title = { Text("Hábitos", color = TimelineText) },
            actions = {
                IconButton(onClick = { showCreate = true }) {
                    Icon(Icons.Default.Add, null, tint = TimelinePrimary)
                }
                IconButton(onClick = { load() }) {
                    Icon(Icons.Default.Refresh, null, tint = TimelinePrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1A1A2E))
        )

        if (isLoading) {
            androidx.compose.foundation.layout.Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TimelinePrimary)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = TimelineSurface), shape = RoundedCornerShape(20.dp)) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Plantillas base", color = TimelinePrimary, style = MaterialTheme.typography.labelMedium)
                            templates.take(4).forEach { template ->
                                Text("• ${template.name} · ${template.defaultDurationMinutes} min", color = TimelineText)
                            }
                        }
                    }
                }

                items(habits) { habit ->
                    Card(colors = CardDefaults.cardColors(containerColor = TimelineSurface), shape = RoundedCornerShape(18.dp)) {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(habit.name, color = TimelineText)
                                Text(
                                    "${habit.dayBlock} · ${habit.frequencyType} · ${habit.targetDurationMinutes} min",
                                    color = TimelineMuted
                                )
                            }
                            IconButton(onClick = { editor = habit }) {
                                Icon(Icons.Default.Edit, null, tint = TimelinePrimary)
                            }
                            OutlinedButton(onClick = {
                                scope.launch {
                                    repo.updateHabit(
                                        habit.id,
                                        UserHabitInsert(
                                            templateId = habit.templateId,
                                            name = habit.name,
                                            iconIdentifier = habit.iconIdentifier,
                                            colorHex = habit.colorHex,
                                            dayBlock = habit.dayBlock,
                                            frequencyType = habit.frequencyType,
                                            customDaysMask = habit.customDaysMask,
                                            targetDurationMinutes = habit.targetDurationMinutes,
                                            sortOrder = habit.sortOrder,
                                            isActive = !habit.isActive
                                        )
                                    )
                                    load()
                                }
                            }) {
                                Text(if (habit.isActive) "Pausar" else "Activar")
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreate) {
        HabitEditorDialog(
            title = "Nuevo hábito",
            templates = templates,
            onDismiss = { showCreate = false },
            onSave = { draft ->
                scope.launch {
                    repo.createHabit(draft)
                    showCreate = false
                    load()
                }
            }
        )
    }

    editor?.let { habit ->
        HabitEditorDialog(
            title = "Editar hábito",
            templates = templates,
            initial = UserHabitInsert(
                templateId = habit.templateId,
                name = habit.name,
                iconIdentifier = habit.iconIdentifier,
                colorHex = habit.colorHex,
                dayBlock = habit.dayBlock,
                frequencyType = habit.frequencyType,
                customDaysMask = habit.customDaysMask,
                targetDurationMinutes = habit.targetDurationMinutes,
                sortOrder = habit.sortOrder,
                isActive = habit.isActive
            ),
            onDismiss = { editor = null },
            onSave = { draft ->
                scope.launch {
                    repo.updateHabit(habit.id, draft)
                    editor = null
                    load()
                }
            }
        )
    }
}

@Composable
private fun HabitEditorDialog(
    title: String,
    templates: List<HabitTemplateRow>,
    initial: UserHabitInsert = UserHabitInsert(
        name = "",
        iconIdentifier = "focus",
        colorHex = "#00D9FF",
        dayBlock = "MORNING",
        frequencyType = "DAILY",
        targetDurationMinutes = 10
    ),
    onDismiss: () -> Unit,
    onSave: (UserHabitInsert) -> Unit
) {
    var selectedTemplate by remember { mutableStateOf<HabitTemplateRow?>(templates.firstOrNull()) }
    var name by remember { mutableStateOf(initial.name) }
    var block by remember { mutableStateOf(initial.dayBlock) }
    var minutes by remember { mutableIntStateOf(initial.targetDurationMinutes) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = TimelineSurface,
        title = { Text(title, color = TimelineText) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                templates.firstOrNull()?.let {
                    Button(onClick = {
                        selectedTemplate = it
                        name = it.name
                        minutes = it.defaultDurationMinutes
                    }) {
                        Text("Usar ${it.name}")
                    }
                }
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nombre") })
                OutlinedTextField(
                    value = block,
                    onValueChange = { block = it.uppercase() },
                    label = { Text("Bloque") },
                    supportingText = { Text("MORNING / AFTERNOON / EVENING") }
                )
                OutlinedTextField(
                    value = minutes.toString(),
                    onValueChange = { minutes = it.toIntOrNull() ?: minutes },
                    label = { Text("Minutos") }
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSave(
                    initial.copy(
                        templateId = selectedTemplate?.id ?: initial.templateId,
                        name = name,
                        iconIdentifier = selectedTemplate?.iconIdentifier ?: initial.iconIdentifier,
                        colorHex = selectedTemplate?.colorHex ?: initial.colorHex,
                        dayBlock = block,
                        targetDurationMinutes = minutes
                    )
                )
            }) { Text("Guardar", color = TimelinePrimary) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar", color = TimelineMuted) }
        }
    )
}
