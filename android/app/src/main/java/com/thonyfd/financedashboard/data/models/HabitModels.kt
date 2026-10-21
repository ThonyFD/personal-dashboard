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

data class HabitsWidgetItem(
    val id: Long,
    val name: String,
    val icon: String,
    val colorHex: String?,
    val completed: Boolean
)
