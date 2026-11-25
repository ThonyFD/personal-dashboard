package com.thonyfd.financedashboard.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Familias tipograficas por rol. Doto (display) solo debe usarse en textos >= 20sp. */
data class SkinFonts(
    val display: FontFamily,
    val heading: FontFamily,
    val body: FontFamily,
    val numeric: FontFamily,
    val label: FontFamily
)

fun fontsFor(skin: Skin): SkinFonts = when (skin) {
    Skin.NOTHING -> SkinFonts(
        display = DotFamily,
        heading = MonoFamily,
        body = InterFamily,
        numeric = MonoFamily,
        label = MonoFamily
    )
    Skin.BRAND, Skin.GLASS -> SkinFonts(
        display = DisplayFamily,
        heading = DisplayFamily,
        body = BodyFamily,
        numeric = DisplayFamily,
        label = BodyFamily
    )
}

private val brandShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

private val nothingShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(20.dp)
)

fun shapesFor(skin: Skin): Shapes = when (skin) {
    Skin.NOTHING -> nothingShapes
    Skin.BRAND, Skin.GLASS -> brandShapes
}

/** Mismos pesos y espaciado que la tipografia Brand original; solo cambian las familias por rol. */
fun typographyFor(fonts: SkinFonts): Typography {
    val base = Typography()
    val wide = fonts.label != fonts.body
    fun tracking(default: TextUnit) = if (wide) 1.2.sp else default
    return Typography(
        displayLarge = base.displayLarge.copy(fontFamily = fonts.display, fontWeight = FontWeight.SemiBold, letterSpacing = (-1).sp),
        displayMedium = base.displayMedium.copy(fontFamily = fonts.display, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.8).sp),
        displaySmall = base.displaySmall.copy(fontFamily = fonts.display, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.5).sp),
        headlineLarge = base.headlineLarge.copy(fontFamily = fonts.heading, fontWeight = FontWeight.SemiBold),
        headlineMedium = base.headlineMedium.copy(fontFamily = fonts.heading, fontWeight = FontWeight.SemiBold),
        headlineSmall = base.headlineSmall.copy(fontFamily = fonts.heading, fontWeight = FontWeight.SemiBold),
        titleLarge = base.titleLarge.copy(fontFamily = fonts.heading, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.2).sp),
        titleMedium = base.titleMedium.copy(fontFamily = fonts.body, fontWeight = FontWeight.SemiBold),
        titleSmall = base.titleSmall.copy(fontFamily = fonts.body, fontWeight = FontWeight.SemiBold),
        bodyLarge = base.bodyLarge.copy(fontFamily = fonts.body),
        bodyMedium = base.bodyMedium.copy(fontFamily = fonts.body),
        bodySmall = base.bodySmall.copy(fontFamily = fonts.body),
        labelLarge = base.labelLarge.copy(fontFamily = fonts.label, fontWeight = FontWeight.SemiBold, letterSpacing = tracking(base.labelLarge.letterSpacing)),
        labelMedium = base.labelMedium.copy(fontFamily = fonts.label, fontWeight = FontWeight.SemiBold, letterSpacing = tracking(base.labelMedium.letterSpacing)),
        labelSmall = base.labelSmall.copy(fontFamily = fonts.label, fontWeight = FontWeight.Medium, letterSpacing = tracking(base.labelSmall.letterSpacing))
    )
}

/** Efectos de superficie por skin: patron de puntos y superficies planas (sin sombra). */
data class SkinEffects(val dotPattern: Boolean, val flat: Boolean)

fun effectsFor(skin: Skin): SkinEffects = when (skin) {
    Skin.NOTHING -> SkinEffects(dotPattern = true, flat = true)
    Skin.BRAND, Skin.GLASS -> SkinEffects(dotPattern = false, flat = false)
}

/** Rejilla de puntos de fondo. */
fun Modifier.dotGrid(color: Color, spacing: Dp = 12.dp, radius: Dp = 1.dp): Modifier = drawBehind {
    val step = spacing.toPx()
    val r = radius.toPx()
    if (step <= 0f) return@drawBehind
    var y = step / 2f
    while (y < size.height) {
        var x = step / 2f
        while (x < size.width) {
            drawCircle(color, r, androidx.compose.ui.geometry.Offset(x, y))
            x += step
        }
        y += step
    }
}
