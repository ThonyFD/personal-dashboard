package com.thonyfd.financedashboard.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class FinanceWidgetReceiver : GlanceAppWidgetReceiver() {

    override val glanceAppWidget: GlanceAppWidget = FinanceWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        // First widget added — kick off immediate refresh and schedule periodic
        FinanceWidgetWorker.scheduleImmediate(context)
        FinanceWidgetWorker.schedule(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        FinanceWidgetWorker.scheduleImmediate(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // Refresh on boot completed
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            FinanceWidgetWorker.schedule(context)
            FinanceWidgetWorker.scheduleImmediate(context)
        }
    }
}
