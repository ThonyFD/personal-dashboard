package com.thonyfd.financedashboard.ui.theme

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Preferencia de apariencia (skin y modo) persistida en SharedPreferences "app_appearance". */
object AppearancePreferences {
    private const val PREFS = "app_appearance"
    private const val KEY_SKIN = "skin"
    private const val KEY_MODE = "mode"

    @Volatile
    private var flow: MutableStateFlow<Pair<Skin, ThemeMode>>? = null

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** StateFlow unico por proceso, inicializado de forma perezosa desde SharedPreferences. */
    fun state(context: Context): StateFlow<Pair<Skin, ThemeMode>> = flow(context)

    fun set(context: Context, skin: Skin, mode: ThemeMode) {
        prefs(context).edit()
            .putString(KEY_SKIN, skin.key)
            .putString(KEY_MODE, mode.key)
            .apply()
        flow(context).value = skin to mode
    }

    private fun flow(context: Context): MutableStateFlow<Pair<Skin, ThemeMode>> =
        flow ?: synchronized(this) {
            flow ?: run {
                val p = prefs(context)
                MutableStateFlow(
                    Skin.fromKey(p.getString(KEY_SKIN, null)) to
                        ThemeMode.fromKey(p.getString(KEY_MODE, null))
                ).also { flow = it }
            }
        }
}
