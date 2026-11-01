package com.thonyfd.financedashboard.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class HabitTemplateRow(
    val id: Long,
    val name: String,
    val category: String,
    @SerialName("default_duration_minutes") val defaultDurationMinutes: Int,
    @SerialName("icon_identifier") val iconIdentifier: String? = null,
    @SerialName("color_hex") val colorHex: String? = null
)

@Serializable
data class UserHabitRow(
    val id: Long,
    @SerialName("template_id") val templateId: Long? = null,
    val name: String,
    @SerialName("icon_identifier") val iconIdentifier: String? = null,
    @SerialName("color_hex") val colorHex: String? = null,
    @SerialName("day_block") val dayBlock: String,
    @SerialName("frequency_type") val frequencyType: String,
    @SerialName("custom_days_mask") val customDaysMask: Int = 127,
    @SerialName("target_completions_per_period") val targetCompletionsPerPeriod: Int = 1,
    @SerialName("target_duration_minutes") val targetDurationMinutes: Int = 5,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("is_active") val isActive: Boolean = true
)

@Serializable
data class HabitLogRow(
    val id: Long,
    @SerialName("user_habit_id") val userHabitId: Long,
    @SerialName("log_date") val logDate: String,
    val status: String,
    @SerialName("actual_duration_minutes") val actualDurationMinutes: Int = 0
)

@Serializable
data class HabitDailyCompletionRow(
    @SerialName("log_date") val logDate: String,
    @SerialName("completed_count") val completedCount: Int? = 0,
    @SerialName("logged_count") val loggedCount: Int? = 0
)

@Serializable
data class UserHabitInsert(
    @SerialName("template_id") val templateId: Long? = null,
    val name: String,
    @SerialName("icon_identifier") val iconIdentifier: String? = null,
    @SerialName("color_hex") val colorHex: String? = null,
    @SerialName("day_block") val dayBlock: String,
    @SerialName("frequency_type") val frequencyType: String,
    @SerialName("custom_days_mask") val customDaysMask: Int = 127,
    @SerialName("target_completions_per_period") val targetCompletionsPerPeriod: Int = 1,
    @SerialName("target_duration_minutes") val targetDurationMinutes: Int,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("is_active") val isActive: Boolean = true
)

@Serializable
data class HabitLogInsert(
    @SerialName("user_habit_id") val userHabitId: Long,
    @SerialName("log_date") val logDate: String,
    val status: String,
    @SerialName("actual_duration_minutes") val actualDurationMinutes: Int = 0
)

@Serializable
data class HabitLogUpdate(
    val status: String,
    @SerialName("actual_duration_minutes") val actualDurationMinutes: Int = 0
)

/** Nivel de racha de un día según el porcentaje de hábitos completados. */
enum class StreakLevel(val label: String, val emoji: String, val colorHex: Long) {
    BRONZE("Bronce", "🥉", 0xFFCD8A4E),
    SILVER("Plata", "🥈", 0xFFC9D3E0),
    GOLD("Oro", "🥇", 0xFFFFC94D);

    companion object {
        const val BRONZE_RATIO = 0.5f
        const val SILVER_RATIO = 0.75f

        fun of(completed: Int, due: Int): StreakLevel? {
            if (due <= 0) return null
            val ratio = completed.toFloat() / due
            return when {
                completed >= due -> GOLD
                ratio >= SILVER_RATIO -> SILVER
                ratio >= BRONZE_RATIO -> BRONZE
                else -> null
            }
        }
    }
}

data class HabitDaySummary(val due: Int, val completed: Int) {
    val level: StreakLevel? get() = StreakLevel.of(completed, due)
}

/** Hábitos visibles en una fecha y, para los semanales/mensuales, cuántas veces se completaron en el periodo. */
data class DayHabits(
    val habits: List<UserHabitRow>,
    val periodDone: Map<Long, Int>
)

data class HabitsWidgetItem(
    val id: Long,
    val name: String,
    val icon: String,
    val colorHex: String?,
    val completed: Boolean
)
