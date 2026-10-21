package com.thonyfd.financedashboard.data.repository

import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.models.HabitDailyCompletionRow
import com.thonyfd.financedashboard.data.models.HabitIcons
import com.thonyfd.financedashboard.data.models.HabitLogInsert
import com.thonyfd.financedashboard.data.models.HabitLogRow
import com.thonyfd.financedashboard.data.models.HabitLogUpdate
import com.thonyfd.financedashboard.data.models.HabitTemplateRow
import com.thonyfd.financedashboard.data.models.HabitsWidgetItem
import com.thonyfd.financedashboard.data.models.UserHabitInsert
import com.thonyfd.financedashboard.data.models.UserHabitRow
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import java.time.LocalDate

class HabitRepository {

    private val supabase = SupabaseConfig.client

    suspend fun getHabitTemplates(): List<HabitTemplateRow> =
        supabase.from("habit_templates")
            .select {
                order("category", Order.ASCENDING)
                order("name", Order.ASCENDING)
            }
            .decodeList<HabitTemplateRow>()

    suspend fun getAllHabits(activeOnly: Boolean? = null): List<UserHabitRow> {
        val rows = supabase.from("user_habits")
            .select {
                filter {
                    if (activeOnly != null) {
                        eq("is_active", activeOnly)
                    }
                }
                order("day_block", Order.ASCENDING)
                order("sort_order", Order.ASCENDING)
            }
            .decodeList<UserHabitRow>()

        return rows.sortedWith(compareBy({ dayBlockOrder(it.dayBlock) }, { it.sortOrder }, { it.name }))
    }

    suspend fun getHabitsForToday(date: LocalDate = LocalDate.now()): List<UserHabitRow> {
        val habits = getAllHabits(activeOnly = true)
        val periodHabits = habits.filter { it.frequencyType == "WEEKLY" || it.frequencyType == "MONTHLY" }
        if (periodHabits.isEmpty()) return habits.filter { isHabitDueOnDate(it, date) }

        val monthStart = date.withDayOfMonth(1)
        val weekStart = date.minusDays((date.dayOfWeek.value - 1).toLong())
        val logs = getLogsInRange(monthStart.coerceAtMost(weekStart), date)
            .filter { it.status == "COMPLETED" }

        return habits.filter { habit ->
            when (habit.frequencyType) {
                "WEEKLY" -> logs.count { it.userHabitId == habit.id && LocalDate.parse(it.logDate) >= weekStart } < habit.targetCompletionsPerPeriod
                "MONTHLY" -> logs.count { it.userHabitId == habit.id && LocalDate.parse(it.logDate) >= monthStart } < habit.targetCompletionsPerPeriod
                else -> isHabitDueOnDate(habit, date)
            }
        }
    }

    suspend fun getLogsForDate(date: LocalDate): List<HabitLogRow> =
        supabase.from("habit_logs")
            .select {
                filter { eq("log_date", date.toString()) }
                order("completed_at", Order.ASCENDING)
            }
            .decodeList<HabitLogRow>()

    suspend fun getLogsInRange(start: LocalDate, end: LocalDate): List<HabitLogRow> =
        supabase.from("habit_logs")
            .select {
                filter {
                    gte("log_date", start.toString())
                    lte("log_date", end.toString())
                }
                order("log_date", Order.DESCENDING)
            }
            .decodeList<HabitLogRow>()

    suspend fun getDailyCompletion(start: LocalDate, end: LocalDate): List<HabitDailyCompletionRow> =
        supabase.from("v_habit_daily_completion")
            .select {
                filter {
                    gte("log_date", start.toString())
                    lte("log_date", end.toString())
                }
                order("log_date", Order.ASCENDING)
            }
            .decodeList<HabitDailyCompletionRow>()

    suspend fun createHabit(habit: UserHabitInsert) {
        supabase.from("user_habits").insert(habit)
    }

    suspend fun updateHabit(id: Long, habit: UserHabitInsert) {
        supabase.from("user_habits")
            .update(habit) { filter { eq("id", id) } }
    }

    suspend fun deleteHabit(id: Long) {
        supabase.from("user_habits")
            .delete { filter { eq("id", id) } }
    }

    suspend fun removeHabitLog(habitId: Long, date: LocalDate) {
        supabase.from("habit_logs")
            .delete {
                filter {
                    eq("user_habit_id", habitId)
                    eq("log_date", date.toString())
                }
            }
    }

    suspend fun toggleHabitLog(
        habitId: Long,
        date: LocalDate,
        status: String = "COMPLETED",
        minutes: Int = 0
    ) {
        val existing = supabase.from("habit_logs")
            .select {
                filter {
                    eq("user_habit_id", habitId)
                    eq("log_date", date.toString())
                }
                limit(1)
            }
            .decodeList<HabitLogRow>()
            .firstOrNull()

        if (existing == null) {
            supabase.from("habit_logs").insert(
                HabitLogInsert(
                    userHabitId = habitId,
                    logDate = date.toString(),
                    status = status,
                    actualDurationMinutes = minutes
                )
            )
            return
        }

        supabase.from("habit_logs")
            .update(
                HabitLogUpdate(
                    status = status,
                    actualDurationMinutes = minutes
                )
            ) {
                filter { eq("id", existing.id) }
            }
    }

    suspend fun buildWidgetData(today: LocalDate = LocalDate.now()): HabitsWidgetDataBundle {
        val habits = getHabitsForToday(today)
        val logs = getLogsForDate(today)
        val logsByHabit = logs.associateBy { it.userHabitId }
        val streak = computeStreak(getAllHabits(activeOnly = true), getLogsInRange(today.minusDays(365), today), today)

        return HabitsWidgetDataBundle(
            date = today.toString(),
            lastUpdated = java.time.LocalTime.now().withSecond(0).withNano(0).toString(),
            streak = streak,
            completedCount = habits.count { logsByHabit[it.id]?.status == "COMPLETED" },
            dueCount = habits.size,
            items = habits.take(MAX_WIDGET_ITEMS).map { habit ->
                HabitsWidgetItem(
                    id = habit.id,
                    name = habit.name,
                    icon = HabitIcons.resolve(habit.iconIdentifier),
                    colorHex = habit.colorHex,
                    completed = logsByHabit[habit.id]?.status == "COMPLETED"
                )
            }
        )
    }

    fun isHabitDueOnDate(habit: UserHabitRow, date: LocalDate): Boolean {
        if (!habit.isActive) return false
        return when (habit.frequencyType) {
            "DAILY" -> true
            "WEEKDAYS" -> date.dayOfWeek.value <= 5
            "WEEKLY", "MONTHLY" -> true
            else -> ((habit.customDaysMask shr (date.dayOfWeek.value - 1)) and 1) == 1
        }
    }

    fun computeStreak(
        habits: List<UserHabitRow>,
        logs: List<HabitLogRow>,
        today: LocalDate
    ): Int {
        val activeHabits = habits.filter { it.isActive }
        if (activeHabits.isEmpty()) return 0

        val logsByDate = logs.groupBy { it.logDate }
            .mapValues { (_, rows) -> rows.associateBy { it.userHabitId } }

        var streak = 0
        var cursor = today
        repeat(3650) {
            val dueHabits = activeHabits.filter { isHabitDueOnDate(it, cursor) }
            if (dueHabits.isEmpty()) {
                cursor = cursor.minusDays(1)
                return@repeat
            }

            val logsForDay = logsByDate[cursor.toString()]
            val allCompleted = dueHabits.all { logsForDay?.get(it.id)?.status == "COMPLETED" }

            if (cursor == today && !allCompleted) {
                cursor = cursor.minusDays(1)
                return@repeat
            }

            if (!allCompleted) return streak

            streak += 1
            cursor = cursor.minusDays(1)
        }

        return streak
    }

    private companion object {
        const val MAX_WIDGET_ITEMS = 20
    }

    private fun dayBlockOrder(dayBlock: String): Int = when (dayBlock) {
        "MORNING" -> 0
        "AFTERNOON" -> 1
        "EVENING" -> 2
        else -> 99
    }
}

data class HabitsWidgetDataBundle(
    val date: String,
    val lastUpdated: String,
    val streak: Int,
    val completedCount: Int,
    val dueCount: Int,
    val items: List<HabitsWidgetItem>
)
