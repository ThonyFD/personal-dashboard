package com.thonyfd.financedashboard.data.repository

import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.models.DayHabits
import com.thonyfd.financedashboard.data.models.HabitDailyCompletionRow
import com.thonyfd.financedashboard.data.models.HabitDaySummary
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

    suspend fun getHabitsForToday(date: LocalDate = LocalDate.now()): List<UserHabitRow> =
        getDayHabits(date).habits

    suspend fun getDayHabits(date: LocalDate = LocalDate.now()): DayHabits {
        val habits = getAllHabits(activeOnly = true)
        val completedDates = completedDatesByHabit(getLogsInRange(periodWindowStart(date), date))
        val visible = dueHabitsOn(habits, completedDates, date)
        val periodDone = visible.mapNotNull { habit ->
            periodStart(habit, date)?.let { start ->
                habit.id to completedDates[habit.id].orEmpty().count { it in start..date }
            }
        }.toMap()
        return DayHabits(visible, periodDone)
    }

    /** Resumen (debidos/completados y nivel) de cada día entre hoy-[days] y hoy. */
    suspend fun getDaySummaries(today: LocalDate = LocalDate.now(), days: Long = HISTORY_DAYS): Map<LocalDate, HabitDaySummary> {
        val from = today.minusDays(days)
        return summarizeDays(getAllHabits(activeOnly = true), getLogsInRange(periodWindowStart(from), today), from, today)
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
        val streak = streakFrom(getDaySummaries(today), today)

        return HabitsWidgetDataBundle(
            date = today.toString(),
            lastUpdated = java.time.LocalTime.now().withSecond(0).withNano(0).toString(),
            streak = streak,
            completedCount = habits.count { logsByHabit[it.id]?.status == "COMPLETED" },
            dueCount = habits.size,
            items = habits
                .pendingFirst { logsByHabit[it.id]?.status == "COMPLETED" }
                .take(MAX_WIDGET_ITEMS)
                .map { habit ->
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
    ): Int = streakFrom(summarizeDays(habits, logs, today.minusDays(HISTORY_DAYS), today), today)

    /**
     * Días seguidos con al menos nivel Bronce. Los días sin hábitos debidos no rompen la racha
     * y hoy solo suma si ya alcanzó un nivel (sigue en curso).
     */
    fun streakFrom(summaries: Map<LocalDate, HabitDaySummary>, today: LocalDate): Int {
        val first = summaries.keys.minOrNull() ?: return 0
        var streak = 0
        var cursor = today
        while (cursor >= first) {
            val day = summaries[cursor]
            when {
                day == null || day.due == 0 -> Unit
                day.level != null -> streak += 1
                cursor != today -> return streak
            }
            cursor = cursor.minusDays(1)
        }
        return streak
    }

    fun summarizeDays(
        habits: List<UserHabitRow>,
        logs: List<HabitLogRow>,
        from: LocalDate,
        to: LocalDate
    ): Map<LocalDate, HabitDaySummary> {
        val active = habits.filter { it.isActive }
        val completedDates = completedDatesByHabit(logs)
        return generateSequence(from) { it.plusDays(1) }
            .takeWhile { it <= to }
            .associateWith { date ->
                val due = dueHabitsOn(active, completedDates, date)
                HabitDaySummary(due = due.size, completed = due.count { date in completedDates[it.id].orEmpty() })
            }
    }

    /** Semanales/mensuales siguen debidos mientras no se haya llegado a la meta antes de ese día. */
    private fun dueHabitsOn(
        habits: List<UserHabitRow>,
        completedDates: Map<Long, Set<LocalDate>>,
        date: LocalDate
    ): List<UserHabitRow> = habits.filter { habit ->
        val start = periodStart(habit, date) ?: return@filter isHabitDueOnDate(habit, date)
        habit.isActive && completedDates[habit.id].orEmpty().count { it >= start && it < date } < habit.targetCompletionsPerPeriod
    }

    private fun completedDatesByHabit(logs: List<HabitLogRow>): Map<Long, Set<LocalDate>> =
        logs.filter { it.status == "COMPLETED" }
            .groupBy({ it.userHabitId }, { LocalDate.parse(it.logDate) })
            .mapValues { (_, dates) -> dates.toSet() }

    private fun periodStart(habit: UserHabitRow, date: LocalDate): LocalDate? = when (habit.frequencyType) {
        "WEEKLY" -> date.minusDays(date.dayOfWeek.value - 1L)
        "MONTHLY" -> date.withDayOfMonth(1)
        else -> null
    }

    /** Primer día cuyos logs hacen falta para contar el periodo semanal y mensual de [date]. */
    private fun periodWindowStart(date: LocalDate): LocalDate =
        date.withDayOfMonth(1).coerceAtMost(date.minusDays(date.dayOfWeek.value - 1L))

    private companion object {
        const val MAX_WIDGET_ITEMS = 20
        const val HISTORY_DAYS = 365L
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
