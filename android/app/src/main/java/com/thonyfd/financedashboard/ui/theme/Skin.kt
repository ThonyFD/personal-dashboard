package com.thonyfd.financedashboard.ui.theme

import androidx.compose.ui.graphics.Color
import kotlin.math.pow

/** Skins de la app. BRAND y NOTHING son seleccionables; GLASS existe pero esta oculto. */
enum class Skin(val key: String) {
    BRAND("brand"),
    NOTHING("nothing"),
    GLASS("glass");

    companion object {
        val SELECTABLE = listOf(BRAND, NOTHING)

        /** Clave desconocida o no seleccionable cae en BRAND. */
        fun fromKey(key: String?): Skin =
            SELECTABLE.firstOrNull { it.key == key } ?: BRAND
    }
}

/** Modo claro/oscuro elegido por el usuario. */
enum class ThemeMode(val key: String) {
    SYSTEM("system"),
    LIGHT("light"),
    DARK("dark");

    companion object {
        /** Clave desconocida cae en DARK (default de la app). */
        fun fromKey(key: String?): ThemeMode =
            entries.firstOrNull { it.key == key } ?: DARK
    }
}

fun resolveDark(mode: ThemeMode, systemDark: Boolean): Boolean = when (mode) {
    ThemeMode.SYSTEM -> systemDark
    ThemeMode.LIGHT -> false
    ThemeMode.DARK -> true
}

/** Tokens semanticos de color de un skin en una variante (clara u oscura). */
data class SkinTokens(
    val bg: Color,
    val surfaceLow: Color,
    val surface: Color,
    val surfaceRaised: Color,
    val hairline: Color,
    val text: Color,
    val textSecondary: Color,
    val textPassive: Color,
    val accent: Color,
    val onAccent: Color,
    val positive: Color,
    val negative: Color,
    val warning: Color,
    val depth: Color,
    val chart: List<Color>,
    val isDark: Boolean
)

val BrandDark = SkinTokens(
    bg = Color(0xFF081022),
    surfaceLow = Color(0xFF0C1730),
    surface = Color(0xFF111A2E),
    surfaceRaised = Color(0xFF17223A),
    hairline = Color(0xFF1F2B45),
    text = Color(0xFFE8FFFF),
    textSecondary = Color(0xFF8A94A8),
    textPassive = Color(0xFF5E677A),
    accent = Color(0xFF00D9FF),
    onAccent = Color(0xFF081022),
    positive = Color(0xFF39FF14),
    negative = Color(0xFFFF6B81),
    warning = Color(0xFFFFC069),
    depth = Color(0xFF7A5CFF),
    chart = listOf(
        Color(0xFF00D9FF), Color(0xFF39FF14), Color(0xFF7A5CFF), Color(0xFFFF6B81),
        Color(0xFFFFC069), Color(0xFFE8FFFF), Color(0xFF5E677A), Color(0xFF00A3BF)
    ),
    isDark = true
)

val BrandLight = SkinTokens(
    bg = Color(0xFFF4FAFC),
    surfaceLow = Color(0xFFEAF2F6),
    surface = Color(0xFFFFFFFF),
    surfaceRaised = Color(0xFFE2ECF2),
    hairline = Color(0xFFD3DEE6),
    text = Color(0xFF081022),
    textSecondary = Color(0xFF3E4A5E),
    textPassive = Color(0xFF5E677A),
    accent = Color(0xFF007C99),
    onAccent = Color(0xFFFFFFFF),
    positive = Color(0xFF237A0C),
    negative = Color(0xFFC8304A),
    warning = Color(0xFF9A5B00),
    depth = Color(0xFF5B3FE0),
    chart = listOf(
        Color(0xFF007C99), Color(0xFF237A0C), Color(0xFF5B3FE0), Color(0xFFC8304A),
        Color(0xFF9A5B00), Color(0xFF081022), Color(0xFF5E677A), Color(0xFF00A3BF)
    ),
    isDark = false
)

val NothingDark = SkinTokens(
    bg = Color(0xFF000000),
    surfaceLow = Color(0xFF0A0A0A),
    surface = Color(0xFF111111),
    surfaceRaised = Color(0xFF1A1A1A),
    hairline = Color(0xFF2A2A2A),
    text = Color(0xFFFFFFFF),
    textSecondary = Color(0xFFB3B3B3),
    textPassive = Color(0xFF808080),
    accent = Color(0xFFFFFFFF),
    onAccent = Color(0xFF000000),
    positive = Color(0xFFFFFFFF),
    negative = Color(0xFFE61921),
    warning = Color(0xFFE0B040),
    depth = Color(0xFF808080),
    chart = listOf(
        Color(0xFFFFFFFF), Color(0xFFE61921), Color(0xFFA6A6A6), Color(0xFF6E6E6E),
        Color(0xFFE0B040), Color(0xFFFF6A70), Color(0xFF4D4D4D), Color(0xFFCFCFCF)
    ),
    isDark = true
)

val NothingLight = SkinTokens(
    bg = Color(0xFFF2F2F2),
    surfaceLow = Color(0xFFEAEAEA),
    surface = Color(0xFFFFFFFF),
    surfaceRaised = Color(0xFFE0E0E0),
    hairline = Color(0xFFCCCCCC),
    text = Color(0xFF000000),
    textSecondary = Color(0xFF4D4D4D),
    textPassive = Color(0xFF6E6E6E),
    accent = Color(0xFF000000),
    onAccent = Color(0xFFFFFFFF),
    positive = Color(0xFF000000),
    negative = Color(0xFFC8102E),
    warning = Color(0xFF8A6100),
    depth = Color(0xFF6E6E6E),
    chart = listOf(
        Color(0xFF000000), Color(0xFFC8102E), Color(0xFF6E6E6E), Color(0xFFA6A6A6),
        Color(0xFF8A6100), Color(0xFFE0404A), Color(0xFF333333), Color(0xFF8C8C8C)
    ),
    isDark = false
)

/** Paleta del skin. */
// GLASS cae a Brand a proposito hasta su fase.
fun tokensFor(skin: Skin, dark: Boolean): SkinTokens = when (skin) {
    Skin.NOTHING -> if (dark) NothingDark else NothingLight
    Skin.BRAND, Skin.GLASS -> if (dark) BrandDark else BrandLight
}

private fun channel(v: Float): Double {
    val c = v.toDouble()
    return if (c <= 0.03928) c / 12.92 else ((c + 0.055) / 1.055).pow(2.4)
}

/** Luminancia relativa WCAG; pura, sin depender del runtime de Android. */
private fun relativeLuminance(c: Color): Double =
    0.2126 * channel(c.red) + 0.7152 * channel(c.green) + 0.0722 * channel(c.blue)

/** Razon de contraste WCAG entre dos colores (1.0 a 21.0). */
fun contrastRatio(a: Color, b: Color): Double {
    val la = relativeLuminance(a)
    val lb = relativeLuminance(b)
    return (maxOf(la, lb) + 0.05) / (minOf(la, lb) + 0.05)
}
