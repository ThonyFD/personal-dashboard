package com.thonyfd.financedashboard.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.thonyfd.financedashboard.data.repository.HabitRepository
import com.thonyfd.financedashboard.data.repository.FinanceRepository
import java.time.LocalDate
import java.util.concurrent.TimeUnit

class FinanceWidgetWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val repo = FinanceRepository()
            val today = LocalDate.now()

            // 1. Actualizar widget principal con el mes seleccionado
            val (year, month) = FinanceWidgetStateStore.getSelectedYearMonth(context)
            val mainData = repo.getWidgetData(year, month)
            FinanceWidgetStateStore.saveWidgetData(context, mainData)
            FinanceWidget().updateAll(context)

            // 2. Actualizar widget de pagos siempre con el mes actual
            //    Reutiliza los datos si el mes seleccionado ya es el actual
            val currentData = if (year == today.year && month == today.monthValue) {
                mainData
            } else {
                repo.getWidgetData(today.year, today.monthValue)
            }
            PaymentsWidgetStateStore.saveWidgetData(context, currentData)
            PaymentsWidget().updateAll(context)

            val habitsData = HabitRepository().buildWidgetData(today)
            HabitsWidgetStateStore.saveWidgetData(context, habitsData)
            HabitsWidget().updateAll(context)

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME = "finance_widget_refresh"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<FinanceWidgetWorker>(
                repeatInterval = 30,
                repeatIntervalTimeUnit = TimeUnit.MINUTES
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }

        fun scheduleImmediate(context: Context) {
            val request = androidx.work.OneTimeWorkRequestBuilder<FinanceWidgetWorker>().build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
