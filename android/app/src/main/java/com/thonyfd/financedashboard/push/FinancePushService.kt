package com.thonyfd.financedashboard.push

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.thonyfd.financedashboard.R
import com.thonyfd.financedashboard.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * In the background the system shows pushes by itself, using the android block the
 * sender adds (channel, tag). This service covers the rest: a rotated token, and pushes
 * that arrive while the app is in the foreground, where FCM shows nothing.
 */
class FinancePushService : FirebaseMessagingService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Deprecated in favour of onRegistered (installation IDs), which needs the FCM v2
    // send API. The sender (firebase-admin, scripts/production/lib/push.ts) still sends
    // to registration tokens, so the token callback is the one that matches it.
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onNewToken(token: String) {
        val context = applicationContext
        scope.launch {
            val registered = refreshTokenIfEnabled(PushRepository.isFlagOn(context), token) {
                PushRepository.register(context, it)
            }
            if (PushRepository.isFlagOn(context) && !registered) {
                Log.w("Push", "New token not registered; turn Notificaciones on again from the menu")
            }
        }
    }

    @SuppressLint("MissingPermission") // checked through areNotificationsEnabled()
    override fun onMessageReceived(message: RemoteMessage) {
        val notification = message.notification ?: return
        val manager = NotificationManagerCompat.from(this)
        if (!manager.areNotificationsEnabled()) return

        val tag = message.data["tag"]
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            tabForPushTag(tag)?.let { putExtra(MainActivity.EXTRA_OPEN_TAB, it) }
        }
        val pending = PendingIntent.getActivity(
            this,
            tag.hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val built = NotificationCompat.Builder(this, notification.channelId ?: channelForTag(tag))
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setColor(ContextCompat.getColor(this, R.color.notification_accent))
            .setContentTitle(notification.title)
            .setContentText(notification.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(notification.body))
            .setContentIntent(pending)
            .setAutoCancel(true)
            .build()
        // Same tag replaces the previous notification, like on the web.
        manager.notify(tag, 0, built)
    }
}
