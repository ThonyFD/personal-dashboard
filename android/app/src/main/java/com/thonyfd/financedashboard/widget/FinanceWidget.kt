package com.thonyfd.financedashboard.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
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
import androidx.glance.text.Text
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
        val (year, month) = FinanceWidgetStateStore.getSelectedYearMonth(context)
        var data = FinanceWidgetStateStore.loadWidgetData(context)

        val needsFresh = data.lastUpdated == "--:--" || data.monthLabel.isEmpty()
        if (needsFresh) {
            data = try {
                val fresh = FinanceRepository().getWidgetData(year, month)
                FinanceWidgetStateStore.saveWidgetData(context, fresh)
                fresh
            } catch (e: Exception) {
                data.copy(isError = true, errorMessage = e.message)
            }
        }

        provideContent {
            GlanceTheme {
                FinanceWidgetContent(data = data)
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
            .background(ColorProvider(Color(0xFF1A1A2E)))
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

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
@Composable
private fun WidgetHeader(lastUpdated: String) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "💰 Finance",
            style = TextStyle(
                color = ColorProvider(Color(0xFF00D4AA)),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
        )
        Spacer(modifier = GlanceModifier.defaultWeight())
        Text(
            text = "↻ $lastUpdated",
            style = TextStyle(
                color = ColorProvider(Color(0xFF666666)),
                fontSize = 9.sp
            ),
            modifier = GlanceModifier.clickable(actionRunCallback<RefreshAction>())
        )
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
                .background(ColorProvider(Color(0xFF16213E)))
                .cornerRadius(8.dp)
                .padding(4.dp)
        ) {
            CompactMetric("Gastos",  data.totalGastos,    Color(0xFFFFFFFF), GlanceModifier.defaultWeight())
            CompactMetric("Inv",     data.totalInversion, Color(0xFF4CAF50), GlanceModifier.defaultWeight())
            CompactMetric("Deuda",   data.totalDeuda,     Color(0xFFFF6B6B), GlanceModifier.defaultWeight())
            CompactMetric("Ahorro",  data.totalAhorro,    Color(0xFF00D4AA), GlanceModifier.defaultWeight())
        }
        Spacer(modifier = GlanceModifier.width(4.dp))
        // Totals group
        Row(
            modifier = GlanceModifier
                .defaultWeight()
                .background(ColorProvider(Color(0xFF1E1440)))
                .cornerRadius(8.dp)
                .padding(4.dp)
        ) {
            CompactMetric(
                "Saldo",
                data.saldoFinal,
                if (data.saldoFinal >= 0) Color(0xFF4CAF50) else Color(0xFFFF6B6B),
                GlanceModifier.defaultWeight()
            )
            CompactMetric("Total",  data.totalSpent, Color(0xFF805AD5), GlanceModifier.defaultWeight())
        }
    }
}

@Composable
private fun CompactMetric(label: String, amount: Double, color: Color, modifier: GlanceModifier) {
    Column(
        modifier = modifier.padding(3.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = label,
            style = TextStyle(color = ColorProvider(Color(0xFF888888)), fontSize = 8.sp)
        )
        Text(
            text = "$${String.format("%.0f", amount)}",
            style = TextStyle(
                color = ColorProvider(color),
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
            .background(ColorProvider(Color(0xFF16213E)))
            .cornerRadius(8.dp)
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Text(
            text = "Gasto del mes",
            style = TextStyle(
                color = ColorProvider(Color(0xFF888888)),
                fontSize = 10.sp
            )
        )
        Text(
            text = "$${String.format("%,.2f", spend)}",
            style = TextStyle(
                color = ColorProvider(Color(0xFFFFFFFF)),
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
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
            .background(ColorProvider(Color(0xFF16213E)))
            .cornerRadius(8.dp)
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        // Month navigation row
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "◀",
                style = TextStyle(
                    color = ColorProvider(Color(0xFF00D4AA)),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                ),
                modifier = GlanceModifier.clickable(actionRunCallback<PrevMonthAction>())
            )
            Spacer(modifier = GlanceModifier.defaultWeight())
            Text(
                text = monthLabel.split(" ").let { parts ->
                    // Shorten to "Mayo 26"
                    if (parts.size >= 2) "${parts[0]} ${parts[1].takeLast(2)}" else monthLabel
                },
                style = TextStyle(
                    color = ColorProvider(Color(0xFFFFFFFF)),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            )
            Spacer(modifier = GlanceModifier.defaultWeight())
            Text(
                text = if (isCurrentMonth) "·" else "▶",
                style = TextStyle(
                    color = ColorProvider(
                        if (isCurrentMonth) Color(0xFF333333) else Color(0xFF00D4AA)
                    ),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                ),
                modifier = if (!isCurrentMonth)
                    GlanceModifier.clickable(actionRunCallback<NextMonthAction>())
                else GlanceModifier
            )
        }

        Spacer(modifier = GlanceModifier.height(4.dp))

        // KPIs row
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            Column(modifier = GlanceModifier.defaultWeight()) {
                Text(
                    text = "$txnCount",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFF00D4AA)),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                Text(
                    text = "txns",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFF888888)),
                        fontSize = 9.sp
                    )
                )
            }
            Column(modifier = GlanceModifier.defaultWeight()) {
                Text(
                    text = "$pendingCount",
                    style = TextStyle(
                        color = ColorProvider(
                            if (pendingCount > 0) Color(0xFFFFB347) else Color(0xFF00D4AA)
                        ),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                Text(
                    text = "pendientes",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFF888888)),
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
        payment.daysUntil < 0  -> Color(0xFFFF6B6B)
        payment.daysUntil <= 3 -> Color(0xFFFF6B6B)
        payment.daysUntil <= 7 -> Color(0xFFFFB347)
        else                   -> Color(0xFF888888)
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
            Text(
                text = "$typePrefix${payment.description}",
                style = TextStyle(
                    color = ColorProvider(Color(0xFFFFFFFF)),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                ),
                maxLines = 1
            )
            Text(
                text = "$${String.format("%.2f", payment.amount)}${if (payment.paymentMethod != null) " · ${payment.paymentMethod}" else ""}",
                style = TextStyle(
                    color = ColorProvider(Color(0xFFAAAAAA)),
                    fontSize = 9.sp
                )
            )
        }
        Text(
            text = daysLabel,
            style = TextStyle(
                color = ColorProvider(urgencyColor),
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
        Text(
            text = txn.merchantName?.split(" ")?.take(2)?.joinToString(" ") ?: txn.provider,
            style = TextStyle(
                color = ColorProvider(Color(0xFFFFFFFF)),
                fontSize = 10.sp
            ),
            maxLines = 1,
            modifier = GlanceModifier.defaultWeight()
        )
        Text(
            text = "-$${String.format("%.0f", txn.amount)}",
            style = TextStyle(
                color = ColorProvider(Color(0xFFFF6B6B)),
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
            .background(ColorProvider(Color(0xFF16213E)))
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
        Text(text = category.emoji, style = TextStyle(fontSize = 13.sp))
        Text(
            text = "${category.percentage}%",
            style = TextStyle(
                color = ColorProvider(Color(0xFF00D4AA)),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        )
        Text(
            text = category.name,
            style = TextStyle(
                color = ColorProvider(Color(0xFF888888)),
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
    Text(
        text = text.uppercase(),
        style = TextStyle(
            color = ColorProvider(Color(0xFF00D4AA)),
            fontSize = 8.sp,
            fontWeight = FontWeight.Bold
        ),
        modifier = GlanceModifier.padding(bottom = 2.dp)
    )
}

@Composable
private fun SmallText(text: String) {
    Text(
        text = text,
        style = TextStyle(
            color = ColorProvider(Color(0xFF555555)),
            fontSize = 10.sp
        )
    )
}

@Composable
private fun ErrorState() {
    Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = "⚠️ Error al cargar\nToca ↻ para reintentar",
            style = TextStyle(
                color = ColorProvider(Color(0xFFFF6B6B)),
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
        refreshAndUpdate(context)
    }
}

class NextMonthAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val (year, month) = FinanceWidgetStateStore.getSelectedYearMonth(context)
        val next = java.time.YearMonth.of(year, month).plusMonths(1)
        val now = java.time.YearMonth.now()
        if (!next.isAfter(now)) {
            FinanceWidgetStateStore.setSelectedYearMonth(context, next.year, next.monthValue)
            refreshAndUpdate(context)
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
    try {
        val data = FinanceRepository().getWidgetData(year, month)
        FinanceWidgetStateStore.saveWidgetData(context, data)
    } catch (_: Exception) { }
    FinanceWidget().updateAll(context)
}
