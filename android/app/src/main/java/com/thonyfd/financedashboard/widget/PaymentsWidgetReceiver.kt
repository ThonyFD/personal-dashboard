package com.thonyfd.financedashboard.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class PaymentsWidgetReceiver : GlanceAppWidgetReceiver() {

    override val glanceAppWidget: GlanceAppWidget = PaymentsWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
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
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            FinanceWidgetWorker.schedule(context)
            FinanceWidgetWorker.scheduleImmediate(context)
        }
    }
}
