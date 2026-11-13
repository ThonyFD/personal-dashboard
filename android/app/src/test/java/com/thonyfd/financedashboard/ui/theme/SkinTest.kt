package com.thonyfd.financedashboard.ui.theme

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SkinTest {

    @Test
    fun skinFromKeyFallsBackToBrand() {
        assertEquals(Skin.BRAND, Skin.fromKey(null))
        assertEquals(Skin.BRAND, Skin.fromKey("neon"))
        assertEquals(Skin.BRAND, Skin.fromKey("glass"))
        assertEquals(Skin.BRAND, Skin.fromKey("brand"))
    }

    @Test
    fun themeModeFromKeyFallsBackToDark() {
        assertEquals(ThemeMode.DARK, ThemeMode.fromKey(null))
        assertEquals(ThemeMode.DARK, ThemeMode.fromKey("sepia"))
        assertEquals(ThemeMode.SYSTEM, ThemeMode.fromKey("system"))
        assertEquals(ThemeMode.LIGHT, ThemeMode.fromKey("light"))
    }

    @Test
    fun resolveDarkFollowsMode() {
        assertTrue(resolveDark(ThemeMode.SYSTEM, true))
        assertFalse(resolveDark(ThemeMode.SYSTEM, false))
        assertFalse(resolveDark(ThemeMode.LIGHT, true))
        assertTrue(resolveDark(ThemeMode.DARK, false))
    }

    @Test
    fun tokensForBrandPicksVariant() {
        assertEquals(BrandDark, tokensFor(Skin.BRAND, true))
        assertEquals(BrandLight, tokensFor(Skin.BRAND, false))
    }

    private fun assertContrast(name: String, t: SkinTokens) {
        fun check(label: String, a: androidx.compose.ui.graphics.Color, b: androidx.compose.ui.graphics.Color, min: Double) {
            val r = contrastRatio(a, b)
            assertTrue("$name $label contrast $r < $min", r >= min)
        }
        check("text/bg", t.text, t.bg, 4.5)
        check("textSecondary/bg", t.textSecondary, t.bg, 4.5)
        check("text/surface", t.text, t.surface, 4.5)
        check("accent/bg", t.accent, t.bg, 3.0)
        check("positive/bg", t.positive, t.bg, 3.0)
        check("negative/bg", t.negative, t.bg, 3.0)
        check("warning/bg", t.warning, t.bg, 3.0)
        check("onAccent/accent", t.onAccent, t.accent, 4.5)
        assertTrue("$name chart size", t.chart.size >= 8)
    }

    @Test
    fun brandDarkContrast() = assertContrast("BrandDark", BrandDark)

    @Test
    fun brandLightContrast() = assertContrast("BrandLight", BrandLight)
}
