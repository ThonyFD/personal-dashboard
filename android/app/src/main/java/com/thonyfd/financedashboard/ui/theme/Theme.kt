package com.thonyfd.financedashboard.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
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

private val DarkColorScheme = darkColorScheme(
    primary = AppColors.Cyan,
    onPrimary = AppColors.Night,
    primaryContainer = AppColors.PanelHigh,
    onPrimaryContainer = AppColors.Ice,
    secondary = AppColors.Violet,
    onSecondary = AppColors.Ice,
    tertiary = AppColors.Lime,
    onTertiary = AppColors.Night,
    background = AppColors.Night,
    onBackground = AppColors.Ice,
    surface = AppColors.Night,
    onSurface = AppColors.Ice,
    surfaceVariant = AppColors.Panel,
    onSurfaceVariant = AppColors.Mist,
    surfaceContainer = AppColors.Panel,
    surfaceContainerHigh = AppColors.PanelHigh,
    surfaceContainerHighest = AppColors.PanelHigh,
    surfaceContainerLow = AppColors.Deep,
    outline = AppColors.Hairline,
    outlineVariant = AppColors.Hairline,
    error = AppColors.Coral,
    onError = AppColors.Night
)

@Composable
fun FinanceDashboardTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}
