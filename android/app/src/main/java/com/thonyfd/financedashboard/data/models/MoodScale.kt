package com.thonyfd.financedashboard.data.models

/** Escala de mood compartida entre app y widget. */
object MoodScale {
    val scores = 1..5

    fun emoji(score: Int): String = when (score) {
        1 -> "😵"
        2 -> "😕"
        3 -> "😐"
        4 -> "🙂"
        else -> "🤩"
    }

    fun label(score: Int): String = when (score) {
        1 -> "Mal"
        2 -> "Bajo"
        3 -> "Normal"
        4 -> "Bien"
        else -> "Genial"
    }
}
