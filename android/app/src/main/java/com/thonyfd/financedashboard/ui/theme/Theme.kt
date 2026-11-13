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
import androidx.compose.runtime.SideEffect
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

/** Tokens de color del Brand Book. Usar siempre estos en lugar de hex sueltos. */
object AppColors {
    val Night = Color(0xFF081022)      // fondo maestro
    val Deep = Color(0xFF0C1730)       // barras y superficies de fondo
    val Panel = Color(0xFF111A2E)      // tarjetas y paneles
    val PanelHigh = Color(0xFF17223A)  // elementos elevados dentro de un panel
    val Hairline = Color(0xFF1F2B45)   // divisores y bordes finos
    val Ice = Color(0xFFE8FFFF)        // texto principal
    val Mist = Color(0xFF8A94A8)       // texto secundario
    val Dim = Color(0xFF5E677A)        // texto pasivo
    val Cyan = Color(0xFF00D9FF)       // identidad y acción principal
    val Lime = Color(0xFF39FF14)       // solo progreso y estados positivos
    val Violet = Color(0xFF7A5CFF)     // acento de profundidad
    val Coral = Color(0xFFFF6B81)      // gastos y errores
    val Amber = Color(0xFFFFC069)      // advertencias y pendientes
}

@OptIn(ExperimentalTextApi::class)
private fun variable(res: Int, weight: FontWeight) = Font(
    resId = res,
    weight = weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight))
)

val DisplayFamily = FontFamily(
    variable(R.font.space_grotesk, FontWeight.Normal),
    variable(R.font.space_grotesk, FontWeight.Medium),
    variable(R.font.space_grotesk, FontWeight.SemiBold),
    variable(R.font.space_grotesk, FontWeight.Bold)
)

val BodyFamily = FontFamily(
    variable(R.font.manrope, FontWeight.Normal),
    variable(R.font.manrope, FontWeight.Medium),
    variable(R.font.manrope, FontWeight.SemiBold),
    variable(R.font.manrope, FontWeight.Bold)
)

/** Cifras de dinero: Space Grotesk con números tabulares para que alineen en columnas. */
val MoneyStyle = TextStyle(fontFamily = DisplayFamily, fontFeatureSettings = "tnum", letterSpacing = (-0.2).sp)

private val base = Typography()

private val AppTypography = Typography(
    displayLarge = base.displayLarge.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.SemiBold, letterSpacing = (-1).sp),
    displayMedium = base.displayMedium.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.8).sp),
    displaySmall = base.displaySmall.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.5).sp),
    headlineLarge = base.headlineLarge.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.SemiBold),
    headlineMedium = base.headlineMedium.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.SemiBold),
    headlineSmall = base.headlineSmall.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.SemiBold),
    titleLarge = base.titleLarge.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.2).sp),
    titleMedium = base.titleMedium.copy(fontFamily = BodyFamily, fontWeight = FontWeight.SemiBold),
    titleSmall = base.titleSmall.copy(fontFamily = BodyFamily, fontWeight = FontWeight.SemiBold),
    bodyLarge = base.bodyLarge.copy(fontFamily = BodyFamily),
    bodyMedium = base.bodyMedium.copy(fontFamily = BodyFamily),
    bodySmall = base.bodySmall.copy(fontFamily = BodyFamily),
    labelLarge = base.labelLarge.copy(fontFamily = BodyFamily, fontWeight = FontWeight.SemiBold),
    labelMedium = base.labelMedium.copy(fontFamily = BodyFamily, fontWeight = FontWeight.SemiBold),
    labelSmall = base.labelSmall.copy(fontFamily = BodyFamily, fontWeight = FontWeight.Medium)
)

private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

/** Tokens del skin activo. Brand oscuro por defecto (pantallas publicas como LoginScreen). */
val LocalSkinTokens = staticCompositionLocalOf { BrandDark }

object AppTheme {
    val colors: SkinTokens
        @Composable
        @ReadOnlyComposable
        get() = LocalSkinTokens.current
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
fun FinanceDashboardTheme(tokens: SkinTokens = BrandDark, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalSkinTokens provides tokens) {
        MaterialTheme(
            colorScheme = colorSchemeFor(tokens),
            typography = AppTypography,
            shapes = AppShapes,
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
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            val controller = WindowCompat.getInsetsController(window, view)
            controller.isAppearanceLightStatusBars = !tokens.isDark
            controller.isAppearanceLightNavigationBars = !tokens.isDark
        }
    }
    FinanceDashboardTheme(tokens = tokens, content = content)
}
