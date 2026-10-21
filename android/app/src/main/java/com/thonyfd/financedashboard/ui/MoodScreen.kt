package com.thonyfd.financedashboard.ui

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
import androidx.compose.ui.unit.dp
import com.thonyfd.financedashboard.data.models.MoodLogWithTags
import com.thonyfd.financedashboard.data.models.MoodTagRow
import com.thonyfd.financedashboard.data.repository.MoodRepository
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoodScreen(padding: PaddingValues = PaddingValues()) {
    val repo = remember { MoodRepository() }
    val scope = rememberCoroutineScope()
    val today = remember { LocalDate.now() }
    var isLoading by remember { mutableStateOf(true) }
    var tags by remember { mutableStateOf<List<MoodTagRow>>(emptyList()) }
    var history by remember { mutableStateOf<List<MoodLogWithTags>>(emptyList()) }
    var score by remember { mutableIntStateOf(3) }
    var journal by remember { mutableStateOf("") }
    val selectedTags = remember { mutableStateListOf<Long>() }

    fun load() {
        scope.launch {
            isLoading = true
            tags = repo.getMoodTags()
            history = repo.getMoodRange(today.minusDays(13), today)
            repo.getMoodForDate(today)?.let { mood ->
                score = mood.moodScore
                journal = mood.journalText.orEmpty()
                selectedTags.clear()
                selectedTags.addAll(mood.tagIds)
            }
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
            title = { Text("Mood", color = TimelineText) },
            actions = {
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
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Score de hoy", color = TimelinePrimary)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                (1..5).forEach { value ->
                                    FilterChip(
                                        selected = score == value,
                                        onClick = { score = value },
                                        label = { Text("${moodEmoji(value)} $value") }
                                    )
                                }
                            }
                            OutlinedTextField(
                                value = journal,
                                onValueChange = { if (it.length <= 280) journal = it },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 4,
                                label = { Text("Micro-journal") },
                                supportingText = { Text("${journal.length}/280") }
                            )
                            Text("Tags", color = TimelinePrimary)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                tags.forEach { tag ->
                                    FilterChip(
                                        selected = selectedTags.contains(tag.id),
                                        onClick = {
                                            if (selectedTags.contains(tag.id)) selectedTags.remove(tag.id)
                                            else selectedTags.add(tag.id)
                                        },
                                        label = { Text(tag.name) }
                                    )
                                }
                            }
                            Button(onClick = {
                                scope.launch {
                                    repo.upsertMood(today, score, journal.ifBlank { null }, selectedTags.toList())
                                    load()
                                }
                            }) {
                                Text("Guardar")
                            }
                        }
                    }
                }

                item { Text("Historial 14 días", color = TimelinePrimary) }

                items(history) { item ->
                    Card(colors = CardDefaults.cardColors(containerColor = TimelineSurface), shape = RoundedCornerShape(18.dp)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("${item.logDate} · ${moodEmoji(item.moodScore)} ${item.moodScore}", color = TimelineText)
                            if (!item.journalText.isNullOrBlank()) {
                                Text(item.journalText.orEmpty(), color = TimelineMuted)
                            }
                            if (item.tagIds.isNotEmpty()) {
                                Text(
                                    item.tagIds.mapNotNull { id -> tags.find { tag -> tag.id == id }?.name }.joinToString(" · "),
                                    color = TimelinePrimary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun moodEmoji(score: Int): String = when (score) {
    1 -> "😵"
    2 -> "😕"
    3 -> "😐"
    4 -> "🙂"
    else -> "🤩"
}
