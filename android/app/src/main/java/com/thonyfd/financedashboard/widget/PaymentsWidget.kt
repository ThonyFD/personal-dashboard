package com.thonyfd.financedashboard.widget

import com.thonyfd.financedashboard.data.SupabaseConfig
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.thonyfd.financedashboard.data.models.UpcomingPayment
import com.thonyfd.financedashboard.data.repository.FinanceRepository
import com.thonyfd.financedashboard.ui.MainActivity
import java.time.LocalDate

class PaymentsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val colors = widgetColors(context, WidgetKind.PAYMENTS)
        if (!widgetIsOwner(context)) {
            provideContent {
                CompositionLocalProvider(LocalWidgetColors provides colors) {
                    GlanceTheme { WidgetNotAvailable() }
                }
            }
            return
        }
        var data = PaymentsWidgetStateStore.loadWidgetData(context)

        val needsFresh = data.lastUpdated == "--:--"
        if (needsFresh) {
            val today = LocalDate.now()
            data = try {
                SupabaseConfig.awaitAuth()
                val fresh = FinanceRepository().getWidgetData(today.year, today.monthValue)
                PaymentsWidgetStateStore.saveWidgetData(context, fresh)
                PaymentsWidgetStateStore.loadWidgetData(context)
            } catch (e: Exception) {
                data.copy(isError = true)
            }
        }

        provideContent {
            CompositionLocalProvider(LocalWidgetColors provides colors) {
                GlanceTheme {
                    PaymentsWidgetContent(data = data)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
@Composable
private fun PaymentsWidgetContent(data: PaymentsWidgetData) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(WidgetTheme.colors.bg)
            .padding(10.dp)
            .clickable(actionStartActivity<MainActivity>())
    ) {
        PaymentsHeader(lastUpdated = data.lastUpdated)

        Spacer(modifier = GlanceModifier.height(6.dp))

        if (data.isError) {
            Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "⚠️ Error al cargar\nToca ↻ para reintentar",
                    style = TextStyle(
                        color = WidgetTheme.colors.negative,
                        fontSize = 12.sp
                    )
                )
            }
            return@Column
        }

        // Chips de acumulados (Gastos · Inv · Deuda · Ahorro · Saldo)
        AccumulatedChipsRow(data)

        Spacer(modifier = GlanceModifier.height(8.dp))

        // Sección pagos: vencidos primero, luego por daysUntil asc
        val sorted = data.upcomingPayments.sortedWith(compareBy { it.daysUntil })

        Text(
            text = "PAGOS PENDIENTES",
            style = TextStyle(
                color = WidgetTheme.colors.accent,
                fontSize = 8.sp,
                fontWeight = FontWeight.Bold
            ),
            modifier = GlanceModifier.padding(bottom = 4.dp)
        )

        if (sorted.isEmpty()) {
            Box(
                modifier = GlanceModifier.fillMaxWidth().padding(vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "✅ Todo al día",
                    style = TextStyle(
                        color = WidgetTheme.colors.accent,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        } else {
            sorted.take(6).forEach { payment ->
                PaymentRow(payment)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
@Composable
private fun PaymentsHeader(lastUpdated: String) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "💳 Pagos",
            style = TextStyle(
                color = WidgetTheme.colors.accent,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
        )
        Spacer(modifier = GlanceModifier.defaultWeight())
        Text(
            text = lastUpdated,
            style = TextStyle(
                color = WidgetTheme.colors.textPassive,
                fontSize = 9.sp
            )
        )
        Spacer(modifier = GlanceModifier.width(4.dp))
        Box(
            modifier = GlanceModifier
                .background(WidgetTheme.colors.surface)
                .cornerRadius(6.dp)
                .padding(horizontal = 10.dp, vertical = 5.dp)
                .clickable(actionRunCallback<PaymentsRefreshAction>()),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "↻",
                style = TextStyle(
                    color = WidgetTheme.colors.accent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Chips de acumulados
// ---------------------------------------------------------------------------
@Composable
private fun AccumulatedChipsRow(data: PaymentsWidgetData) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .background(WidgetTheme.colors.surface)
            .cornerRadius(8.dp)
            .padding(4.dp)
    ) {
        AccumulatedChip("Gastos",  data.totalGastos,    WidgetTheme.colors.text, GlanceModifier.defaultWeight())
        AccumulatedChip("Inv",     data.totalInversion, WidgetTheme.colors.positive, GlanceModifier.defaultWeight())
        AccumulatedChip("Deuda",   data.totalDeuda,     WidgetTheme.colors.negative, GlanceModifier.defaultWeight())
        AccumulatedChip("Ahorro",  data.totalAhorro,    WidgetTheme.colors.accent, GlanceModifier.defaultWeight())
        AccumulatedChip(
            label  = "Saldo",
            amount = data.saldoFinal,
            color  = if (data.saldoFinal >= 0) WidgetTheme.colors.positive else WidgetTheme.colors.negative,
            modifier = GlanceModifier.defaultWeight()
        )
    }
}

@Composable
private fun AccumulatedChip(label: String, amount: Double, color: ColorProvider, modifier: GlanceModifier) {
    Column(
        modifier = modifier.padding(3.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = label,
            style = TextStyle(
                color = WidgetTheme.colors.textSecondary,
                fontSize = 8.sp
            )
        )
        Text(
            text = "$${String.format("%.0f", amount)}",
            style = TextStyle(
                color = color,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        )
    }
}

// ---------------------------------------------------------------------------
// Fila de pago
// ---------------------------------------------------------------------------
@Composable
private fun PaymentRow(payment: UpcomingPayment) {
    val urgencyColor = when {
        payment.daysUntil < 0  -> WidgetTheme.colors.negative
        payment.daysUntil <= 1 -> WidgetTheme.colors.negative
        payment.daysUntil <= 3 -> WidgetTheme.colors.warning
        else                   -> WidgetTheme.colors.textSecondary
    }
    val daysLabel = when {
        payment.daysUntil < 0  -> "⚠ VENC"
        payment.daysUntil == 0 -> "Hoy"
        payment.daysUntil == 1 -> "Mañana"
        payment.day != null    -> "día ${payment.day}"
        else                   -> "${payment.daysUntil}d"
    }
    val typeIcon = when (payment.transactionType) {
        "Inversión" -> "📈"
        "Deuda"     -> "🔴"
        "Ahorro"    -> "💰"
        else        -> "💳"
    }

    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = typeIcon,
            style = TextStyle(fontSize = 10.sp),
            modifier = GlanceModifier.padding(end = 4.dp)
        )
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = payment.description,
                style = TextStyle(
                    color = WidgetTheme.colors.text,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                ),
                maxLines = 1
            )
            Text(
                text = "$${String.format("%.2f", payment.amount)}${
                    if (!payment.paymentMethod.isNullOrBlank()) " · ${payment.paymentMethod}" else ""
                }",
                style = TextStyle(
                    color = WidgetTheme.colors.textSecondary,
                    fontSize = 9.sp
                )
            )
        }
        Spacer(modifier = GlanceModifier.width(4.dp))
        Text(
            text = daysLabel,
            style = TextStyle(
                color = urgencyColor,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold
            )
        )
    }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
class PaymentsRefreshAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        FinanceWidgetWorker.scheduleImmediate(context)
    }
}
