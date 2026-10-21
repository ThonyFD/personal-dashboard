package com.thonyfd.financedashboard.widget

import android.content.Context
import androidx.glance.appwidget.updateAll

enum class WidgetKind(val preferenceKey: String) {
    FINANCE("finance_opacity"),
    PAYMENTS("payments_opacity"),
    HABITS("habits_opacity")
}

object WidgetAppearancePreferences {
    private const val PREFS_NAME = "widget_appearance"
    const val DEFAULT_OPACITY = 0.94f
    const val MIN_OPACITY = 0.20f

    fun getOpacity(context: Context, kind: WidgetKind): Float =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getFloat(kind.preferenceKey, DEFAULT_OPACITY)
            .coerceIn(MIN_OPACITY, 1f)

    fun setOpacity(context: Context, kind: WidgetKind, opacity: Float) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putFloat(kind.preferenceKey, opacity.coerceIn(MIN_OPACITY, 1f))
            .apply()
    }

    suspend fun refreshAll(context: Context) {
        FinanceWidget().updateAll(context)
        PaymentsWidget().updateAll(context)
        HabitsWidget().updateAll(context)
    }
}
