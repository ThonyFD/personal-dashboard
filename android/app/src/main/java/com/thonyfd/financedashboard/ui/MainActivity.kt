package com.thonyfd.financedashboard.ui

import com.thonyfd.financedashboard.ui.theme.AppTheme
import kotlinx.coroutines.CancellationException
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.foundation.border
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import android.widget.Toast
import com.thonyfd.financedashboard.data.models.CategorySpend
import com.thonyfd.financedashboard.data.models.Transaction
import com.thonyfd.financedashboard.data.models.UpcomingPayment
import com.thonyfd.financedashboard.data.models.WidgetData
import com.thonyfd.financedashboard.data.repository.FinanceRepository
import com.thonyfd.financedashboard.ui.theme.AppearanceTheme
import com.thonyfd.financedashboard.ui.theme.FinanceDashboardTheme
import com.thonyfd.financedashboard.widget.FinanceWidgetWorker
import com.thonyfd.financedashboard.widget.HabitsDayRolloverReceiver
import kotlinx.coroutines.launch
import java.time.LocalDate

data class CategoryNavState(
    val name: String,
    val emoji: String,
    val year: Int,
    val month: Int
)

class MainActivity : ComponentActivity() {

    private var categoryNav by mutableStateOf<CategoryNavState?>(null)
    private var externalTab by mutableStateOf<Int?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        FinanceWidgetWorker.schedule(this)
        HabitsDayRolloverReceiver.schedule(this)
        categoryNav = parseCategoryFromIntent(intent)
        externalTab = parseTabFromIntent(intent)
        setContent {
            FinanceDashboardTheme {
                LoginGate { isOwner ->
                    AppearanceTheme {
                        AppRoot(
                            isOwner = isOwner,
                            externalNav = categoryNav,
                            onExternalConsumed = { categoryNav = null },
                            externalTab = externalTab,
                            onExternalTabConsumed = { externalTab = null }
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        categoryNav = parseCategoryFromIntent(intent)
        externalTab = parseTabFromIntent(intent)
    }

    private fun parseCategoryFromIntent(intent: Intent?): CategoryNavState? {
        val name = intent?.getStringExtra("CATEGORY_NAME") ?: return null
        val now = LocalDate.now()
        return CategoryNavState(
            name = name,
            emoji = intent.getStringExtra("CATEGORY_EMOJI") ?: "💳",
            year = intent.getIntExtra("YEAR", now.year),
            month = intent.getIntExtra("MONTH", now.monthValue)
        )
    }

    private fun parseTabFromIntent(intent: Intent?): Int? =
        intent?.takeIf { it.hasExtra(EXTRA_OPEN_TAB) }?.getIntExtra(EXTRA_OPEN_TAB, TAB_DASHBOARD)

    companion object {
        const val EXTRA_OPEN_TAB = "OPEN_TAB"
        const val TAB_DASHBOARD = 0
        const val TAB_HABITS = 3
    }
}

// ---------------------------------------------------------------------------
// Root with bottom navigation
// ---------------------------------------------------------------------------
@Composable
fun AppRoot(
    isOwner: Boolean,
    externalNav: CategoryNavState? = null,
    onExternalConsumed: () -> Unit = {},
    externalTab: Int? = null,
    onExternalTabConsumed: () -> Unit = {}
) {
    var selectedTab by remember(isOwner) { mutableStateOf(startTab(isOwner)) }
    var categoryDetail by remember(isOwner) { mutableStateOf<CategoryNavState?>(null) }

    LaunchedEffect(externalNav) {
        if (externalNav != null) {
            // Category detail is finance: non-owners never open it from a deep link
            if (isOwner) {
                selectedTab = AppTab.Inicio
                categoryDetail = externalNav
            }
            onExternalConsumed()
        }
    }

    LaunchedEffect(externalTab) {
        externalTab?.let { index ->
            resolveDeepLinkTab(index, isOwner)?.let {
                selectedTab = it
                categoryDetail = null
            }
            onExternalTabConsumed()
        }
    }

    if (categoryDetail != null && isOwner) {
        val detail = categoryDetail!!
        CategoryDetailScreen(
            categoryName = detail.name,
            categoryEmoji = detail.emoji,
            initialYear = detail.year,
            initialMonth = detail.month,
            onBack = { categoryDetail = null }
        )
        return
    }

    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    AppMenuDrawer(drawerState, isOwner) {
        Scaffold(
            containerColor = AppTheme.colors.bg,
            bottomBar = { AppNavigationBar(visibleTabs(isOwner), selectedTab) { selectedTab = it } }
        ) { innerPadding ->
            val openMenu = { scope.launch { drawerState.open() }; Unit }
            when (selectedTab) {
                AppTab.Inicio -> DashboardTab(
                    padding = innerPadding,
                    onOpenMenu = openMenu,
                    onCategoryClick = { cat ->
                        val now = LocalDate.now()
                        categoryDetail = CategoryNavState(cat.name, cat.emoji, now.year, now.monthValue)
                    }
                )
                AppTab.Control -> MonthlyControlScreen(innerPadding)
                AppTab.Timeline -> TimelineScreen(innerPadding, onOpenMenu = openMenu)
                AppTab.Habitos -> HabitsScreen(innerPadding, onOpenMenu = openMenu)
                AppTab.Mood -> MoodScreen(innerPadding, onOpenMenu = openMenu)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Dashboard Tab
// ---------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardTab(padding: PaddingValues, onOpenMenu: () -> Unit = {}, onCategoryClick: (CategorySpend) -> Unit = {}) {
    val repo = remember { FinanceRepository() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf<WidgetData?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }

    fun load(showResult: Boolean = false) {
        if (refreshing) return
        scope.launch {
            if (data == null) isLoading = true
            refreshing = true
            error = null
            try {
                data = repo.getWidgetData()
                if (showResult) Toast.makeText(context, "Dashboard actualizado", Toast.LENGTH_SHORT).show()
            } catch (e: CancellationException) {
                throw e // tab cambiada o pantalla cerrada: no es un error
            } catch (e: Exception) {
                error = e.message ?: "Error desconocido"
                Toast.makeText(context, "No se pudo actualizar el dashboard", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
                refreshing = false
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().padding(padding)) {
        TopAppBar(
            navigationIcon = { AppIconButton(Icons.Outlined.Menu, "Menú", onClick = onOpenMenu) },
            title = {
                Column {
                    Text("Finanzas", style = MaterialTheme.typography.titleLarge, color = AppTheme.colors.text)
                    Text(
                        data?.let { "Actualizado ${it.lastUpdated}" } ?: "Cargando",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppTheme.colors.textSecondary
                    )
                }
            },
            actions = {
                AppIconButton(Icons.Outlined.Refresh, "Actualizar", onClick = { load(showResult = true) }, loading = refreshing && data != null)
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = AppTheme.colors.bg,
                titleContentColor = AppTheme.colors.text,
                actionIconContentColor = AppTheme.colors.textSecondary
            )
        )

        when {
            isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppTheme.colors.accent, strokeWidth = 2.dp, modifier = Modifier.size(32.dp))
            }
            error != null && data == null -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No se pudo cargar el dashboard", color = AppTheme.colors.text, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text(error!!, color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(16.dp))
                    AppButton("Reintentar", onClick = { load(showResult = true) }, style = AppButtonStyle.Secondary, loading = refreshing)
                }
            }
            data != null -> DashboardContent(data!!, onCategoryClick)
        }
    }
}

@Composable
private fun DashboardContent(data: WidgetData, onCategoryClick: (CategorySpend) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { SpendHero(data) }

        item { SectionHeader("Pagos pendientes", trailing = data.upcomingPayments.size.takeIf { it > 0 }?.toString()) }
        item {
            GroupedPanel {
                if (data.upcomingPayments.isEmpty()) {
                    EmptyRow(if (data.isCurrentMonth) "Todo al día este mes" else "Sin pagos pendientes")
                } else {
                    data.upcomingPayments.forEachIndexed { index, payment ->
                        if (index > 0) PanelDivider(startIndent = 38.dp)
                        UpcomingPaymentRow(payment)
                    }
                }
            }
        }

        if (data.topCategories.isNotEmpty()) {
            item { SectionHeader("En qué se va el dinero") }
            item {
                GroupedPanel {
                    data.topCategories.take(5).forEachIndexed { index, cat ->
                        if (index > 0) PanelDivider(startIndent = 50.dp)
                        CategoryRow(cat, categoryColor(index)) { onCategoryClick(cat) }
                    }
                }
            }
        }

        item { SectionHeader("Últimos movimientos") }
        item {
            GroupedPanel {
                if (data.recentTransactions.isEmpty()) {
                    EmptyRow("Aún no hay movimientos este mes")
                } else {
                    data.recentTransactions.forEachIndexed { index, txn ->
                        if (index > 0) PanelDivider()
                        TransactionRow(txn)
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Hero: gasto del mes
// ---------------------------------------------------------------------------
@Composable
private fun SpendHero(data: WidgetData) {
    val formatted = String.format("%,.2f", data.monthlySpend)
    val whole = formatted.substringBeforeLast('.')
    val cents = formatted.substringAfterLast('.', "00")

    Column(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 8.dp)) {
        Text("Gastado en ${data.monthLabel.lowercase()}", color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text("$", color = AppTheme.colors.textSecondary, style = AppTheme.moneyStyle.copy(fontFamily = AppTheme.fonts.display), fontSize = 28.sp, modifier = Modifier.padding(bottom = 8.dp, end = 2.dp))
            Text(whole, color = AppTheme.colors.text, style = AppTheme.moneyStyle.copy(fontFamily = AppTheme.fonts.display), fontSize = 52.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1.5).sp)
            Text(".$cents", color = AppTheme.colors.textSecondary, style = AppTheme.moneyStyle.copy(fontFamily = AppTheme.fonts.display), fontSize = 24.sp, modifier = Modifier.padding(bottom = 9.dp))
        }

        if (data.topCategories.isNotEmpty()) {
            Spacer(Modifier.height(14.dp))
            CategoryBar(data.topCategories.take(5))
        }

        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
            HeroStat("${data.txnCount}", "movimientos", AppTheme.colors.text)
            HeroStat(
                "${data.pendingCount}",
                if (data.pendingCount == 1) "pendiente" else "pendientes",
                if (data.pendingCount > 0) AppTheme.colors.warning else AppTheme.colors.text
            )
        }
    }
}

@Composable
private fun HeroStat(value: String, label: String, valueColor: Color) {
    Row(verticalAlignment = Alignment.Bottom) {
        Text(value, color = valueColor, style = AppTheme.moneyStyle, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.width(5.dp))
        Text(label, color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 2.dp))
    }
}

/** Barra apilada con el peso de cada categoría: resume el mes de un vistazo. */
@Composable
private fun CategoryBar(categories: List<CategorySpend>) {
    val total = categories.sumOf { it.percentage }.coerceAtLeast(1)
    Row(
        Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(AppTheme.colors.surface),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        categories.forEachIndexed { index, cat ->
            if (cat.percentage > 0) {
                Box(Modifier.weight(cat.percentage.toFloat() / total).fillMaxHeight().background(categoryColor(index)))
            }
        }
    }
}

@Composable
private fun categoryColor(index: Int): Color = when (index) {
    0 -> AppTheme.colors.accent
    1 -> AppTheme.colors.depth
    2 -> AppTheme.colors.warning
    3 -> AppTheme.colors.chart[7]
    else -> AppTheme.colors.textSecondary
}

// ---------------------------------------------------------------------------
// Filas
// ---------------------------------------------------------------------------
@Composable
private fun UpcomingPaymentRow(payment: UpcomingPayment) {
    val urgencyColor = when {
        payment.daysUntil <= 3 -> AppTheme.colors.negative
        payment.daysUntil <= 7 -> AppTheme.colors.warning
        else                   -> AppTheme.colors.textSecondary
    }
    val daysLabel = when {
        payment.daysUntil < 0  -> "Vencido · día ${payment.day ?: "?"}"
        payment.daysUntil == 0 -> "Hoy"
        payment.daysUntil == 1 -> "Mañana"
        payment.day != null    -> "Día ${payment.day}"
        else                   -> "En ${payment.daysUntil} días"
    }
    val subtitle = listOfNotNull(payment.transactionType ?: "Gasto", payment.paymentMethod).joinToString(" · ")

    PanelRow(
        leading = { Box(Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(urgencyColor)) },
        title = payment.description,
        subtitle = subtitle,
        amount = "$${String.format("%,.2f", payment.amount)}",
        detail = daysLabel,
        detailColor = urgencyColor
    )
}

@Composable
private fun TransactionRow(txn: Transaction) {
    val name = txn.merchantName ?: txn.provider
    PanelRow(
        leading = {
            Box(
                Modifier.size(36.dp).clip(RoundedCornerShape(12.dp)).background(AppTheme.colors.surfaceRaised),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    name.firstOrNull { it.isLetterOrDigit() }?.uppercase() ?: "·",
                    color = AppTheme.colors.accent,
                    style = MaterialTheme.typography.titleSmall
                )
            }
        },
        title = name,
        subtitle = shortDate(txn.txnDate),
        amount = "−$${String.format("%,.2f", txn.amount)}",
        detail = null,
        detailColor = AppTheme.colors.textSecondary
    )
}

@Composable
private fun CategoryRow(cat: CategorySpend, color: Color, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(cat.emoji, fontSize = 20.sp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(cat.name, color = AppTheme.colors.text, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(7.dp))
            Box(Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)).background(AppTheme.colors.surfaceRaised)) {
                Box(Modifier.fillMaxWidth(cat.percentage.coerceIn(0, 100) / 100f).fillMaxHeight().background(color))
            }
        }
        Spacer(Modifier.width(16.dp))
        Text("${cat.percentage}%", color = AppTheme.colors.text, style = AppTheme.moneyStyle, fontSize = 15.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun PanelRow(
    leading: @Composable () -> Unit,
    title: String,
    subtitle: String,
    amount: String,
    detail: String?,
    detailColor: Color
) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        leading()
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = AppTheme.colors.text, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(2.dp))
            Text(subtitle, color = AppTheme.colors.textSecondary, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.width(12.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(amount, color = AppTheme.colors.text, style = AppTheme.moneyStyle, fontSize = 15.sp, fontWeight = FontWeight.Medium)
            if (detail != null) {
                Spacer(Modifier.height(2.dp))
                Text(detail, color = detailColor, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
            }
        }
    }
}

private fun shortDate(raw: String): String = runCatching {
    val date = LocalDate.parse(raw.take(10))
    val month = date.month.getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale("es")).trimEnd('.')
    if (date == LocalDate.now()) "Hoy" else "${date.dayOfMonth} $month"
}.getOrDefault(raw)

// ---------------------------------------------------------------------------
// Navegación inferior
// ---------------------------------------------------------------------------

@Composable
private fun AppNavigationBar(tabs: List<AppTab>, selectedTab: AppTab, onSelect: (AppTab) -> Unit) {
    Column {
        HorizontalDivider(thickness = 1.dp, color = AppTheme.colors.hairline)
        NavigationBar(containerColor = AppTheme.colors.surfaceLow, tonalElevation = 0.dp) {
            tabs.forEach { destination ->
                NavigationBarItem(
                    selected = selectedTab == destination,
                    onClick = { onSelect(destination) },
                    icon = { Icon(destination.icon, destination.label) },
                    label = { Text(destination.label, style = MaterialTheme.typography.labelSmall) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AppTheme.colors.accent,
                        selectedTextColor = AppTheme.colors.text,
                        unselectedIconColor = AppTheme.colors.textPassive,
                        unselectedTextColor = AppTheme.colors.textPassive,
                        indicatorColor = AppTheme.colors.accent.copy(alpha = 0.12f)
                    )
                )
            }
        }
    }
}
