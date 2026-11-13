package com.thonyfd.financedashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Widgets
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.thonyfd.financedashboard.ui.theme.AppTheme
import com.thonyfd.financedashboard.ui.theme.Skin
import com.thonyfd.financedashboard.ui.theme.ThemeMode
import com.thonyfd.financedashboard.widget.WidgetAppearancePreferences
import com.thonyfd.financedashboard.widget.WidgetKind
import com.thonyfd.financedashboard.widget.visibleWidgetKinds
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/** Opacidad, skin y modo de cada widget visible; se aplica al pulsar "Guardar". */
@Composable
fun WidgetAppearanceDialog(isOwner: Boolean, onDismiss: () -> Unit, onSaved: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val kinds = remember(isOwner) { visibleWidgetKinds(isOwner) }
    val opacities = remember(kinds) {
        mutableStateMapOf<WidgetKind, Float>().apply {
            kinds.forEach { put(it, WidgetAppearancePreferences.getOpacity(context, it)) }
        }
    }
    val skins = remember(kinds) {
        mutableStateMapOf<WidgetKind, Skin>().apply {
            kinds.forEach { put(it, WidgetAppearancePreferences.getSkin(context, it)) }
        }
    }
    val modes = remember(kinds) {
        mutableStateMapOf<WidgetKind, ThemeMode>().apply {
            kinds.forEach { put(it, WidgetAppearancePreferences.getMode(context, it)) }
        }
    }
    var applying by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = AppTheme.colors.surface,
        titleContentColor = AppTheme.colors.text,
        textContentColor = AppTheme.colors.textSecondary,
        icon = { Icon(Icons.Default.Widgets, null, tint = AppTheme.colors.accent) },
        title = { Text("Widgets", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Text("Ajusta la transparencia, el skin y el modo de cada widget. El contenido permanece visible mientras cambia el fondo.")
                kinds.forEach { kind ->
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        WidgetOpacitySlider(kind.label, opacities.getValue(kind)) { opacities[kind] = it }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Skin.SELECTABLE.forEach { option ->
                                SelectableChip(
                                    label = option.label(),
                                    selected = skins[kind] == option,
                                    onClick = { skins[kind] = option }
                                )
                            }
                        }
                        Text("Modo", color = AppTheme.colors.text, style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            ThemeMode.entries.forEach { option ->
                                SelectableChip(
                                    label = option.label(),
                                    selected = modes[kind] == option,
                                    onClick = { modes[kind] = option }
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            AppButton(
                "Guardar",
                style = AppButtonStyle.Text,
                loading = applying,
                onClick = {
                    kinds.forEach { kind ->
                        WidgetAppearancePreferences.setOpacity(context, kind, opacities.getValue(kind))
                        WidgetAppearancePreferences.setSkin(context, kind, skins.getValue(kind))
                        WidgetAppearancePreferences.setMode(context, kind, modes.getValue(kind))
                    }
                    scope.launch {
                        applying = true
                        try {
                            WidgetAppearancePreferences.refreshAll(context)
                            onSaved()
                        } finally {
                            applying = false
                        }
                    }
                }
            )
        },
        dismissButton = {
            AppButton("Cancelar", onClick = onDismiss, style = AppButtonStyle.Text, enabled = !applying)
        }
    )
}

@Composable
private fun WidgetOpacitySlider(label: String, value: Float, onValueChange: (Float) -> Unit) {
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, color = AppTheme.colors.text, fontWeight = FontWeight.Medium)
            Text("${(value * 100).roundToInt()}%", color = AppTheme.colors.accent, fontWeight = FontWeight.Bold)
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = WidgetAppearancePreferences.MIN_OPACITY..1f,
            steps = 7,
            colors = SliderDefaults.colors(
                thumbColor = AppTheme.colors.accent,
                activeTrackColor = AppTheme.colors.depth,
                inactiveTrackColor = AppTheme.colors.hairline
            )
        )
    }
}

@Composable
private fun SelectableChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(12.dp)
    Text(
        label,
        color = if (selected) AppTheme.colors.accent else AppTheme.colors.text,
        style = MaterialTheme.typography.bodySmall,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        modifier = Modifier
            .clip(shape)
            .background(if (selected) AppTheme.colors.accent.copy(alpha = 0.14f) else AppTheme.colors.surfaceRaised)
            .border(1.dp, if (selected) AppTheme.colors.accent else AppTheme.colors.hairline, shape)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp)
    )
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
