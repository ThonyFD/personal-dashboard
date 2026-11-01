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
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.auth.AuthGateState
import com.thonyfd.financedashboard.data.auth.NETWORK_ERROR_MESSAGE
import com.thonyfd.financedashboard.data.auth.signInErrorMessage
import com.thonyfd.financedashboard.data.auth.toGateState
import com.thonyfd.financedashboard.ui.theme.AppColors
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.compose.auth.composable.NativeSignInResult
import io.github.jan.supabase.compose.auth.composable.rememberSignInWithGoogle
import io.github.jan.supabase.compose.auth.composeAuth

/** Muestra [content] solo con sesión; mientras carga la sesión guardada no muestra el login. */
@Composable
fun LoginGate(content: @Composable () -> Unit) {
    val status by SupabaseConfig.client.auth.sessionStatus.collectAsState()
    when (status.toGateState()) {
        AuthGateState.Loading -> Box(
            Modifier.fillMaxSize().background(AppColors.Night),
            contentAlignment = Alignment.Center
        ) { CircularProgressIndicator(color = AppColors.Cyan) }
        AuthGateState.LoggedOut -> LoginScreen()
        AuthGateState.LoggedIn -> content()
    }
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
        Modifier.fillMaxSize().background(AppColors.Night).padding(horizontal = 28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("BIENVENIDO", color = AppColors.Cyan, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text("Entra a tu dashboard", color = AppColors.Ice, fontSize = 26.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(
            "Usa tu cuenta de Google para sincronizar finanzas, hábitos y proyectos con la web.",
            color = AppColors.Mist, fontSize = 14.sp, textAlign = TextAlign.Center
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
            Text(it, color = AppColors.Mist, fontSize = 13.sp, textAlign = TextAlign.Center)
        }
    }
}

private fun isOnline(context: Context): Boolean {
    val cm = context.getSystemService(ConnectivityManager::class.java) ?: return true
    val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}
