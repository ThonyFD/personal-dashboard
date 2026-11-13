package com.thonyfd.financedashboard.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import com.thonyfd.financedashboard.ui.theme.Skin
import com.thonyfd.financedashboard.ui.theme.ThemeMode

enum class WidgetKind(
    val preferenceKey: String,
    val skinKey: String,
    val modeKey: String,
    val label: String,
    val ownerOnly: Boolean
) {
    FINANCE("finance_opacity", "finance_skin", "finance_mode", "Dashboard financiero", true),
    PAYMENTS("payments_opacity", "payments_skin", "payments_mode", "Pagos próximos", true),
    HABITS("habits_opacity", "habits_skin", "habits_mode", "Hábitos de hoy", false)
}

/** Widgets que la cuenta puede ver en el dialogo de apariencia. */
fun visibleWidgetKinds(isOwner: Boolean): List<WidgetKind> =
    WidgetKind.entries.filter { isOwner || !it.ownerOnly }

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

    fun getSkin(context: Context, kind: WidgetKind): Skin =
        Skin.fromKey(context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(kind.skinKey, null))

    fun setSkin(context: Context, kind: WidgetKind, skin: Skin) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(kind.skinKey, skin.key).apply()
    }

    fun getMode(context: Context, kind: WidgetKind): ThemeMode =
        ThemeMode.fromKey(context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(kind.modeKey, null))

    fun setMode(context: Context, kind: WidgetKind, mode: ThemeMode) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(kind.modeKey, mode.key).apply()
    }

    suspend fun refreshAll(context: Context) {
        FinanceWidget().updateAll(context)
        PaymentsWidget().updateAll(context)
        HabitsWidget().updateAll(context)
    }
}
