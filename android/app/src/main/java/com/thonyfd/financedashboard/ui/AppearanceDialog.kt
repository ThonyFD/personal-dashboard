package com.thonyfd.financedashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.thonyfd.financedashboard.ui.theme.AppTheme
import com.thonyfd.financedashboard.ui.theme.AppearancePreferences
import com.thonyfd.financedashboard.ui.theme.Skin
import com.thonyfd.financedashboard.ui.theme.ThemeMode
import com.thonyfd.financedashboard.ui.theme.tokensFor

/** Selector de skin y modo; aplica al instante via [AppearancePreferences]. */
@Composable
fun AppearanceDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    val (skin, mode) = AppearancePreferences.state(context).collectAsState().value

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = AppTheme.colors.surface,
        titleContentColor = AppTheme.colors.text,
        textContentColor = AppTheme.colors.textSecondary,
        icon = { Icon(Icons.Outlined.Palette, null, tint = AppTheme.colors.accent) },
        title = { Text("Apariencia", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Skin.SELECTABLE.forEach { option ->
                    val swatch = tokensFor(option, dark = true)
                    OptionRow(
                        label = option.label(),
                        selected = option == skin,
                        onClick = { AppearancePreferences.set(context, option, mode) }
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            listOf(swatch.bg, swatch.accent, swatch.positive, swatch.depth).forEach {
                                Spacer(
                                    Modifier.size(14.dp).clip(CircleShape).background(it)
                                        .border(1.dp, AppTheme.colors.hairline, CircleShape)
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text("Modo", color = AppTheme.colors.text, fontWeight = FontWeight.Medium)
                ThemeMode.entries.forEach { option ->
                    OptionRow(
                        label = option.label(),
                        selected = option == mode,
                        onClick = { AppearancePreferences.set(context, skin, option) }
                    )
                }
            }
        },
        confirmButton = {
            AppButton("Cerrar", style = AppButtonStyle.Text, onClick = onDismiss)
        }
    )
}

@Composable
private fun OptionRow(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    trailing: @Composable () -> Unit = {}
) {
    val shape = RoundedCornerShape(14.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (selected) AppTheme.colors.accent.copy(alpha = 0.14f) else AppTheme.colors.surfaceRaised)
            .border(1.dp, if (selected) AppTheme.colors.accent else AppTheme.colors.hairline, shape)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            color = if (selected) AppTheme.colors.accent else AppTheme.colors.text,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
        )
        trailing()
    }
}

private fun Skin.label(): String = when (this) {
    Skin.BRAND -> "Brand"
    Skin.NOTHING -> "Nothing"
    Skin.GLASS -> "Glass"
}

private fun ThemeMode.label(): String = when (this) {
    ThemeMode.SYSTEM -> "Sistema"
    ThemeMode.LIGHT -> "Claro"
    ThemeMode.DARK -> "Oscuro"
}
