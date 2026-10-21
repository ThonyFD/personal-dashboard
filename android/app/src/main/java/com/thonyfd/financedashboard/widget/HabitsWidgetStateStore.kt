package com.thonyfd.financedashboard.widget

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.thonyfd.financedashboard.data.models.HabitsWidgetItem
import com.thonyfd.financedashboard.data.repository.HabitsWidgetDataBundle
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.LocalDate

private val Context.habitsWidgetDataStore by preferencesDataStore(name = "habits_widget_state")

data class HabitsWidgetData(
    val date: String = "",
    val lastUpdated: String = "--:--",
    val streak: Int = 0,
    val completedCount: Int = 0,
    val dueCount: Int = 0,
    val items: List<HabitsWidgetItem> = emptyList(),
    val isError: Boolean = false,
    val isRefreshing: Boolean = false,
    val mood: MoodWidgetState = MoodWidgetState()
) {
    /** Sin datos o con datos de otro día: hay que pedirlos de nuevo. */
    val isStale: Boolean
        get() = lastUpdated == "--:--" || date != LocalDate.now().toString()
}

enum class MoodSaveStatus { IDLE, SAVING, SAVED, ERROR }

data class MoodWidgetState(
    val lastScore: Int? = null,
    val lastTime: String? = null,
    val countToday: Int = 0,
    val status: MoodSaveStatus = MoodSaveStatus.IDLE
)

object HabitsWidgetStateStore {
    private val DATE = stringPreferencesKey("date")
    private val LAST_UPDATED = stringPreferencesKey("last_updated")
    private val STREAK = intPreferencesKey("streak")
    private val COMPLETED = intPreferencesKey("completed")
    private val DUE = intPreferencesKey("due")
    private val ITEMS = stringPreferencesKey("items")
    private val IS_ERROR = stringPreferencesKey("is_error")
    private val IS_REFRESHING = booleanPreferencesKey("is_refreshing")
    private val MOOD_DATE = stringPreferencesKey("mood_date")
    private val MOOD_SCORE = intPreferencesKey("mood_score")
    private val MOOD_TIME = stringPreferencesKey("mood_time")
    private val MOOD_COUNT = intPreferencesKey("mood_count")
    private val MOOD_STATUS = stringPreferencesKey("mood_status")
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun setMoodStatus(context: Context, status: MoodSaveStatus) {
        context.habitsWidgetDataStore.edit { prefs -> prefs[MOOD_STATUS] = status.name }
    }

    /** Registra un mood guardado: último valor, hora y conteo del día (se reinicia al cambiar de día). */
    suspend fun recordMood(context: Context, score: Int, time: String) {
        val today = LocalDate.now().toString()
        context.habitsWidgetDataStore.edit { prefs ->
            val sameDay = prefs[MOOD_DATE] == today
            prefs[MOOD_DATE] = today
            prefs[MOOD_SCORE] = score
            prefs[MOOD_TIME] = time
            prefs[MOOD_COUNT] = (if (sameDay) prefs[MOOD_COUNT] ?: 0 else 0) + 1
            prefs[MOOD_STATUS] = MoodSaveStatus.SAVED.name
        }
    }

    suspend fun saveWidgetData(context: Context, data: HabitsWidgetDataBundle) {
        context.habitsWidgetDataStore.edit { prefs ->
            prefs[DATE] = data.date
            prefs[LAST_UPDATED] = data.lastUpdated
            prefs[STREAK] = data.streak
            prefs[COMPLETED] = data.completedCount
            prefs[DUE] = data.dueCount
            prefs[IS_ERROR] = "false"
            prefs[IS_REFRESHING] = false
            prefs[ITEMS] = json.encodeToString(data.items.map {
                listOf(it.id.toString(), it.name, it.icon, it.colorHex.orEmpty(), it.completed.toString())
            })
        }
    }

    fun observe(context: Context): Flow<HabitsWidgetData> =
        context.habitsWidgetDataStore.data.map(::toWidgetData)

    suspend fun loadWidgetData(context: Context): HabitsWidgetData = observe(context).first()

    suspend fun setError(context: Context) {
        context.habitsWidgetDataStore.edit { prefs ->
            prefs[IS_ERROR] = "true"
            prefs[IS_REFRESHING] = false
        }
    }

    suspend fun setRefreshing(context: Context, refreshing: Boolean) {
        context.habitsWidgetDataStore.edit { prefs -> prefs[IS_REFRESHING] = refreshing }
    }

    suspend fun invalidateCache(context: Context) {
        context.habitsWidgetDataStore.edit { prefs ->
            prefs[LAST_UPDATED] = "--:--"
        }
    }

    suspend fun setItemCompleted(context: Context, habitId: Long, completed: Boolean) {
        context.habitsWidgetDataStore.edit { prefs ->
            val items = runCatching {
                prefs[ITEMS]?.let { json.decodeFromString<List<List<String>>>(it) }
            }.getOrNull() ?: return@edit

            val updated = items.map { row ->
                if (row.firstOrNull()?.toLongOrNull() == habitId && row.size >= 5) {
                    row.toMutableList().also { it[4] = completed.toString() }
                } else {
                    row
                }
            }
            val wasCompleted = items.firstOrNull { it.firstOrNull()?.toLongOrNull() == habitId }
                ?.getOrNull(4)?.toBoolean() ?: return@edit
            prefs[ITEMS] = json.encodeToString(updated)
            // Ajusta el contador por delta: items puede ser un subconjunto de dueCount
            if (wasCompleted != completed) {
                val delta = if (completed) 1 else -1
                prefs[COMPLETED] = ((prefs[COMPLETED] ?: 0) + delta).coerceIn(0, prefs[DUE] ?: Int.MAX_VALUE)
            }
        }
    }

    private fun toMoodState(prefs: Preferences): MoodWidgetState {
        val isToday = prefs[MOOD_DATE] == LocalDate.now().toString()
        return MoodWidgetState(
            lastScore = if (isToday) prefs[MOOD_SCORE] else null,
            lastTime = if (isToday) prefs[MOOD_TIME] else null,
            countToday = if (isToday) prefs[MOOD_COUNT] ?: 0 else 0,
            status = runCatching { MoodSaveStatus.valueOf(prefs[MOOD_STATUS] ?: "IDLE") }.getOrDefault(MoodSaveStatus.IDLE)
        )
    }

    private fun toWidgetData(prefs: Preferences): HabitsWidgetData {
        val items = runCatching {
            prefs[ITEMS]?.let { raw ->
                json.decodeFromString<List<List<String>>>(raw).map { row ->
                    HabitsWidgetItem(
                        id = row[0].toLong(),
                        name = row[1],
                        icon = row[2],
                        colorHex = row[3].ifEmpty { null },
                        completed = row[4].toBoolean()
                    )
                }
            } ?: emptyList()
        }.getOrDefault(emptyList())

        return HabitsWidgetData(
            date = prefs[DATE] ?: "",
            lastUpdated = prefs[LAST_UPDATED] ?: "--:--",
            streak = prefs[STREAK] ?: 0,
            completedCount = prefs[COMPLETED] ?: 0,
            dueCount = prefs[DUE] ?: 0,
            items = items,
            isError = prefs[IS_ERROR] == "true",
            isRefreshing = prefs[IS_REFRESHING] ?: false,
            mood = toMoodState(prefs)
        )
    }
}
