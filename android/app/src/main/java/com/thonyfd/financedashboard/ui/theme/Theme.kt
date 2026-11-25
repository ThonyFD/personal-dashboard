package com.thonyfd.financedashboard.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thonyfd.financedashboard.R

@OptIn(ExperimentalTextApi::class)
private fun variable(res: Int, weight: FontWeight) = Font(
    resId = res,
    weight = weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight))
)

internal val DisplayFamily = FontFamily(
    variable(R.font.space_grotesk, FontWeight.Normal),
    variable(R.font.space_grotesk, FontWeight.Medium),
    variable(R.font.space_grotesk, FontWeight.SemiBold),
    variable(R.font.space_grotesk, FontWeight.Bold)
)

internal val BodyFamily = FontFamily(
    variable(R.font.manrope, FontWeight.Normal),
    variable(R.font.manrope, FontWeight.Medium),
    variable(R.font.manrope, FontWeight.SemiBold),
    variable(R.font.manrope, FontWeight.Bold)
)

private fun static(res: Int, weight: FontWeight) = Font(res, weight)

internal val DotFamily = FontFamily(
    variable(R.font.doto, FontWeight.Normal),
    variable(R.font.doto, FontWeight.Medium),
    variable(R.font.doto, FontWeight.SemiBold),
    variable(R.font.doto, FontWeight.Bold)
)

internal val MonoFamily = FontFamily(
    static(R.font.space_mono_regular, FontWeight.Normal),
    static(R.font.space_mono_regular, FontWeight.Medium),
    static(R.font.space_mono_bold, FontWeight.SemiBold),
    static(R.font.space_mono_bold, FontWeight.Bold)
)

internal val InterFamily = FontFamily(
    variable(R.font.inter, FontWeight.Normal),
    variable(R.font.inter, FontWeight.Medium),
    variable(R.font.inter, FontWeight.SemiBold),
    variable(R.font.inter, FontWeight.Bold)
)

/** Tokens del skin activo. Brand oscuro por defecto (pantallas publicas como LoginScreen). */
val LocalSkinTokens = staticCompositionLocalOf { BrandDark }

val LocalSkin = staticCompositionLocalOf { Skin.BRAND }

object AppTheme {
    val colors: SkinTokens
        @Composable
        @ReadOnlyComposable
        get() = LocalSkinTokens.current

    val fonts: SkinFonts
        @Composable
        @ReadOnlyComposable
        get() = fontsFor(LocalSkin.current)

    val effects: SkinEffects
        @Composable
        @ReadOnlyComposable
        get() = effectsFor(LocalSkin.current)

    /** Cifras de dinero: familia numerica del skin con numeros tabulares para que alineen en columnas. */
    val moneyStyle: TextStyle
        @Composable
        @ReadOnlyComposable
        get() = TextStyle(fontFamily = fonts.numeric, fontFeatureSettings = "tnum", letterSpacing = (-0.2).sp)
}

private fun colorSchemeFor(t: SkinTokens): ColorScheme {
    return if (t.isDark) {
        darkColorScheme(
            primary = t.accent,
            onPrimary = t.onAccent,
            primaryContainer = t.surfaceRaised,
            onPrimaryContainer = t.text,
            secondary = t.depth,
            onSecondary = t.text,
            tertiary = t.positive,
            onTertiary = t.onAccent,
            background = t.bg,
            onBackground = t.text,
            surface = t.bg,
            onSurface = t.text,
            surfaceVariant = t.surface,
            onSurfaceVariant = t.textSecondary,
            surfaceContainer = t.surface,
            surfaceContainerHigh = t.surfaceRaised,
            surfaceContainerHighest = t.surfaceRaised,
            surfaceContainerLow = t.surfaceLow,
            outline = t.hairline,
            outlineVariant = t.hairline,
            error = t.negative,
            onError = t.onAccent
        )
    } else {
        lightColorScheme(
            primary = t.accent,
            onPrimary = t.onAccent,
            primaryContainer = t.surfaceRaised,
            onPrimaryContainer = t.text,
            secondary = t.depth,
            onSecondary = t.surface,
            tertiary = t.positive,
            onTertiary = t.surface,
            background = t.bg,
            onBackground = t.text,
            surface = t.bg,
            onSurface = t.text,
            surfaceVariant = t.surface,
            onSurfaceVariant = t.textSecondary,
            surfaceContainer = t.surface,
            surfaceContainerHigh = t.surfaceRaised,
            surfaceContainerHighest = t.surfaceRaised,
            surfaceContainerLow = t.surfaceLow,
            outline = t.hairline,
            outlineVariant = t.hairline,
            error = t.negative,
            onError = t.surface
        )
    }
}

@Composable
fun FinanceDashboardTheme(tokens: SkinTokens = BrandDark, skin: Skin = Skin.BRAND, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalSkinTokens provides tokens, LocalSkin provides skin) {
        MaterialTheme(
            colorScheme = colorSchemeFor(tokens),
            typography = typographyFor(fontsFor(skin)),
            shapes = shapesFor(skin),
            content = content
        )
    }
}

/** Tema segun la preferencia guardada (skin y modo); tambien ajusta los iconos de las barras del sistema. */
@Composable
fun AppearanceTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val (skin, mode) = AppearancePreferences.state(context).collectAsState().value
    val tokens = tokensFor(skin, resolveDark(mode, isSystemInDarkTheme()))
    val view = LocalView.current
    if (!view.isInEditMode) {
        DisposableEffect(tokens.isDark) {
            val window = (view.context as? Activity)?.window
            val controller = window?.let { WindowCompat.getInsetsController(it, view) }
            controller?.isAppearanceLightStatusBars = !tokens.isDark
            controller?.isAppearanceLightNavigationBars = !tokens.isDark
            onDispose {
                // Pantallas publicas (LoginScreen) vuelven a Brand oscuro: iconos claros.
                controller?.isAppearanceLightStatusBars = false
                controller?.isAppearanceLightNavigationBars = false
            }
        }
    }
    FinanceDashboardTheme(tokens = tokens, skin = skin, content = content)
}
