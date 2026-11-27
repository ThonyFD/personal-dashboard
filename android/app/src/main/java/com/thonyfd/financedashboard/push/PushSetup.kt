package com.thonyfd.financedashboard.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.thonyfd.financedashboard.BuildConfig

/**
 * Firebase is initialised by hand from BuildConfig (values come from local.properties),
 * so the repo never holds a google-services.json. Runs from Application.onCreate, before
 * FCM can start FinancePushService.
 */
object PushSetup {
    @Volatile
    var isAvailable: Boolean = false
        private set

    fun init(context: Context) {
        createChannels(context)
        if (!isFirebaseConfigured(
                BuildConfig.FIREBASE_APP_ID,
                BuildConfig.FIREBASE_API_KEY,
                BuildConfig.FIREBASE_SENDER_ID,
                BuildConfig.FIREBASE_PROJECT_ID
            )
        ) {
            Log.i("Push", "Firebase not configured, push disabled")
            return
        }
        isAvailable = runCatching {
            if (FirebaseApp.getApps(context).isEmpty()) {
                FirebaseApp.initializeApp(
                    context,
                    FirebaseOptions.Builder()
                        .setApplicationId(BuildConfig.FIREBASE_APP_ID)
                        .setApiKey(BuildConfig.FIREBASE_API_KEY)
                        .setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
                        .setProjectId(BuildConfig.FIREBASE_PROJECT_ID)
                        .build()
                )
            }
            true
        }.getOrElse {
            Log.w("Push", "Firebase initialization failed", it)
            false
        }
    }

    private fun createChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannels(
            listOf(
                NotificationChannel(CHANNEL_BUDGET, "Presupuesto", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Alertas de compras contra tus presupuestos"
                },
                NotificationChannel(CHANNEL_PAYMENTS, "Pagos", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Recordatorio diario de pagos pendientes"
                }
            )
        )
    }
}
