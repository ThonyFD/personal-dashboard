package com.thonyfd.financedashboard.ui

import androidx.compose.foundation.background
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
import com.thonyfd.financedashboard.ui.theme.AppColors
import com.thonyfd.financedashboard.ui.theme.MoneyStyle

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
            .background(AppColors.Panel)
            .border(1.dp, AppColors.Hairline, PanelShape),
        content = content
    )
}

/**
 * Para filas de una LazyColumn que deben verse como un solo panel:
 * redondea arriba en la primera y abajo en la última.
 */
fun Modifier.panelSegment(index: Int, count: Int): Modifier {
    val top = if (index == 0) PanelRadius else 0.dp
    val bottom = if (index == count - 1) PanelRadius else 0.dp
    val shape = RoundedCornerShape(topStart = top, topEnd = top, bottomStart = bottom, bottomEnd = bottom)
    return this.fillMaxWidth().clip(shape).background(AppColors.Panel)
}

@Composable
fun PanelDivider(startIndent: Dp = 66.dp) {
    HorizontalDivider(Modifier.padding(start = startIndent), thickness = 1.dp, color = AppColors.Hairline)
}

@Composable
fun SectionHeader(title: String, modifier: Modifier = Modifier, trailing: String? = null) {
    Row(
        modifier.fillMaxWidth().padding(top = 14.dp, start = 4.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, color = AppColors.Ice, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        if (trailing != null) Text(trailing, color = AppColors.Mist, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun EmptyRow(message: String) {
    Text(
        message,
        color = AppColors.Mist,
        style = MaterialTheme.typography.bodyMedium,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 20.dp)
    )
}

/** Círculo de completado usado en pagos y hábitos. */
@Composable
fun CheckCircle(checked: Boolean, onClick: () -> Unit, accent: Color = AppColors.Lime, size: Dp = 30.dp) {
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .clickable(onClick = onClick)
            .background(if (checked) accent else Color.Transparent, CircleShape)
            .border(1.5.dp, if (checked) accent else AppColors.Dim, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        if (checked) Icon(Icons.Default.Check, null, tint = AppColors.Night, modifier = Modifier.size(size * 0.6f))
    }
}

@Composable
fun MoneyText(amount: Double, color: Color = AppColors.Ice, fontSize: Int = 15, prefix: String = "") {
    Text(prefix + money(amount), color = color, style = MoneyStyle, fontSize = fontSize.sp)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun appTopBarColors(): TopAppBarColors = TopAppBarDefaults.topAppBarColors(
    containerColor = AppColors.Night,
    scrolledContainerColor = AppColors.Night,
    titleContentColor = AppColors.Ice,
    navigationIconContentColor = AppColors.Ice,
    actionIconContentColor = AppColors.Mist
)

@Composable
fun appFieldColors(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = AppColors.Cyan,
    unfocusedBorderColor = AppColors.Hairline,
    cursorColor = AppColors.Cyan,
    focusedTextColor = AppColors.Ice,
    unfocusedTextColor = AppColors.Ice,
    focusedContainerColor = AppColors.Panel,
    unfocusedContainerColor = AppColors.Panel,
    focusedLabelColor = AppColors.Cyan,
    unfocusedLabelColor = AppColors.Mist,
    focusedPlaceholderColor = AppColors.Dim,
    unfocusedPlaceholderColor = AppColors.Dim
)
