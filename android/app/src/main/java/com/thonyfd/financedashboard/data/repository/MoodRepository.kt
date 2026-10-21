package com.thonyfd.financedashboard.data.repository

import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.models.MoodCheckinInsert
import com.thonyfd.financedashboard.data.models.MoodCheckinRow
import com.thonyfd.financedashboard.data.models.MoodLogInsert
import com.thonyfd.financedashboard.data.models.MoodLogRow
import com.thonyfd.financedashboard.data.models.MoodLogTagInsert
import com.thonyfd.financedashboard.data.models.MoodLogTagRow
import com.thonyfd.financedashboard.data.models.MoodLogUpdate
import com.thonyfd.financedashboard.data.models.MoodLogWithTags
import com.thonyfd.financedashboard.data.models.MoodTagRow
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import java.time.LocalDate
import java.time.ZoneId

class MoodRepository {

    private val supabase = SupabaseConfig.client

    suspend fun getMoodTags(): List<MoodTagRow> =
        supabase.from("mood_tags")
            .select {
                order("category", Order.ASCENDING)
                order("name", Order.ASCENDING)
            }
            .decodeList<MoodTagRow>()

    suspend fun getMoodForDate(date: LocalDate): MoodLogWithTags? {
        val row = supabase.from("mood_logs")
            .select {
                filter { eq("log_date", date.toString()) }
                limit(1)
            }
            .decodeList<MoodLogRow>()
            .firstOrNull() ?: return null

        return row.toDomain(fetchTagIds(listOf(row.id))[row.id].orEmpty())
    }

    suspend fun getMoodRange(start: LocalDate, end: LocalDate): List<MoodLogWithTags> {
        val rows = supabase.from("mood_logs")
            .select {
                filter {
                    gte("log_date", start.toString())
                    lte("log_date", end.toString())
                }
                order("log_date", Order.DESCENDING)
            }
            .decodeList<MoodLogRow>()

        val tagIds = fetchTagIds(rows.map { it.id })
        return rows.map { row -> row.toDomain(tagIds[row.id].orEmpty()) }
    }

    suspend fun upsertMood(
        date: LocalDate,
        score: Int,
        journalText: String?,
        tagIds: List<Long>
    ) {
        val existing = supabase.from("mood_logs")
            .select {
                filter { eq("log_date", date.toString()) }
                limit(1)
            }
            .decodeList<MoodLogRow>()
            .firstOrNull()

        val moodLogId = if (existing == null) {
            supabase.from("mood_logs")
                .insert(
                    MoodLogInsert(
                        logDate = date.toString(),
                        moodScore = score,
                        journalText = journalText
                    )
                )

            supabase.from("mood_logs")
                .select {
                    filter { eq("log_date", date.toString()) }
                    limit(1)
                }
                .decodeList<MoodLogRow>()
                .first()
                .id
        } else {
            supabase.from("mood_logs")
                .update(
                    MoodLogUpdate(
                        moodScore = score,
                        journalText = journalText
                    )
                ) {
                    filter { eq("id", existing.id) }
                }
            existing.id
        }

        supabase.from("mood_log_tags")
            .delete { filter { eq("mood_log_id", moodLogId) } }

        if (tagIds.isNotEmpty()) {
            supabase.from("mood_log_tags").insert(
                tagIds.map { tagId -> MoodLogTagInsert(moodLogId = moodLogId, tagId = tagId) }
            )
        }
    }

    suspend fun addCheckin(score: Int, source: String = "app", note: String? = null) {
        supabase.from("mood_checkins").insert(
            MoodCheckinInsert(moodScore = score.coerceIn(1, 5), note = note, source = source)
        )
    }

    /** Registros entre dos fechas locales (inclusive), en orden cronológico. */
    suspend fun getCheckins(start: LocalDate, end: LocalDate = start): List<MoodCheckinRow> {
        val zone = ZoneId.systemDefault()
        val from = start.atStartOfDay(zone).toOffsetDateTime().toString()
        val to = end.plusDays(1).atStartOfDay(zone).toOffsetDateTime().toString()
        return supabase.from("mood_checkins")
            .select {
                filter {
                    gte("checked_at", from)
                    lt("checked_at", to)
                }
                order("checked_at", Order.ASCENDING)
            }
            .decodeList<MoodCheckinRow>()
    }

    private suspend fun fetchTagIds(moodLogIds: List<Long>): Map<Long, List<Long>> {
        if (moodLogIds.isEmpty()) return emptyMap()

        val rows = supabase.from("mood_log_tags")
            .select()
            .decodeList<MoodLogTagRow>()
            .filter { it.moodLogId in moodLogIds }

        return rows.groupBy { it.moodLogId }.mapValues { (_, values) -> values.map { it.tagId } }
    }

    private fun MoodLogRow.toDomain(tagIds: List<Long>): MoodLogWithTags =
        MoodLogWithTags(
            id = id,
            logDate = logDate,
            moodScore = moodScore,
            journalText = journalText,
            tagIds = tagIds
        )
}
