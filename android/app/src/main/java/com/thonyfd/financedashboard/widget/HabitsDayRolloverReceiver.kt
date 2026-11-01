package com.thonyfd.financedashboard.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/**
 * Refresca el widget de hábitos al cambiar de día. El worker periódico de 30 min no basta:
 * en Doze (teléfono quieto de noche) WorkManager lo pospone y en la mañana se veía el día anterior.
 * setAndAllowWhileIdle sí se dispara en Doze y da una ventana corta con red para refrescar.
 */
class HabitsDayRolloverReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val appContext = context.applicationContext
        schedule(appContext)
        if (intent.action != ACTION_ROLLOVER && intent.action != Intent.ACTION_TIME_CHANGED &&
            intent.action != Intent.ACTION_TIMEZONE_CHANGED
        ) return

        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                // Pinta el día nuevo en blanco aunque no haya red (el store ya marca los datos como viejos)
                HabitsWidget().updateAll(appContext)
                val ok = withTimeoutOrNull(REFRESH_TIMEOUT_MS) { HabitsWidgetRefresher.refresh(appContext) } == true
                HabitsWidget().updateAll(appContext)
                // Sin red en la ventana de Doze: el worker lo reintenta cuando vuelva la conexión
                if (!ok) FinanceWidgetWorker.scheduleImmediate(appContext)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        private const val ACTION_ROLLOVER = "com.thonyfd.financedashboard.HABITS_DAY_ROLLOVER"
        private const val REFRESH_TIMEOUT_MS = 20_000L

        /** Programa la próxima alarma a las 00:01. Idempotente: reemplaza la anterior. */
        fun schedule(context: Context) {
            val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return
            val intent = Intent(context, HabitsDayRolloverReceiver::class.java).setAction(ACTION_ROLLOVER)
            val pendingIntent = PendingIntent.getBroadcast(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val triggerAt = LocalDate.now().plusDays(1)
                .atTime(LocalTime.of(0, 1))
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli()
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        }
    }
}
