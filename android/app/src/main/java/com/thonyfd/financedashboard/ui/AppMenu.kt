package com.thonyfd.financedashboard.ui

import android.widget.Toast
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DrawerState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.auth.signOutWithFallback
import com.thonyfd.financedashboard.ui.theme.AppColors
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

/** Menú lateral de la app: cuenta activa y cerrar sesión con confirmación. */
@Composable
fun AppMenuDrawer(drawerState: DrawerState, content: @Composable () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var confirmSignOut by remember { mutableStateOf(false) }
    var signingOut by remember { mutableStateOf(false) }
    val email = remember { SupabaseConfig.client.auth.currentUserOrNull()?.email }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = AppColors.Deep, drawerContentColor = AppColors.Ice) {
                Column(Modifier.padding(horizontal = 24.dp, vertical = 28.dp)) {
                    Text("CUENTA", color = AppColors.Cyan, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text(email ?: "Sin correo", color = AppColors.Ice, style = MaterialTheme.typography.titleMedium)
                }
                HorizontalDivider(color = AppColors.Hairline)
                Spacer(Modifier.height(8.dp))
                NavigationDrawerItem(
                    label = { Text("Cerrar sesión") },
                    icon = { Icon(Icons.AutoMirrored.Outlined.Logout, null) },
                    selected = false,
                    onClick = { confirmSignOut = true },
                    modifier = Modifier.padding(horizontal = 12.dp),
                    colors = NavigationDrawerItemDefaults.colors(
                        unselectedContainerColor = AppColors.Deep,
                        unselectedTextColor = AppColors.Ice,
                        unselectedIconColor = AppColors.Coral
                    )
                )
            }
        },
        content = content
    )

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { if (!signingOut) confirmSignOut = false },
            containerColor = AppColors.Panel,
            titleContentColor = AppColors.Ice,
            textContentColor = AppColors.Mist,
            icon = { Icon(Icons.AutoMirrored.Outlined.Logout, null, tint = AppColors.Coral) },
            title = { Text("Cerrar sesión", fontWeight = FontWeight.Bold) },
            text = { Text("¿Seguro que quieres salir? Tendrás que entrar con Google de nuevo.") },
            confirmButton = {
                AppButton(
                    "Salir",
                    style = AppButtonStyle.Danger,
                    loading = signingOut,
                    onClick = {
                        scope.launch {
                            signingOut = true
                            val auth = SupabaseConfig.client.auth
                            signOutWithFallback(signOut = { auth.signOut() }, clearSession = { auth.clearSession() })
                            Toast.makeText(context, "¡Vuelve pronto!", Toast.LENGTH_SHORT).show()
                        }
                    }
                )
            },
            dismissButton = {
                AppButton("Cancelar", style = AppButtonStyle.Text, enabled = !signingOut, onClick = { confirmSignOut = false })
            }
        )
    }
}
