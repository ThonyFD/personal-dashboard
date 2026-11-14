package com.thonyfd.financedashboard.widget

import org.junit.Assert.assertEquals
import org.junit.Test

class DotTextTest {
    @Test
    fun sizePxScalesByDensity() {
        assertEquals(40f, dotTextSizePx(20f, 2f, 1f), 0f)
    }

    @Test
    fun sizePxScalesByFontScale() {
        assertEquals(28f * 3f * 1.3f, dotTextSizePx(28f, 3f, 1.3f), 0.0001f)
    }
}
