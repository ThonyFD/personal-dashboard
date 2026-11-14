package com.thonyfd.financedashboard.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.sp
import androidx.core.content.res.ResourcesCompat
import androidx.glance.ColorFilter
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.text.FontWeight
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.thonyfd.financedashboard.R
import com.thonyfd.financedashboard.ui.theme.Skin

private const val BITMAP_PADDING_PX = 2

/** Tamano en px de un texto en sp, igual que la conversion de TextView. */
fun dotTextSizePx(textSizeSp: Float, density: Float, fontScale: Float): Float =
    textSizeSp * density * fontScale

/**
 * Dibuja [text] en blanco con Doto. Glance Text no admite fuentes propias, asi que el KPI se
 * entrega como bitmap que el widget tine con el color del token.
 */
fun renderDotText(context: Context, text: String, textSizeSp: Float): Bitmap {
    val metrics = context.resources.displayMetrics
    val base = ResourcesCompat.getFont(context, R.font.doto) ?: Typeface.MONOSPACE
    val face = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) Typeface.create(base, 700, false) else base
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        typeface = face
        textSize = dotTextSizePx(textSizeSp, metrics.density, context.resources.configuration.fontScale)
    }
    val bounds = Rect()
    paint.getTextBounds(text, 0, text.length, bounds)
    val width = (bounds.width() + 2 * BITMAP_PADDING_PX).coerceAtLeast(1)
    val height = (bounds.height() + 2 * BITMAP_PADDING_PX).coerceAtLeast(1)
    return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
        bitmap.density = metrics.densityDpi
        Canvas(bitmap).drawText(
            text,
            (BITMAP_PADDING_PX - bounds.left).toFloat(),
            (BITMAP_PADDING_PX - bounds.top).toFloat(),
            paint
        )
    }
}

/** KPI grande: bitmap Doto tintado en Nothing, Text normal (look actual) en el resto. */
@Composable
internal fun WidgetKpiText(text: String, sizeSp: Float, color: ColorProvider, contentDescription: String) {
    if (WidgetTheme.colors.skin == Skin.NOTHING) {
        val context = LocalContext.current
        Image(
            provider = ImageProvider(renderDotText(context, text, sizeSp)),
            contentDescription = contentDescription,
            modifier = GlanceModifier,
            colorFilter = ColorFilter.tint(color)
        )
    } else {
        Text(text = text, style = TextStyle(color = color, fontSize = sizeSp.sp, fontWeight = FontWeight.Bold))
    }
}
