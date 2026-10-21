package com.thonyfd.financedashboard.ui

import com.thonyfd.financedashboard.ui.theme.AppColors
import com.thonyfd.financedashboard.ui.theme.MoneyStyle
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.itemsIndexed
import kotlinx.coroutines.CancellationException
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Timer
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
import androidx.compose.material3.Surface
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Switch
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.thonyfd.financedashboard.data.models.HabitIcons
import com.thonyfd.financedashboard.data.models.HabitTemplateRow
import com.thonyfd.financedashboard.data.models.UserHabitInsert
import com.thonyfd.financedashboard.data.models.UserHabitRow
import com.thonyfd.financedashboard.data.repository.HabitRepository
import com.thonyfd.financedashboard.widget.HabitsWidget
import com.thonyfd.financedashboard.widget.HabitsWidgetStateStore
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import android.widget.Toast

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitsScreen(padding: PaddingValues = PaddingValues()) {
    val repo = remember { HabitRepository() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var habits by remember { mutableStateOf<List<UserHabitRow>>(emptyList()) }
    var templates by remember { mutableStateOf<List<HabitTemplateRow>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var completedIds by remember { mutableStateOf<Set<Long>>(emptySet()) }
    var selectedBlock by remember { mutableStateOf("ALL") }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var editor by remember { mutableStateOf<UserHabitRow?>(null) }
    var showCreate by remember { mutableStateOf(false) }

    fun load(showResult: Boolean = false) {
        scope.launch {
            val firstLoad = habits.isEmpty() && templates.isEmpty()
            if (firstLoad) isLoading = true
            try {
                habits = repo.getHabitsForToday(selectedDate)
                completedIds = repo.getLogsForDate(selectedDate)
                    .filter { it.status == "COMPLETED" }
                    .map { it.userHabitId }
                    .toSet()
                templates = repo.getHabitTemplates()
                if (selectedDate == LocalDate.now()) runCatching {
                    HabitsWidgetStateStore.saveWidgetData(context, repo.buildWidgetData(selectedDate))
                    HabitsWidget().updateAll(context)
                }
                if (showResult) Toast.makeText(context, "Hábitos actualizados", Toast.LENGTH_SHORT).show()
            } catch (e: CancellationException) {
                throw e // tab cambiada o pantalla cerrada: no es un error
            } catch (e: Exception) {
                Toast.makeText(context, "No se pudieron actualizar los hábitos", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(selectedDate) { load() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(TimelineBg)
            .padding(padding)
    ) {
        TopAppBar(
            title = {
                Column {
                    Text(
                        if (selectedDate == LocalDate.now()) "Hoy" else "${selectedDate.dayOfMonth} de ${selectedDate.month.getDisplayName(TextStyle.FULL, Locale("es"))}",
                        style = MaterialTheme.typography.titleLarge
                    )
                    Text(
                        if (selectedDate == LocalDate.now()) "Tu rutina diaria" else "Historial de hábitos",
                        color = TimelineMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            },
            actions = {
                IconButton(onClick = { load(showResult = true) }) {
                    Icon(Icons.Outlined.Refresh, "Actualizar")
                }
                IconButton(onClick = { showCreate = true }) {
                    Icon(Icons.Default.Add, "Nuevo hábito", tint = TimelinePrimary)
                }
            },
            colors = appTopBarColors()
        )

        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TimelinePrimary, strokeWidth = 2.dp, modifier = Modifier.size(32.dp))
            }
        } else {
            val visibleHabits = habits.filter { selectedBlock == "ALL" || it.dayBlock == selectedBlock }
            val completed = habits.count { it.id in completedIds }
            val progress = if (habits.isEmpty()) 0f else completed.toFloat() / habits.size
            val today = LocalDate.now()
            val calendarDates = remember { (-45L..30L).map { today.plusDays(it) } }
            val calendarState = rememberLazyListState(initialFirstVisibleItemIndex = 42)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    LazyRow(
                        state = calendarState,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(calendarDates, key = { it.toEpochDay() }) { date ->
                            val selected = date == selectedDate
                            Column(
                                Modifier
                                    .width(44.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (selected) TimelinePrimary else Color.Transparent)
                                    .clickable { selectedDate = date }
                                    .padding(vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale("es")).trimEnd('.'),
                                    color = if (selected) AppColors.Night else TimelineMuted,
                                    style = MaterialTheme.typography.labelSmall
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    date.dayOfMonth.toString(),
                                    color = when {
                                        selected -> AppColors.Night
                                        date > today -> AppColors.Dim
                                        else -> TimelineText
                                    },
                                    style = MoneyStyle,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(Modifier.height(4.dp))
                                Box(
                                    Modifier.size(4.dp).background(
                                        if (date == today && !selected) TimelinePrimary else Color.Transparent,
                                        CircleShape
                                    )
                                )
                            }
                        }
                    }
                }

                item {
                    GroupedPanel {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 18.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(Modifier.size(72.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(
                                    progress = { 1f },
                                    modifier = Modifier.fillMaxSize(),
                                    color = AppColors.PanelHigh,
                                    strokeWidth = 6.dp
                                )
                                CircularProgressIndicator(
                                    progress = { progress },
                                    modifier = Modifier.fillMaxSize(),
                                    color = if (progress >= 1f) AppColors.Lime else TimelinePrimary,
                                    strokeWidth = 6.dp,
                                    trackColor = Color.Transparent,
                                    strokeCap = StrokeCap.Round
                                )
                                Text("${(progress * 100).toInt()}%", color = TimelineText, style = MoneyStyle, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Column(Modifier.padding(start = 18.dp).weight(1f)) {
                                Text(
                                    when {
                                        habits.isEmpty() -> "Sin hábitos para este día"
                                        progress >= 1f -> "Día completo"
                                        completed == 0 -> "Empieza por uno"
                                        else -> "Vas bien"
                                    },
                                    color = TimelineText,
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Spacer(Modifier.height(2.dp))
                                Text("$completed de ${habits.size} completados", color = TimelineMuted, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("ALL" to "Todos", "MORNING" to "Mañana", "AFTERNOON" to "Tarde", "EVENING" to "Noche").forEach { (value, label) ->
                            val selected = selectedBlock == value
                            Text(
                                label,
                                Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(if (selected) TimelineText else Color.Transparent)
                                    .border(1.dp, if (selected) TimelineText else AppColors.Hairline, RoundedCornerShape(50))
                                    .clickable { selectedBlock = value }
                                    .padding(horizontal = 14.dp, vertical = 7.dp),
                                color = if (selected) AppColors.Night else TimelineMuted,
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }
                }

                if (visibleHabits.isEmpty()) {
                    item {
                        GroupedPanel { EmptyRow("No hay hábitos en este bloque. Toca + para crear uno.") }
                    }
                }

                if (visibleHabits.isNotEmpty()) item {
                GroupedPanel {
                visibleHabits.forEachIndexed { index, habit ->
                    val done = habit.id in completedIds
                    val accent = habitAccent(habit.colorHex)
                    key(habit.id) {
                        if (index > 0) PanelDivider(startIndent = 70.dp)
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable { editor = habit }
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                Modifier.size(42.dp).background(accent.copy(alpha = if (done) 0.10f else 0.20f), RoundedCornerShape(14.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(HabitIcons.resolve(habit.iconIdentifier), fontSize = 21.sp)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    habit.name,
                                    color = if (done) TimelineMuted else TimelineText,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.SemiBold,
                                    textDecoration = if (done) TextDecoration.LineThrough else null,
                                    maxLines = 1
                                )
                                Text(
                                    "${blockLabel(habit.dayBlock)} · ${habit.targetDurationMinutes} min · ${frequencyLabel(habit.frequencyType)}",
                                    color = TimelineMuted,
                                    style = MaterialTheme.typography.bodySmall,
                                    maxLines = 1
                                )
                            }
                            Spacer(Modifier.width(10.dp))
                            CheckCircle(
                                checked = done,
                                accent = AppColors.Lime,
                                onClick = {
                                    scope.launch {
                                        completedIds = if (done) completedIds - habit.id else completedIds + habit.id
                                        runCatching {
                                            if (done) repo.removeHabitLog(habit.id, selectedDate)
                                            else repo.toggleHabitLog(habit.id, selectedDate)
                                        }.onSuccess {
                                            load()
                                        }.onFailure {
                                            completedIds = if (done) completedIds + habit.id else completedIds - habit.id
                                            Toast.makeText(context, "No se pudo guardar el cambio", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            )
                        }
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
                    runCatching { repo.createHabit(draft) }
                        .onSuccess {
                            showCreate = false
                            Toast.makeText(context, "Hábito creado", Toast.LENGTH_SHORT).show()
                            load()
                        }
                        .onFailure { Toast.makeText(context, "No se pudo crear el hábito", Toast.LENGTH_SHORT).show() }
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
                targetCompletionsPerPeriod = habit.targetCompletionsPerPeriod,
                targetDurationMinutes = habit.targetDurationMinutes,
                sortOrder = habit.sortOrder,
                isActive = habit.isActive
            ),
            onDismiss = { editor = null },
            onSave = { draft ->
                scope.launch {
                    runCatching { repo.updateHabit(habit.id, draft) }
                        .onSuccess {
                            editor = null
                            Toast.makeText(context, "Hábito actualizado", Toast.LENGTH_SHORT).show()
                            load()
                        }
                        .onFailure { Toast.makeText(context, "No se pudo actualizar el hábito", Toast.LENGTH_SHORT).show() }
                }
            }
        )
    }
}

private fun habitAccent(colorHex: String?): Color =
    colorHex?.let { runCatching { Color(android.graphics.Color.parseColor(it)) }.getOrNull() } ?: TimelinePrimary

private fun blockLabel(block: String) = when (block) { "MORNING" -> "Mañana"; "AFTERNOON" -> "Tarde"; "EVENING" -> "Noche"; else -> "En cualquier momento" }
private fun frequencyLabel(value: String) = when (value) { "DAILY" -> "Diario"; "WEEKDAYS" -> "Lunes a viernes"; "WEEKLY" -> "Semanal"; "MONTHLY" -> "Mensual"; else -> "Personalizado" }
private fun frequencyOptionLabel(value: String) = when (value) { "DAILY" -> "Diario · se completa cada día"; "WEEKDAYS" -> "Laborables · lunes a viernes"; "WEEKLY" -> "Semanal · meta configurable"; "MONTHLY" -> "Mensual · meta configurable"; else -> "Custom · días específicos" }

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
    var selectedTemplate by remember { mutableStateOf<HabitTemplateRow?>(null) }
    var name by remember { mutableStateOf(initial.name) }
    var block by remember { mutableStateOf(initial.dayBlock) }
    var frequency by remember { mutableStateOf(initial.frequencyType) }
    var minutes by remember { mutableIntStateOf(initial.targetDurationMinutes) }
    var periodTarget by remember { mutableIntStateOf(initial.targetCompletionsPerPeriod) }
    var customDaysMask by remember { mutableIntStateOf(initial.customDaysMask) }
    var isActive by remember { mutableStateOf(initial.isActive) }
    var selectedColor by remember { mutableStateOf(initial.colorHex ?: "#00D9FF") }
    var iconIdentifier by remember { mutableStateOf(initial.iconIdentifier ?: "focus") }
    val colors = listOf("#00D9FF", "#39FF14", "#7A5CFF", "#FF70C7", "#FFB84D", "#51E1C2", "#FF5C5C", "#4D8BFF", "#FFE14D", "#B07CFF")

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = AppColors.Night) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 28.dp, bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Cerrar", tint = TimelineText) }
                        Text(title, Modifier.weight(1f), color = TimelineText, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                        TextButton(enabled = name.isNotBlank(), onClick = {
                            onSave(
                                initial.copy(
                                    templateId = selectedTemplate?.id ?: initial.templateId,
                                    name = name.trim(),
                                    iconIdentifier = iconIdentifier,
                                    colorHex = selectedColor,
                                    dayBlock = block,
                                    frequencyType = frequency,
                                    customDaysMask = customDaysMask,
                                    targetCompletionsPerPeriod = periodTarget,
                                    targetDurationMinutes = minutes,
                                    isActive = isActive
                                )
                            )
                        }) { Text(if (initial.name.isBlank()) "Crear" else "Guardar", color = if (name.isBlank()) TimelineMuted else TimelinePrimary, fontWeight = FontWeight.Bold) }
                    }
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(if (initial.name.isBlank()) "NUEVO HÁBITO" else "EDITAR HÁBITO", color = TimelinePrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(if (initial.name.isBlank()) "Crea una rutina" else "Actualiza la rutina", color = TimelineText, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                        Text("También puedes crear hábitos semanales o mensuales para mantenerlos visibles hasta completarlos dentro del periodo.", color = TimelineMuted, fontSize = 14.sp)
                    }
                }

                item {
                    HabitSelectField(
                        label = "Plantilla",
                        value = selectedTemplate?.let { "${it.category} · ${it.name}" } ?: "Custom",
                        options = listOf("" to "Custom") + templates.map { it.id.toString() to "${it.category} · ${it.name}" },
                        onSelect = { id ->
                            selectedTemplate = templates.firstOrNull { it.id.toString() == id }
                            selectedTemplate?.let {
                                name = it.name; minutes = it.defaultDurationMinutes
                                iconIdentifier = it.iconIdentifier ?: iconIdentifier
                                selectedColor = it.colorHex ?: selectedColor
                            }
                        }
                    )
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        HabitTextField("Nombre", name, Modifier.weight(1f), onValueChange = { if (it.length <= 50) name = it })
                        HabitSelectField("Bloque", blockLabel(block), listOf("MORNING" to "Mañana", "AFTERNOON" to "Tarde", "EVENING" to "Noche"), Modifier.weight(1f)) { block = it }
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                        HabitSelectField(
                            "Frecuencia", frequencyOptionLabel(frequency),
                            listOf("DAILY" to "Diario", "WEEKDAYS" to "Laborables", "WEEKLY" to "Semanal · meta configurable", "MONTHLY" to "Mensual · meta configurable", "CUSTOM" to "Custom"),
                            Modifier.weight(1f)
                        ) { frequency = it; if (it != "WEEKLY" && it != "MONTHLY") periodTarget = 1 }
                        if (frequency == "WEEKLY" || frequency == "MONTHLY") {
                            HabitNumberField("Meta del periodo", periodTarget, Modifier.weight(1f)) {
                                periodTarget = it.coerceIn(1, if (frequency == "WEEKLY") 7 else 31)
                            }
                        } else Spacer(Modifier.weight(1f))
                    }
                }

                if (frequency == "CUSTOM") item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Días específicos", color = TimelineMuted, fontSize = 12.sp)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            listOf("L", "M", "X", "J", "V", "S", "D").forEachIndexed { index, day ->
                                val selected = ((customDaysMask shr index) and 1) == 1
                                Box(
                                    Modifier.size(38.dp).clickable { customDaysMask = customDaysMask xor (1 shl index) }
                                        .background(if (selected) AppColors.Violet else TimelineSurface, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) { Text(day, color = TimelineText, fontWeight = FontWeight.Bold) }
                            }
                        }
                    }
                }

                item {
                    HabitNumberField("Duración objetivo (min)", minutes, Modifier.fillMaxWidth()) { minutes = it.coerceAtLeast(1) }
                }

                item {
                    HabitIconPicker(
                        selectedId = iconIdentifier,
                        accent = runCatching { Color(android.graphics.Color.parseColor(selectedColor)) }.getOrDefault(TimelinePrimary),
                        onSelect = { iconIdentifier = it }
                    )
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        Text("Color", color = TimelineMuted, fontSize = 12.sp)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(colors) { hex ->
                                val selected = selectedColor.equals(hex, true)
                                Box(
                                    Modifier.size(44.dp).clickable { selectedColor = hex }
                                        .background(Color(android.graphics.Color.parseColor(hex)), CircleShape)
                                        .border(if (selected) 4.dp else 1.dp, if (selected) TimelineText else Color.Transparent, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) { if (selected) Icon(Icons.Default.Check, null, tint = AppColors.Night) }
                            }
                        }
                    }
                }

                item { HabitCompletionGuide(frequency, periodTarget) }

                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Switch(checked = isActive, onCheckedChange = { isActive = it })
                        Text("Activo", Modifier.padding(start = 10.dp), color = TimelineText)
                    }
                }
            }
        }
    }
}

@Composable
private fun HabitIconPicker(selectedId: String, accent: Color, onSelect: (String) -> Unit) {
    val initialCategory = remember {
        HabitIcons.categories.indexOfFirst { cat -> cat.icons.any { it.id == selectedId } }.coerceAtLeast(0)
    }
    var categoryIndex by remember { mutableIntStateOf(initialCategory) }
    val isCustom = HabitIcons.categories.none { cat -> cat.icons.any { it.id == selectedId } }
    var customEmoji by remember { mutableStateOf(if (isCustom) selectedId else "") }
    val category = HabitIcons.categories[categoryIndex]

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Icono", Modifier.weight(1f), color = TimelineMuted, fontSize = 12.sp)
            Box(
                Modifier.size(44.dp).background(accent.copy(alpha = 0.22f), RoundedCornerShape(14.dp))
                    .border(1.dp, accent, RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) { Text(HabitIcons.resolve(selectedId), fontSize = 22.sp) }
        }
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(HabitIcons.categories.size) { index ->
                val selected = index == categoryIndex
                Text(
                    HabitIcons.categories[index].name,
                    Modifier
                        .background(if (selected) TimelinePrimary else TimelineSurface, RoundedCornerShape(20.dp))
                        .clickable { categoryIndex = index }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    color = if (selected) AppColors.Night else TimelineText,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
        Column(
            Modifier.fillMaxWidth().background(AppColors.Panel, RoundedCornerShape(20.dp)).padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            category.icons.chunked(5).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { icon ->
                        val selected = icon.id == selectedId
                        Column(
                            Modifier
                                .weight(1f)
                                .background(if (selected) accent.copy(alpha = 0.25f) else Color.Transparent, RoundedCornerShape(14.dp))
                                .border(if (selected) 2.dp else 1.dp, if (selected) accent else TimelineSurface, RoundedCornerShape(14.dp))
                                .clickable { onSelect(icon.id); customEmoji = "" }
                                .padding(vertical = 8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(icon.emoji, fontSize = 24.sp)
                            Text(icon.label, color = if (selected) TimelineText else TimelineMuted, fontSize = 9.sp, maxLines = 1)
                        }
                    }
                    repeat(5 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
        HabitTextField(
            "O escribe tu propio emoji",
            customEmoji,
            Modifier.fillMaxWidth(),
            onValueChange = { value ->
                val trimmed = value.trim()
                if (trimmed.length <= 16) {
                    customEmoji = trimmed
                    if (trimmed.isNotEmpty()) onSelect(trimmed)
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HabitSelectField(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    modifier: Modifier = Modifier,
    onSelect: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    Column(modifier) {
        Text(label, color = TimelineMuted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 6.dp))
        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
            OutlinedTextField(
                value = value,
                onValueChange = {},
                readOnly = true,
                modifier = Modifier.menuAnchor().fillMaxWidth(),
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                singleLine = true,
                shape = RoundedCornerShape(8.dp)
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { (key, text) ->
                    DropdownMenuItem(text = { Text(text) }, onClick = { onSelect(key); expanded = false })
                }
            }
        }
    }
}

@Composable
private fun HabitTextField(label: String, value: String, modifier: Modifier = Modifier, onValueChange: (String) -> Unit) {
    Column(modifier) {
        Text(label, color = TimelineMuted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 6.dp))
        OutlinedTextField(value = value, onValueChange = onValueChange, modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(8.dp))
    }
}

@Composable
private fun HabitNumberField(label: String, value: Int, modifier: Modifier = Modifier, onValueChange: (Int) -> Unit) {
    Column(modifier) {
        Text(label, color = TimelineMuted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 6.dp))
        OutlinedTextField(
            value = value.toString(),
            onValueChange = { raw -> raw.toIntOrNull()?.let(onValueChange) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(8.dp)
        )
    }
}

@Composable
private fun HabitCompletionGuide(frequency: String, target: Int) {
    val chip = when (frequency) { "WEEKLY" -> "VENTANA SEMANAL"; "MONTHLY" -> "VENTANA MENSUAL"; "WEEKDAYS" -> "LUN A VIE"; "CUSTOM" -> "DÍAS ELEGIDOS"; else -> "RESET DIARIO" }
    val title = when (frequency) {
        "WEEKLY" -> "Debes completarlo $target veces por semana"
        "MONTHLY" -> "Debes completarlo $target veces por mes"
        "WEEKDAYS" -> "Debes completarlo cada día laborable"
        "CUSTOM" -> "Debes completarlo solo en los días elegidos"
        else -> "Debes completarlo hoy"
    }
    val description = when (frequency) {
        "WEEKLY" -> "Sigue visible cada día hasta llegar a $target/$target. Después queda resuelto por el resto de la semana."
        "MONTHLY" -> "Sigue visible hasta llegar a $target/$target dentro del mes actual."
        "WEEKDAYS" -> "Se evalúa por separado de lunes a viernes."
        "CUSTOM" -> "Solo aparece en los días marcados en el selector semanal."
        else -> "Se reinicia al comenzar un nuevo día."
    }
    Column(
        Modifier.fillMaxWidth().background(AppColors.Panel, RoundedCornerShape(20.dp)).border(1.dp, AppColors.Cyan.copy(alpha = .35f), RoundedCornerShape(20.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(9.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("TIPO DE COMPLETITUD", Modifier.weight(1f), color = TimelinePrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Text(chip, Modifier.background(Color(0xFF164467), RoundedCornerShape(20.dp)).padding(horizontal = 10.dp, vertical = 6.dp), color = TimelineText, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
        Text(title, color = TimelineText, fontWeight = FontWeight.Bold)
        Text(description, color = TimelineMuted, fontSize = 14.sp)
    }
}
