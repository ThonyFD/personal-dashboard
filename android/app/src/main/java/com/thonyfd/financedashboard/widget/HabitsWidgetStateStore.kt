package com.thonyfd.financedashboard.widget

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.thonyfd.financedashboard.data.models.HabitsWidgetItem
import com.thonyfd.financedashboard.data.repository.HabitsWidgetDataBundle
import kotlinx.coroutines.flow.first
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.habitsWidgetDataStore by preferencesDataStore(name = "habits_widget_state")

data class HabitsWidgetData(
    val lastUpdated: String = "--:--",
    val streak: Int = 0,
    val completedCount: Int = 0,
    val dueCount: Int = 0,
    val items: List<HabitsWidgetItem> = emptyList(),
    val isError: Boolean = false
)

object HabitsWidgetStateStore {
    private val LAST_UPDATED = stringPreferencesKey("last_updated")
    private val STREAK = intPreferencesKey("streak")
    private val COMPLETED = intPreferencesKey("completed")
    private val DUE = intPreferencesKey("due")
    private val ITEMS = stringPreferencesKey("items")
    private val IS_ERROR = stringPreferencesKey("is_error")
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun saveWidgetData(context: Context, data: HabitsWidgetDataBundle) {
        context.habitsWidgetDataStore.edit { prefs ->
            prefs[LAST_UPDATED] = data.lastUpdated
            prefs[STREAK] = data.streak
            prefs[COMPLETED] = data.completedCount
            prefs[DUE] = data.dueCount
            prefs[IS_ERROR] = "false"
            prefs[ITEMS] = json.encodeToString(data.items.map {
                listOf(it.id.toString(), it.name, it.icon, it.colorHex.orEmpty(), it.completed.toString())
            })
        }
    }

    suspend fun loadWidgetData(context: Context): HabitsWidgetData {
        val prefs: Preferences = context.habitsWidgetDataStore.data.first()
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
            lastUpdated = prefs[LAST_UPDATED] ?: "--:--",
            streak = prefs[STREAK] ?: 0,
            completedCount = prefs[COMPLETED] ?: 0,
            dueCount = prefs[DUE] ?: 0,
            items = items,
            isError = prefs[IS_ERROR] == "true"
        )
    }

    suspend fun invalidateCache(context: Context) {
        context.habitsWidgetDataStore.edit { prefs ->
            prefs[LAST_UPDATED] = "--:--"
        }
    }
}
