package com.thonyfd.financedashboard.widget

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.glance.color.ColorProvider
import androidx.glance.GlanceModifier
import androidx.glance.text.FontFamily
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.thonyfd.financedashboard.ui.theme.Skin
import com.thonyfd.financedashboard.ui.theme.SkinTokens
import com.thonyfd.financedashboard.ui.theme.ThemeMode
import com.thonyfd.financedashboard.ui.theme.tokensFor

/**
 * Tokens semanticos como [ColorProvider] de Glance. En SYSTEM el color cambia con el modo
 * nocturno del telefono sin recomponer; en LIGHT/DARK es una variante fija.
 * La opacidad de fondo aplica solo a [bg].
 */
class WidgetColors internal constructor(
    private val light: SkinTokens,
    private val dark: SkinTokens,
    private val mode: ThemeMode,
    backgroundOpacity: Float,
    val skin: Skin
) {
    /** Color de un token con alpha opcional; [pick] elige el token de cada variante. */
    fun provider(alpha: Float = 1f, pick: (SkinTokens) -> Color): ColorProvider {
        val day = pick(light).copy(alpha = alpha)
        val night = pick(dark).copy(alpha = alpha)
        return when (mode) {
            ThemeMode.SYSTEM -> ColorProvider(day = day, night = night)
            ThemeMode.LIGHT -> ColorProvider(day)
            ThemeMode.DARK -> ColorProvider(night)
        }
    }

    val bg = provider(backgroundOpacity) { it.bg }
    val surface = provider { it.surface }
    val text = provider { it.text }
    val textSecondary = provider { it.textSecondary }
    val textPassive = provider { it.textPassive }
    val accent = provider { it.accent }
    val positive = provider { it.positive }
    val negative = provider { it.negative }
    val warning = provider { it.warning }
    val depth = provider { it.depth }
    val hairline = provider { it.hairline }

    /** Fondo sin transparencia, para insets dentro de superficies y texto sobre acento. */
    val bgSolid = provider { it.bg }
}

fun widgetColors(skin: Skin, mode: ThemeMode, backgroundOpacity: Float): WidgetColors =
    WidgetColors(tokensFor(skin, dark = false), tokensFor(skin, dark = true), mode, backgroundOpacity, skin)

internal fun widgetColors(context: android.content.Context, kind: WidgetKind): WidgetColors =
    widgetColors(
        WidgetAppearancePreferences.getSkin(context, kind),
        WidgetAppearancePreferences.getMode(context, kind),
        WidgetAppearancePreferences.getOpacity(context, kind)
    )

/** Tokens del widget activo; cada widget los provee en su `provideContent`. */
internal val LocalWidgetColors = staticCompositionLocalOf<WidgetColors> {
    error("WidgetColors no provistos")
}

internal object WidgetTheme {
    val colors: WidgetColors
        @Composable @ReadOnlyComposable get() = LocalWidgetColors.current
}

/**
 * Text de los widgets: igual que el de Glance, pero en Nothing usa familia monoespaciada.
 * Brand conserva la familia actual (null).
 */
@Composable
internal fun Text(
    text: String,
    modifier: GlanceModifier = GlanceModifier,
    style: TextStyle? = null,
    maxLines: Int = Int.MAX_VALUE
) {
    val base = style ?: TextStyle()
    val styled = if (WidgetTheme.colors.skin == Skin.NOTHING) {
        TextStyle(
            color = base.color,
            fontSize = base.fontSize,
            fontWeight = base.fontWeight,
            fontStyle = base.fontStyle,
            textAlign = base.textAlign,
            textDecoration = base.textDecoration,
            fontFamily = FontFamily.Monospace
        )
    } else {
        base
    }
    androidx.glance.text.Text(text = text, modifier = modifier, style = styled, maxLines = maxLines)
}
