package com.thonyfd.financedashboard.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.thonyfd.financedashboard.push.PushRepository
import com.thonyfd.financedashboard.push.PushSetup
import com.thonyfd.financedashboard.push.needsNotificationPermission
import com.thonyfd.financedashboard.push.pushErrorSummary
import com.thonyfd.financedashboard.ui.theme.AppTheme
import kotlinx.coroutines.launch

/**
 * Push on/off for this phone only, like the web dashboard. Owner only, and hidden when
 * the build has no Firebase values. State comes from the server each time the menu opens.
 */
@Composable
fun PushMenuItem(isOwner: Boolean, drawerOpen: Boolean) {
    if (!isOwner || !PushSetup.isAvailable) return

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var enabled by remember { mutableStateOf<Boolean?>(null) }
    var busy by remember { mutableStateOf(false) }

    suspend fun readServerState() {
        enabled = runCatching { PushRepository.isEnabledOnThisDevice() }
            .onFailure { Log.w("Push", "Push state read failed: ${pushErrorSummary(it)}") }
            .getOrDefault(false)
    }

    fun change(action: suspend () -> Unit, successMessage: String, target: Boolean) {
        scope.launch {
            busy = true
            runCatching { action() }
                .onSuccess {
                    enabled = target
                    Toast.makeText(context, successMessage, Toast.LENGTH_SHORT).show()
                }
                .onFailure {
                    Log.w("Push", "Push switch failed: ${pushErrorSummary(it)}")
                    readServerState()
                    Toast.makeText(context, "No se pudo cambiar las notificaciones", Toast.LENGTH_SHORT).show()
                }
            busy = false
        }
    }

    fun turnOn() = change({ PushRepository.enable(context) }, "Notificaciones activadas en este teléfono", true)
    fun turnOff() = change({ PushRepository.disable(context) }, "Notificaciones apagadas en este teléfono", false)

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            turnOn()
        } else {
            enabled = false
            Toast.makeText(context, "Permite las notificaciones en Ajustes de Android", Toast.LENGTH_LONG).show()
        }
    }

    fun toggle(on: Boolean) {
        if (busy) return
        if (!on) return turnOff()
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (needsNotificationPermission(Build.VERSION.SDK_INT, granted)) {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            turnOn()
        }
    }

    LaunchedEffect(drawerOpen) {
        if (drawerOpen) {
            busy = true
            readServerState()
            busy = false
        }
    }

    NavigationDrawerItem(
        label = { Text("Notificaciones") },
        icon = { Icon(Icons.Outlined.Notifications, null) },
        badge = {
            Switch(
                checked = enabled == true,
                onCheckedChange = { toggle(it) },
                enabled = !busy && enabled != null,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = AppTheme.colors.accent,
                    checkedTrackColor = AppTheme.colors.accent.copy(alpha = 0.4f)
                )
            )
        },
        selected = false,
        onClick = { enabled?.let { toggle(!it) } },
        modifier = Modifier.padding(horizontal = 12.dp),
        colors = NavigationDrawerItemDefaults.colors(
            unselectedContainerColor = AppTheme.colors.surfaceLow,
            unselectedTextColor = AppTheme.colors.text,
            unselectedIconColor = AppTheme.colors.accent
        )
    )
}
