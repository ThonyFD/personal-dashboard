package com.thonyfd.financedashboard.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MoodLogRow(
    val id: Long,
    @SerialName("log_date") val logDate: String,
    @SerialName("mood_score") val moodScore: Int,
    @SerialName("journal_text") val journalText: String? = null
)

@Serializable
data class MoodTagRow(
    val id: Long,
    val name: String,
    val category: String? = null
)

@Serializable
data class MoodLogTagRow(
    @SerialName("mood_log_id") val moodLogId: Long,
    @SerialName("tag_id") val tagId: Long
)

@Serializable
data class MoodLogInsert(
    @SerialName("log_date") val logDate: String,
    @SerialName("mood_score") val moodScore: Int,
    @SerialName("journal_text") val journalText: String? = null
)

@Serializable
data class MoodLogUpdate(
    @SerialName("mood_score") val moodScore: Int,
    @SerialName("journal_text") val journalText: String? = null
)

@Serializable
data class MoodLogTagInsert(
    @SerialName("mood_log_id") val moodLogId: Long,
    @SerialName("tag_id") val tagId: Long
)

data class MoodLogWithTags(
    val id: Long,
    val logDate: String,
    val moodScore: Int,
    val journalText: String?,
    val tagIds: List<Long>
)

@Serializable
data class MoodCheckinRow(
    val id: Long,
    @SerialName("checked_at") val checkedAt: String,
    @SerialName("mood_score") val moodScore: Int,
    val note: String? = null,
    val source: String = "app"
)

@Serializable
data class MoodCheckinInsert(
    @SerialName("mood_score") val moodScore: Int,
    val note: String? = null,
    val source: String = "app"
)
