package com.thonyfd.financedashboard.data

import android.util.Log
import com.thonyfd.financedashboard.BuildConfig
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.compose.auth.ComposeAuth
import io.github.jan.supabase.compose.auth.googleNativeLogin
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseConfig {
    val client by lazy {
        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            // Defaults persist the session on device and refresh it automatically.
            install(Auth)
            install(ComposeAuth) {
                googleNativeLogin(serverClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID)
            }
            install(Postgrest)
        }
    }

    /**
     * Waits until the saved session is loaded from storage. Background entry points (widgets,
     * workers, receivers) call this before their first query so requests carry the user's token.
     * Never throws: without a session, queries fall back to the anon key.
     */
    suspend fun awaitAuth() {
        runCatching { client.auth.awaitInitialization() }
            .onFailure { Log.w("SupabaseConfig", "Auth initialization failed", it) }
    }
}
