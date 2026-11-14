package com.thonyfd.financedashboard.widget

import com.thonyfd.financedashboard.data.SupabaseConfig
import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
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
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.thonyfd.financedashboard.data.models.CategorySpend
import com.thonyfd.financedashboard.data.models.Transaction
import com.thonyfd.financedashboard.data.models.UpcomingPayment
import com.thonyfd.financedashboard.data.models.WidgetData
import com.thonyfd.financedashboard.data.repository.FinanceRepository
import com.thonyfd.financedashboard.ui.MainActivity

private val CATEGORY_NAME_KEY = ActionParameters.Key<String>("categoryName")
private val CATEGORY_EMOJI_KEY = ActionParameters.Key<String>("categoryEmoji")

class FinanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        if (!widgetIsOwner(context)) {
            provideContent {
                val colors = widgetColors(LocalContext.current, WidgetKind.FINANCE)
                CompositionLocalProvider(LocalWidgetColors provides colors) {
                    GlanceTheme { WidgetNotAvailable() }
                }
            }
            return
        }
        val (year, month) = FinanceWidgetStateStore.getSelectedYearMonth(context)
        var data = FinanceWidgetStateStore.loadWidgetData(context)

        val needsFresh = data.lastUpdated == "--:--" || data.monthLabel.isEmpty()
        if (needsFresh) {
            data = try {
                SupabaseConfig.awaitAuth()
                val fresh = FinanceRepository().getWidgetData(year, month)
                FinanceWidgetStateStore.saveWidgetData(context, fresh)
                fresh
            } catch (e: Exception) {
                data.copy(isError = true, errorMessage = e.message)
            }
        }

        provideContent {
            val colors = widgetColors(LocalContext.current, WidgetKind.FINANCE)
            CompositionLocalProvider(LocalWidgetColors provides colors) {
                GlanceTheme {
                    FinanceWidgetContent(data = data)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
@Composable
private fun FinanceWidgetContent(data: WidgetData) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(WidgetTheme.colors.bg)
            .padding(10.dp)
            .clickable(actionStartActivity<MainActivity>())
    ) {
        WidgetHeader(lastUpdated = data.lastUpdated)

        Spacer(modifier = GlanceModifier.height(6.dp))

        if (data.isError) {
            ErrorState()
            return@Column
        }

        // Month nav full width
        MonthNavCard(
            monthLabel = data.monthLabel,
            txnCount = data.txnCount,
            pendingCount = data.pendingCount,
            isCurrentMonth = data.isCurrentMonth,
            modifier = GlanceModifier.fillMaxWidth()
        )

        Spacer(modifier = GlanceModifier.height(6.dp))

        // Summary cards: metrics group + totals group
        SummaryRow(data)

        Spacer(modifier = GlanceModifier.height(8.dp))

        // Middle row: upcoming payments + recent transactions
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            Column(modifier = GlanceModifier.defaultWeight()) {
                SectionTitle("Próximos pagos")
                if (data.upcomingPayments.isEmpty()) {
                    SmallText(if (data.isCurrentMonth) "Todo al día ✓" else "Sin pendientes")
                } else {
                    data.upcomingPayments.take(3).forEach { UpcomingPaymentRow(it) }
                }
            }
            Spacer(modifier = GlanceModifier.width(8.dp))
            Column(modifier = GlanceModifier.defaultWeight()) {
                SectionTitle("Últimas txns")
                if (data.recentTransactions.isEmpty()) {
                    SmallText("Sin transacciones")
                } else {
                    data.recentTransactions.take(3).forEach { RecentTransactionRow(it) }
                }
            }
        }

        Spacer(modifier = GlanceModifier.height(8.dp))

        // Bottom: categories (up to 8 chips in 2 rows)
        if (data.topCategories.isNotEmpty()) {
            Column(modifier = GlanceModifier.fillMaxWidth()) {
                SectionTitle("Top categorías")
                val firstRow = data.topCategories.take(4)
                Row(modifier = GlanceModifier.fillMaxWidth()) {
                    firstRow.forEachIndexed { i, cat ->
                        CategoryChip(cat, modifier = GlanceModifier.defaultWeight())
                        if (i < firstRow.size - 1) {
                            Spacer(modifier = GlanceModifier.width(4.dp))
                        }
                    }
                }
                val secondRow = data.topCategories.drop(4).take(4)
                if (secondRow.isNotEmpty()) {
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Row(modifier = GlanceModifier.fillMaxWidth()) {
                        secondRow.forEachIndexed { i, cat ->
                            CategoryChip(cat, modifier = GlanceModifier.defaultWeight())
                            if (i < secondRow.size - 1) {
                                Spacer(modifier = GlanceModifier.width(4.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
@Composable
private fun WidgetHeader(lastUpdated: String) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        WidgetText(
            text = "💰 Finance",
            style = TextStyle(
                color = WidgetTheme.colors.accent,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
        )
        Spacer(modifier = GlanceModifier.defaultWeight())
        WidgetText(
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
                .clickable(actionRunCallback<RefreshAction>()),
            contentAlignment = Alignment.Center
        ) {
            WidgetText(
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
// Summary Row — metrics group (4) + totals group (2)
// ---------------------------------------------------------------------------
@Composable
private fun SummaryRow(data: WidgetData) {
    Row(modifier = GlanceModifier.fillMaxWidth()) {
        // Metrics group
        Row(
            modifier = GlanceModifier
                .defaultWeight()
                .background(WidgetTheme.colors.surface)
                .cornerRadius(8.dp)
                .padding(4.dp)
        ) {
            CompactMetric("Gastos",  data.totalGastos,    WidgetTheme.colors.text, GlanceModifier.defaultWeight())
            CompactMetric("Inv",     data.totalInversion, WidgetTheme.colors.positive, GlanceModifier.defaultWeight())
            CompactMetric("Deuda",   data.totalDeuda,     WidgetTheme.colors.negative, GlanceModifier.defaultWeight())
            CompactMetric("Ahorro",  data.totalAhorro,    WidgetTheme.colors.accent, GlanceModifier.defaultWeight())
        }
        Spacer(modifier = GlanceModifier.width(4.dp))
        // Totals group
        Row(
            modifier = GlanceModifier
                .defaultWeight()
                .background(WidgetTheme.colors.surface)
                .cornerRadius(8.dp)
                .padding(4.dp)
        ) {
            CompactMetric(
                "Saldo",
                data.saldoFinal,
                if (data.saldoFinal >= 0) WidgetTheme.colors.positive else WidgetTheme.colors.negative,
                GlanceModifier.defaultWeight()
            )
            CompactMetric("Total",  data.totalSpent, WidgetTheme.colors.depth, GlanceModifier.defaultWeight())
        }
    }
}

@Composable
private fun CompactMetric(label: String, amount: Double, color: ColorProvider, modifier: GlanceModifier) {
    Column(
        modifier = modifier.padding(3.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        WidgetText(
            text = label,
            style = TextStyle(color = WidgetTheme.colors.textSecondary, fontSize = 8.sp)
        )
        WidgetText(
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
// Spend Card (left of top row)
// ---------------------------------------------------------------------------
@Composable
private fun SpendCard(spend: Double, modifier: GlanceModifier) {
    Column(
        modifier = modifier
            .background(WidgetTheme.colors.surface)
            .cornerRadius(8.dp)
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        WidgetText(
            text = "Gasto del mes",
            style = TextStyle(
                color = WidgetTheme.colors.textSecondary,
                fontSize = 10.sp
            )
        )
        val spendText = "$${String.format("%,.2f", spend)}"
        WidgetKpiText(
            text = spendText,
            sizeSp = 20f,
            color = WidgetTheme.colors.text,
            contentDescription = spendText
        )
    }
}

// ---------------------------------------------------------------------------
// Month Navigator Card (right of top row)
// ---------------------------------------------------------------------------
@Composable
private fun MonthNavCard(
    monthLabel: String,
    txnCount: Int,
    pendingCount: Int,
    isCurrentMonth: Boolean,
    modifier: GlanceModifier
) {
    Column(
        modifier = modifier
            .background(WidgetTheme.colors.surface)
            .cornerRadius(8.dp)
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        // Month navigation row
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = GlanceModifier
                    .background(WidgetTheme.colors.bgSolid)
                    .cornerRadius(6.dp)
                    .padding(horizontal = 12.dp, vertical = 6.dp)
                    .clickable(actionRunCallback<PrevMonthAction>()),
                contentAlignment = Alignment.Center
            ) {
                WidgetText(
                    text = "◀",
                    style = TextStyle(
                        color = WidgetTheme.colors.accent,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
            }
            Spacer(modifier = GlanceModifier.defaultWeight())
            WidgetText(
                text = monthLabel.split(" ").let { parts ->
                    if (parts.size >= 2) "${parts[0]} ${parts[1].takeLast(2)}" else monthLabel
                },
                style = TextStyle(
                    color = WidgetTheme.colors.text,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            )
            Spacer(modifier = GlanceModifier.defaultWeight())
            Box(
                modifier = if (!isCurrentMonth)
                    GlanceModifier
                        .background(WidgetTheme.colors.bgSolid)
                        .cornerRadius(6.dp)
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .clickable(actionRunCallback<NextMonthAction>())
                else
                    GlanceModifier.padding(horizontal = 12.dp, vertical = 6.dp),
                contentAlignment = Alignment.Center
            ) {
                WidgetText(
                    text = if (isCurrentMonth) "" else "▶",
                    style = TextStyle(
                        color = WidgetTheme.colors.accent,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        }

        Spacer(modifier = GlanceModifier.height(4.dp))

        // KPIs row
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            Column(modifier = GlanceModifier.defaultWeight()) {
                WidgetText(
                    text = "$txnCount",
                    style = TextStyle(
                        color = WidgetTheme.colors.accent,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                WidgetText(
                    text = "txns",
                    style = TextStyle(
                        color = WidgetTheme.colors.textSecondary,
                        fontSize = 9.sp
                    )
                )
            }
            Column(modifier = GlanceModifier.defaultWeight()) {
                WidgetText(
                    text = "$pendingCount",
                    style = TextStyle(
                        color = if (pendingCount > 0) WidgetTheme.colors.warning else WidgetTheme.colors.accent,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                WidgetText(
                    text = "pendientes",
                    style = TextStyle(
                        color = WidgetTheme.colors.textSecondary,
                        fontSize = 9.sp
                    )
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Upcoming Payment Row
// ---------------------------------------------------------------------------
@Composable
private fun UpcomingPaymentRow(payment: UpcomingPayment) {
    val urgencyColor = when {
        payment.daysUntil < 0  -> WidgetTheme.colors.negative
        payment.daysUntil <= 3 -> WidgetTheme.colors.negative
        payment.daysUntil <= 7 -> WidgetTheme.colors.warning
        else                   -> WidgetTheme.colors.textSecondary
    }
    val daysLabel = when {
        payment.daysUntil < 0  -> "día ${payment.day ?: "?"}"
        payment.daysUntil == 0 -> "Hoy"
        payment.daysUntil == 1 -> "Mañana"
        payment.day != null    -> "día ${payment.day}"
        else                   -> "${payment.daysUntil}d"
    }
    val typePrefix = when (payment.transactionType) {
        "Inversión" -> "📈 "
        "Deuda"     -> "🔴 "
        "Ahorro"    -> "💰 "
        else        -> ""
    }

    Row(
        modifier = GlanceModifier.fillMaxWidth().padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            WidgetText(
                text = "$typePrefix${payment.description}",
                style = TextStyle(
                    color = WidgetTheme.colors.text,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                ),
                maxLines = 1
            )
            WidgetText(
                text = "$${String.format("%.2f", payment.amount)}${if (payment.paymentMethod != null) " · ${payment.paymentMethod}" else ""}",
                style = TextStyle(
                    color = WidgetTheme.colors.textSecondary,
                    fontSize = 9.sp
                )
            )
        }
        WidgetText(
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
// Recent Transaction Row
// ---------------------------------------------------------------------------
@Composable
private fun RecentTransactionRow(txn: Transaction) {
    Row(
        modifier = GlanceModifier.fillMaxWidth().padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        WidgetText(
            text = txn.merchantName?.split(" ")?.take(2)?.joinToString(" ") ?: txn.provider,
            style = TextStyle(
                color = WidgetTheme.colors.text,
                fontSize = 10.sp
            ),
            maxLines = 1,
            modifier = GlanceModifier.defaultWeight()
        )
        WidgetText(
            text = "-$${String.format("%.0f", txn.amount)}",
            style = TextStyle(
                color = WidgetTheme.colors.negative,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        )
    }
}

// ---------------------------------------------------------------------------
// Category Chip (4 per row)
// ---------------------------------------------------------------------------
@Composable
private fun CategoryChip(category: CategorySpend, modifier: GlanceModifier) {
    Column(
        modifier = modifier
            .background(WidgetTheme.colors.surface)
            .cornerRadius(6.dp)
            .padding(5.dp)
            .clickable(
                actionRunCallback<OpenCategoryAction>(
                    actionParametersOf(
                        CATEGORY_NAME_KEY to category.name,
                        CATEGORY_EMOJI_KEY to category.emoji
                    )
                )
            ),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        WidgetText(text = category.emoji, style = TextStyle(fontSize = 13.sp))
        WidgetText(
            text = "${category.percentage}%",
            style = TextStyle(
                color = WidgetTheme.colors.accent,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        )
        WidgetText(
            text = category.name,
            style = TextStyle(
                color = WidgetTheme.colors.textSecondary,
                fontSize = 8.sp
            ),
            maxLines = 1
        )
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
@Composable
private fun SectionTitle(text: String) {
    WidgetText(
        text = text.uppercase(),
        style = TextStyle(
            color = WidgetTheme.colors.accent,
            fontSize = 8.sp,
            fontWeight = FontWeight.Bold
        ),
        modifier = GlanceModifier.padding(bottom = 2.dp)
    )
}

@Composable
private fun SmallText(text: String) {
    WidgetText(
        text = text,
        style = TextStyle(
            color = WidgetTheme.colors.textPassive,
            fontSize = 10.sp
        )
    )
}

@Composable
private fun ErrorState() {
    Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        WidgetText(
            text = "⚠️ Error al cargar\nToca ↻ para reintentar",
            style = TextStyle(
                color = WidgetTheme.colors.negative,
                fontSize = 12.sp
            )
        )
    }
}

// ---------------------------------------------------------------------------
// Action Callbacks
// ---------------------------------------------------------------------------

class RefreshAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        FinanceWidgetWorker.scheduleImmediate(context)
    }
}

class PrevMonthAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val (year, month) = FinanceWidgetStateStore.getSelectedYearMonth(context)
        val prev = java.time.YearMonth.of(year, month).minusMonths(1)
        FinanceWidgetStateStore.setSelectedYearMonth(context, prev.year, prev.monthValue)
        FinanceWidgetStateStore.invalidateCache(context)
        FinanceWidget().updateAll(context)
    }
}

class NextMonthAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val (year, month) = FinanceWidgetStateStore.getSelectedYearMonth(context)
        val next = java.time.YearMonth.of(year, month).plusMonths(1)
        val now = java.time.YearMonth.now()
        if (!next.isAfter(now)) {
            FinanceWidgetStateStore.setSelectedYearMonth(context, next.year, next.monthValue)
            FinanceWidgetStateStore.invalidateCache(context)
            FinanceWidget().updateAll(context)
        }
    }
}

class OpenCategoryAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val categoryName = parameters[CATEGORY_NAME_KEY] ?: return
        val categoryEmoji = parameters[CATEGORY_EMOJI_KEY] ?: "💳"
        val (year, month) = FinanceWidgetStateStore.getSelectedYearMonth(context)
        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra("CATEGORY_NAME", categoryName)
            putExtra("CATEGORY_EMOJI", categoryEmoji)
            putExtra("YEAR", year)
            putExtra("MONTH", month)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        context.startActivity(intent)
    }
}

private suspend fun refreshAndUpdate(context: Context) {
    val (year, month) = FinanceWidgetStateStore.getSelectedYearMonth(context)
    if (widgetIsOwner(context)) try {
        SupabaseConfig.awaitAuth()
        val data = FinanceRepository().getWidgetData(year, month)
        FinanceWidgetStateStore.saveWidgetData(context, data)
    } catch (_: Exception) { }
    FinanceWidget().updateAll(context)
}
