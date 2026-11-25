package com.thonyfd.financedashboard.ui

import androidx.compose.foundation.background
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ripple
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import kotlin.math.PI
import kotlin.math.sin
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldColors
import androidx.compose.material3.TopAppBarColors
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thonyfd.financedashboard.ui.theme.AppTheme
import com.thonyfd.financedashboard.ui.theme.dotGrid

// Lenguaje visual compartido: paneles agrupados sobre fondo Night, divisores finos,
// encabezados en sentence case y cifras en Space Grotesk tabular.

val PanelRadius: Dp = 20.dp
private val PanelShape = RoundedCornerShape(PanelRadius)

fun money(amount: Double): String = "$" + String.format("%,.2f", amount)

@Composable
fun GroupedPanel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(PanelShape)
            .background(AppTheme.colors.surface)
            .then(if (AppTheme.effects.dotPattern) Modifier.dotGrid(AppTheme.colors.text.copy(alpha = 0.12f)) else Modifier)
            .border(1.dp, AppTheme.colors.hairline, PanelShape),
        content = content
    )
}

/**
 * Para filas de una LazyColumn que deben verse como un solo panel:
 * redondea arriba en la primera y abajo en la última.
 */
@Composable
fun Modifier.panelSegment(index: Int, count: Int): Modifier {
    val top = if (index == 0) PanelRadius else 0.dp
    val bottom = if (index == count - 1) PanelRadius else 0.dp
    val shape = RoundedCornerShape(topStart = top, topEnd = top, bottomStart = bottom, bottomEnd = bottom)
    return this.fillMaxWidth().clip(shape).background(AppTheme.colors.surface)
}

@Composable
fun PanelDivider(startIndent: Dp = 66.dp) {
    HorizontalDivider(Modifier.padding(start = startIndent), thickness = 1.dp, color = AppTheme.colors.hairline)
}

@Composable
fun SectionHeader(title: String, modifier: Modifier = Modifier, trailing: String? = null) {
    Row(
        modifier.fillMaxWidth().padding(top = 14.dp, start = 4.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, color = AppTheme.colors.text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        if (trailing != null) Text(trailing, color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun EmptyRow(message: String) {
    Text(
        message,
        color = AppTheme.colors.textSecondary,
        style = MaterialTheme.typography.bodyMedium,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 20.dp)
    )
}

/** Círculo de completado usado en pagos y hábitos. Con [loading] muestra los puntos mientras se guarda. */
@Composable
fun CheckCircle(
    checked: Boolean,
    onClick: () -> Unit,
    accent: Color = AppTheme.colors.positive,
    size: Dp = 30.dp,
    loading: Boolean = false
) {
    val interaction = remember { MutableInteractionSource() }
    val haptics = LocalHapticFeedback.current
    val fill by animateColorAsState(if (checked) accent else Color.Transparent, label = "checkFill")
    Box(
        Modifier
            .pressFeedback(interaction)
            .size(size)
            .clip(CircleShape)
            .clickable(
                interactionSource = interaction,
                indication = ripple(bounded = true),
                enabled = !loading
            ) {
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            }
            .background(fill, CircleShape)
            .border(1.5.dp, if (checked) accent else AppTheme.colors.textPassive, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        when {
            loading -> LoadingDots(color = if (checked) AppTheme.colors.bg else AppTheme.colors.text, dotSize = size * 0.12f)
            checked -> Icon(Icons.Default.Check, null, tint = AppTheme.colors.bg, modifier = Modifier.size(size * 0.6f))
        }
    }
}

// ---------------------------------------------------------------------------
// Feedback táctil y estados de carga
// ---------------------------------------------------------------------------

/**
 * Tres puntos que ondulan arriba y abajo de forma continua y suave.
 * Cada punto va desfasado para formar una ola.
 */
@Composable
fun LoadingDots(
    modifier: Modifier = Modifier,
    color: Color = AppTheme.colors.text,
    dotSize: Dp = 6.dp
) {
    val transition = rememberInfiniteTransition(label = "loadingDots")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(durationMillis = 1100, easing = LinearEasing)),
        label = "loadingDotsPhase"
    )
    Row(
        modifier.height(dotSize * 3),
        horizontalArrangement = Arrangement.spacedBy(dotSize * 0.75f),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(3) { index ->
            Box(
                Modifier
                    .size(dotSize)
                    .graphicsLayer {
                        val angle = (phase - index * 0.16f) * 2f * PI.toFloat()
                        translationY = -sin(angle) * dotSize.toPx() * 0.8f
                        alpha = 0.55f + 0.45f * ((sin(angle) + 1f) / 2f)
                    }
                    .background(color, CircleShape)
            )
        }
    }
}

/** Escala ligeramente el elemento mientras está presionado (respuesta tipo resorte). */
fun Modifier.pressFeedback(interactionSource: MutableInteractionSource, pressedScale: Float = 0.95f): Modifier = composed {
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) pressedScale else 1f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = Spring.StiffnessMediumLow),
        label = "pressScale"
    )
    graphicsLayer { scaleX = scale; scaleY = scale }
}

enum class AppButtonStyle { Primary, Secondary, Text, Danger }

/**
 * Botón de la app: respuesta al toque (escala + vibración ligera) y estado [loading]
 * con puntos animados. Mientras carga no acepta toques y conserva su ancho.
 */
@Composable
fun AppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: AppButtonStyle = AppButtonStyle.Primary,
    loading: Boolean = false,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null
) {
    val interaction = remember { MutableInteractionSource() }
    val haptics = LocalHapticFeedback.current
    val active = enabled && !loading
    val shape = RoundedCornerShape(14.dp)
    val (container, content, border) = when (style) {
        AppButtonStyle.Primary -> Triple(AppTheme.colors.accent, AppTheme.colors.bg, Color.Transparent)
        AppButtonStyle.Secondary -> Triple(Color.Transparent, AppTheme.colors.text, AppTheme.colors.hairline)
        AppButtonStyle.Text -> Triple(Color.Transparent, AppTheme.colors.accent, Color.Transparent)
        AppButtonStyle.Danger -> Triple(Color.Transparent, AppTheme.colors.negative, Color.Transparent)
    }
    val alpha = if (enabled || loading) 1f else 0.4f

    Box(
        modifier
            .pressFeedback(interaction)
            .defaultMinSize(minHeight = if (style == AppButtonStyle.Text || style == AppButtonStyle.Danger) 40.dp else 48.dp)
            .clip(shape)
            .background(container.copy(alpha = container.alpha * alpha), shape)
            .border(1.dp, border, shape)
            .clickable(interactionSource = interaction, indication = ripple(color = content), enabled = active) {
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            }
            .padding(horizontal = 18.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        // La etiqueta se mantiene (invisible) durante la carga para que el botón no cambie de tamaño
        Row(
            Modifier.graphicsLayer { this.alpha = if (loading) 0f else alpha },
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (leadingIcon != null) {
                Icon(leadingIcon, null, tint = content, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(text, color = content, style = MaterialTheme.typography.labelLarge)
        }
        if (loading) LoadingDots(color = content)
    }
}

/** Botón de icono con la misma respuesta táctil y estado de carga. */
@Composable
fun AppIconButton(
    icon: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: Color = AppTheme.colors.textSecondary,
    loading: Boolean = false,
    enabled: Boolean = true,
    size: Dp = 44.dp
) {
    val interaction = remember { MutableInteractionSource() }
    val haptics = LocalHapticFeedback.current
    Box(
        modifier
            .pressFeedback(interaction, pressedScale = 0.88f)
            .size(size)
            .clip(CircleShape)
            .clickable(
                interactionSource = interaction,
                indication = ripple(bounded = true),
                enabled = enabled && !loading
            ) {
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            },
        contentAlignment = Alignment.Center
    ) {
        if (loading) {
            LoadingDots(color = tint, dotSize = 4.dp)
        } else {
            Icon(icon, contentDescription, tint = if (enabled) tint else AppTheme.colors.hairline, modifier = Modifier.size(22.dp))
        }
    }
}

@Composable
fun MoneyText(amount: Double, color: Color = AppTheme.colors.text, fontSize: Int = 15, prefix: String = "") {
    Text(prefix + money(amount), color = color, style = if (fontSize >= 20) AppTheme.moneyStyle.copy(fontFamily = AppTheme.fonts.display) else AppTheme.moneyStyle, fontSize = fontSize.sp)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun appTopBarColors(): TopAppBarColors = TopAppBarDefaults.topAppBarColors(
    containerColor = AppTheme.colors.bg,
    scrolledContainerColor = AppTheme.colors.bg,
    titleContentColor = AppTheme.colors.text,
    navigationIconContentColor = AppTheme.colors.text,
    actionIconContentColor = AppTheme.colors.textSecondary
)

@Composable
fun appFieldColors(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = AppTheme.colors.accent,
    unfocusedBorderColor = AppTheme.colors.hairline,
    cursorColor = AppTheme.colors.accent,
    focusedTextColor = AppTheme.colors.text,
    unfocusedTextColor = AppTheme.colors.text,
    focusedContainerColor = AppTheme.colors.surface,
    unfocusedContainerColor = AppTheme.colors.surface,
    focusedLabelColor = AppTheme.colors.accent,
    unfocusedLabelColor = AppTheme.colors.textSecondary,
    focusedPlaceholderColor = AppTheme.colors.textPassive,
    unfocusedPlaceholderColor = AppTheme.colors.textPassive
)
