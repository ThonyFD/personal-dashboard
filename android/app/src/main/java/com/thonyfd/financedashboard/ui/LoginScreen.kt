package com.thonyfd.financedashboard.ui

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thonyfd.financedashboard.push.PushRepository
import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.auth.AuthGateState
import com.thonyfd.financedashboard.data.auth.NETWORK_ERROR_MESSAGE
import com.thonyfd.financedashboard.data.auth.AccountTracker
import com.thonyfd.financedashboard.data.auth.OwnerCache
import com.thonyfd.financedashboard.data.auth.shouldClearAccountCaches
import com.thonyfd.financedashboard.data.auth.signInErrorMessage
import com.thonyfd.financedashboard.data.auth.toGateState
import com.thonyfd.financedashboard.ui.theme.AppTheme
import com.thonyfd.financedashboard.widget.clearAllAccountCaches
import com.thonyfd.financedashboard.widget.refreshWidgetsForAccount
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.compose.auth.composable.NativeSignInResult
import io.github.jan.supabase.compose.auth.composable.rememberSignInWithGoogle
import io.github.jan.supabase.compose.auth.composeAuth

/**
 * Muestra [content] solo con sesión; mientras carga la sesión guardada no muestra el login.
 * Con sesión, resuelve una vez si la cuenta es dueña antes de mostrar las pestañas.
 */
@Composable
fun LoginGate(content: @Composable (isOwner: Boolean) -> Unit) {
    val context = LocalContext.current
    val status by SupabaseConfig.client.auth.sessionStatus.collectAsState()
    val gate = status.toGateState()
    val userId = (status as? SessionStatus.Authenticated)?.session?.user?.id
    // Keyed on the account so switching accounts never reuses the previous answer
    val isOwner by produceState<Boolean?>(initialValue = null, userId, gate) {
        value = null
        when {
            userId != null -> {
                // Another account was here before: its widget data must not show for this one
                if (shouldClearAccountCaches(AccountTracker.get(context), userId)) clearAllAccountCaches(context)
                AccountTracker.set(context, userId)
                value = OwnerCache.resolve(context, userId)
                refreshWidgetsForAccount(context)
            }
            // Offline refresh failure: same account as before, last known answer
            gate == AuthGateState.LoggedIn -> value = OwnerCache.get(context, null) ?: false
            // Signed out or session lost: nothing of the old account may stay on the widgets
            gate == AuthGateState.LoggedOut && AccountTracker.get(context) != null -> {
                clearAllAccountCaches(context)
                AccountTracker.set(context, null)
                // Finance pushes must not keep reaching a phone nobody is signed in to.
                PushRepository.cleanupAfterSessionLoss(context)
            }
        }
    }
    when (gate) {
        AuthGateState.Loading -> GateSpinner()
        AuthGateState.LoggedOut -> LoginScreen()
        AuthGateState.LoggedIn -> isOwner?.let { content(it) } ?: GateSpinner()
    }
}

@Composable
private fun GateSpinner() {
    Box(
        Modifier.fillMaxSize().background(AppTheme.colors.bg),
        contentAlignment = Alignment.Center
    ) { CircularProgressIndicator(color = AppTheme.colors.accent) }
}

@Composable
private fun LoginScreen() {
    val context = LocalContext.current
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    // On success the session status flow switches LoginGate to the app.
    val signIn = SupabaseConfig.client.composeAuth.rememberSignInWithGoogle(
        onResult = { result ->
            loading = false
            message = when (result) {
                is NativeSignInResult.Success, NativeSignInResult.ClosedByUser -> null
                is NativeSignInResult.NetworkError -> NETWORK_ERROR_MESSAGE
                is NativeSignInResult.Error -> {
                    Log.w("LoginScreen", "Google sign-in failed: ${result.message}", result.exception)
                    signInErrorMessage(result.exception, isOnline(context))
                }
            }
        }
    )

    Column(
        Modifier.fillMaxSize().background(AppTheme.colors.bg).padding(horizontal = 28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("BIENVENIDO", color = AppTheme.colors.accent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text("Entra a tu dashboard", color = AppTheme.colors.text, fontSize = 26.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(
            "Usa tu cuenta de Google para sincronizar finanzas, hábitos y proyectos con la web.",
            color = AppTheme.colors.textSecondary, fontSize = 14.sp, textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(28.dp))
        AppButton(
            "Entrar con Google",
            onClick = { message = null; loading = true; signIn.startFlow() },
            modifier = Modifier.fillMaxWidth(),
            loading = loading
        )
        message?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = AppTheme.colors.textSecondary, fontSize = 13.sp, textAlign = TextAlign.Center)
        }
    }
}

private fun isOnline(context: Context): Boolean {
    val cm = context.getSystemService(ConnectivityManager::class.java) ?: return true
    val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}
