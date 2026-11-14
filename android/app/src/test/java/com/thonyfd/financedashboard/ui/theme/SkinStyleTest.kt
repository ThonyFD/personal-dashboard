package com.thonyfd.financedashboard.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SkinStyleTest {

    @Test
    fun brandFontsAreTodaysFamilies() {
        assertEquals(
            SkinFonts(DisplayFamily, DisplayFamily, BodyFamily, DisplayFamily, BodyFamily),
            fontsFor(Skin.BRAND)
        )
    }

    @Test
    fun glassFontsEqualBrand() {
        assertEquals(fontsFor(Skin.BRAND), fontsFor(Skin.GLASS))
    }

    @Test
    fun nothingBodyDiffersFromDisplay() {
        val f = fontsFor(Skin.NOTHING)
        assertNotEquals(f.display, f.body)
        assertNotEquals(f.display, f.heading)
        assertNotEquals(f.display, f.numeric)
        assertNotEquals(f.display, f.label)
    }

    @Test
    fun effectsPerSkin() {
        assertEquals(SkinEffects(false, false), effectsFor(Skin.BRAND))
        assertEquals(SkinEffects(true, true), effectsFor(Skin.NOTHING))
    }

    private fun styles(t: Typography): List<TextStyle> = listOf(
        t.displayLarge, t.displayMedium, t.displaySmall,
        t.headlineLarge, t.headlineMedium, t.headlineSmall,
        t.titleLarge, t.titleMedium, t.titleSmall,
        t.bodyLarge, t.bodyMedium, t.bodySmall,
        t.labelLarge, t.labelMedium, t.labelSmall
    )

    @Test
    fun nothingDotFontOnlyOnLargeStyles() {
        val fonts = fontsFor(Skin.NOTHING)
        styles(typographyFor(fonts)).filter { it.fontSize < 20.sp }.forEach {
            assertNotEquals(fonts.display, it.fontFamily)
        }
    }

    @Test
    fun brandTypographyKeepsTodaysValues() {
        val t = typographyFor(fontsFor(Skin.BRAND))
        val base = Typography()
        assertEquals(DisplayFamily, t.displayLarge.fontFamily)
        assertEquals((-1).sp, t.displayLarge.letterSpacing)
        assertEquals(DisplayFamily, t.titleLarge.fontFamily)
        assertEquals((-0.2).sp, t.titleLarge.letterSpacing)
        assertEquals(BodyFamily, t.labelLarge.fontFamily)
        assertEquals(base.labelLarge.letterSpacing, t.labelLarge.letterSpacing)
        assertEquals(base.labelSmall.letterSpacing, t.labelSmall.letterSpacing)
        assertEquals(base.labelMedium.letterSpacing, t.labelMedium.letterSpacing)
    }

    @Test
    fun nothingLabelsGetWideTracking() {
        val t = typographyFor(fontsFor(Skin.NOTHING))
        assertTrue(styles(t).takeLast(3).all { it.letterSpacing == 1.2.sp })
    }

    @Test
    fun nothingShapesAreSquarer() {
        val s = shapesFor(Skin.NOTHING)
        val b = shapesFor(Skin.BRAND)
        assertNotEquals(s.medium, b.medium)
        assertEquals(b, shapesFor(Skin.GLASS))
    }
}
