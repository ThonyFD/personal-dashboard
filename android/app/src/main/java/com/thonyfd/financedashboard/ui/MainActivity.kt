package com.thonyfd.financedashboard.ui

import com.thonyfd.financedashboard.ui.theme.AppColors
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
import androidx.compose.material.icons.outlined.Widgets
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.foundation.border
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.graphics.vector.ImageVector
import com.thonyfd.financedashboard.ui.theme.MoneyStyle
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
import com.thonyfd.financedashboard.ui.theme.FinanceDashboardTheme
import com.thonyfd.financedashboard.widget.FinanceWidgetWorker
import com.thonyfd.financedashboard.widget.WidgetAppearancePreferences
import com.thonyfd.financedashboard.widget.WidgetKind
import kotlinx.coroutines.launch
import java.time.LocalDate
import kotlin.math.roundToInt

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
        categoryNav = parseCategoryFromIntent(intent)
        externalTab = parseTabFromIntent(intent)
        setContent {
            FinanceDashboardTheme {
                AppRoot(
                    externalNav = categoryNav,
                    onExternalConsumed = { categoryNav = null },
                    externalTab = externalTab,
                    onExternalTabConsumed = { externalTab = null }
                )
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
    externalNav: CategoryNavState? = null,
    onExternalConsumed: () -> Unit = {},
    externalTab: Int? = null,
    onExternalTabConsumed: () -> Unit = {}
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var categoryDetail by remember { mutableStateOf<CategoryNavState?>(null) }

    LaunchedEffect(externalNav) {
        if (externalNav != null) {
            selectedTab = 0
            categoryDetail = externalNav
            onExternalConsumed()
        }
    }


    LaunchedEffect(externalTab) {
        externalTab?.let {
            selectedTab = it.coerceIn(0, 4)
            categoryDetail = null
            onExternalTabConsumed()
        }
    }

    if (categoryDetail != null) {
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

    Scaffold(
        containerColor = AppColors.Night,
        bottomBar = { AppNavigationBar(selectedTab) { selectedTab = it } }
    ) { innerPadding ->
        when (selectedTab) {
            0 -> DashboardTab(
                padding = innerPadding,
                onCategoryClick = { cat ->
                    val now = LocalDate.now()
                    categoryDetail = CategoryNavState(cat.name, cat.emoji, now.year, now.monthValue)
                }
            )
            1 -> MonthlyControlScreen(innerPadding)
            2 -> TimelineScreen(innerPadding)
            3 -> HabitsScreen(innerPadding)
            4 -> MoodScreen(innerPadding)
        }
    }
}

// ---------------------------------------------------------------------------
// Dashboard Tab
// ---------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardTab(padding: PaddingValues, onCategoryClick: (CategorySpend) -> Unit = {}) {
    val repo = remember { FinanceRepository() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf<WidgetData?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var showWidgetAppearance by remember { mutableStateOf(false) }

    fun load(showResult: Boolean = false) {
        scope.launch {
            if (data == null) isLoading = true
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
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().padding(padding)) {
        TopAppBar(
            title = {
                Column {
                    Text("Finanzas", style = MaterialTheme.typography.titleLarge, color = AppColors.Ice)
                    Text(
                        data?.let { "Actualizado ${it.lastUpdated}" } ?: "Cargando",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppColors.Mist
                    )
                }
            },
            actions = {
                IconButton(onClick = { showWidgetAppearance = true }) {
                    Icon(Icons.Outlined.Widgets, contentDescription = "Apariencia de widgets")
                }
                IconButton(onClick = { load(showResult = true) }) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Actualizar")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = AppColors.Night,
                titleContentColor = AppColors.Ice,
                actionIconContentColor = AppColors.Mist
            )
        )

        when {
            isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppColors.Cyan, strokeWidth = 2.dp, modifier = Modifier.size(32.dp))
            }
            error != null && data == null -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No se pudo cargar el dashboard", color = AppColors.Ice, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text(error!!, color = AppColors.Mist, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(16.dp))
                    OutlinedButton(onClick = { load(showResult = true) }) { Text("Reintentar", color = AppColors.Cyan) }
                }
            }
            data != null -> DashboardContent(data!!, onCategoryClick)
        }
    }

    if (showWidgetAppearance) {
        WidgetAppearanceDialog(
            onDismiss = { showWidgetAppearance = false },
            onSaved = {
                showWidgetAppearance = false
                Toast.makeText(context, "Apariencia de widgets actualizada", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

@Composable
private fun WidgetAppearanceDialog(
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var financeOpacity by remember {
        mutableFloatStateOf(WidgetAppearancePreferences.getOpacity(context, WidgetKind.FINANCE))
    }
    var paymentsOpacity by remember {
        mutableFloatStateOf(WidgetAppearancePreferences.getOpacity(context, WidgetKind.PAYMENTS))
    }
    var habitsOpacity by remember {
        mutableFloatStateOf(WidgetAppearancePreferences.getOpacity(context, WidgetKind.HABITS))
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = AppColors.Panel,
        titleContentColor = AppColors.Ice,
        textContentColor = AppColors.Mist,
        icon = { Icon(Icons.Default.Widgets, null, tint = AppColors.Cyan) },
        title = { Text("Apariencia de widgets", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("Ajusta la transparencia de cada widget. El contenido permanece visible mientras cambia el fondo.")
                WidgetOpacitySlider("Dashboard financiero", financeOpacity) { financeOpacity = it }
                WidgetOpacitySlider("Pagos próximos", paymentsOpacity) { paymentsOpacity = it }
                WidgetOpacitySlider("Hábitos de hoy", habitsOpacity) { habitsOpacity = it }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                WidgetAppearancePreferences.setOpacity(context, WidgetKind.FINANCE, financeOpacity)
                WidgetAppearancePreferences.setOpacity(context, WidgetKind.PAYMENTS, paymentsOpacity)
                WidgetAppearancePreferences.setOpacity(context, WidgetKind.HABITS, habitsOpacity)
                scope.launch {
                    WidgetAppearancePreferences.refreshAll(context)
                    onSaved()
                }
            }) {
                Text("Aplicar", color = AppColors.Lime, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar", color = AppColors.Mist) }
        }
    )
}

@Composable
private fun WidgetOpacitySlider(label: String, value: Float, onValueChange: (Float) -> Unit) {
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, color = AppColors.Ice, fontWeight = FontWeight.Medium)
            Text("${(value * 100).roundToInt()}%", color = AppColors.Cyan, fontWeight = FontWeight.Bold)
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = WidgetAppearancePreferences.MIN_OPACITY..1f,
            steps = 7,
            colors = SliderDefaults.colors(
                thumbColor = AppColors.Cyan,
                activeTrackColor = AppColors.Violet,
                inactiveTrackColor = AppColors.Hairline
            )
        )
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
        Text("Gastado en ${data.monthLabel.lowercase()}", color = AppColors.Mist, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text("$", color = AppColors.Mist, style = MoneyStyle, fontSize = 28.sp, modifier = Modifier.padding(bottom = 8.dp, end = 2.dp))
            Text(whole, color = AppColors.Ice, style = MoneyStyle, fontSize = 52.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1.5).sp)
            Text(".$cents", color = AppColors.Mist, style = MoneyStyle, fontSize = 24.sp, modifier = Modifier.padding(bottom = 9.dp))
        }

        if (data.topCategories.isNotEmpty()) {
            Spacer(Modifier.height(14.dp))
            CategoryBar(data.topCategories.take(5))
        }

        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
            HeroStat("${data.txnCount}", "movimientos", AppColors.Ice)
            HeroStat(
                "${data.pendingCount}",
                if (data.pendingCount == 1) "pendiente" else "pendientes",
                if (data.pendingCount > 0) AppColors.Amber else AppColors.Ice
            )
        }
    }
}

@Composable
private fun HeroStat(value: String, label: String, valueColor: Color) {
    Row(verticalAlignment = Alignment.Bottom) {
        Text(value, color = valueColor, style = MoneyStyle, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.width(5.dp))
        Text(label, color = AppColors.Mist, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 2.dp))
    }
}

/** Barra apilada con el peso de cada categoría: resume el mes de un vistazo. */
@Composable
private fun CategoryBar(categories: List<CategorySpend>) {
    val total = categories.sumOf { it.percentage }.coerceAtLeast(1)
    Row(
        Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(AppColors.Panel),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        categories.forEachIndexed { index, cat ->
            if (cat.percentage > 0) {
                Box(Modifier.weight(cat.percentage.toFloat() / total).fillMaxHeight().background(categoryColor(index)))
            }
        }
    }
}

private fun categoryColor(index: Int): Color = when (index) {
    0 -> AppColors.Cyan
    1 -> AppColors.Violet
    2 -> AppColors.Amber
    3 -> Color(0xFF4FD1C5)
    else -> AppColors.Mist
}

// ---------------------------------------------------------------------------
// Filas
// ---------------------------------------------------------------------------
@Composable
private fun UpcomingPaymentRow(payment: UpcomingPayment) {
    val urgencyColor = when {
        payment.daysUntil <= 3 -> AppColors.Coral
        payment.daysUntil <= 7 -> AppColors.Amber
        else                   -> AppColors.Mist
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
                Modifier.size(36.dp).clip(RoundedCornerShape(12.dp)).background(AppColors.PanelHigh),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    name.firstOrNull { it.isLetterOrDigit() }?.uppercase() ?: "·",
                    color = AppColors.Cyan,
                    style = MaterialTheme.typography.titleSmall
                )
            }
        },
        title = name,
        subtitle = shortDate(txn.txnDate),
        amount = "−$${String.format("%,.2f", txn.amount)}",
        detail = null,
        detailColor = AppColors.Mist
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
            Text(cat.name, color = AppColors.Ice, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(7.dp))
            Box(Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)).background(AppColors.PanelHigh)) {
                Box(Modifier.fillMaxWidth(cat.percentage.coerceIn(0, 100) / 100f).fillMaxHeight().background(color))
            }
        }
        Spacer(Modifier.width(16.dp))
        Text("${cat.percentage}%", color = AppColors.Ice, style = MoneyStyle, fontSize = 15.sp, fontWeight = FontWeight.Medium)
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
            Text(title, color = AppColors.Ice, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(2.dp))
            Text(subtitle, color = AppColors.Mist, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.width(12.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(amount, color = AppColors.Ice, style = MoneyStyle, fontSize = 15.sp, fontWeight = FontWeight.Medium)
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
private data class NavDestination(val label: String, val icon: ImageVector)

private val navDestinations = listOf(
    NavDestination("Inicio", Icons.Default.Home),
    NavDestination("Control", Icons.Default.DateRange),
    NavDestination("Timeline", Icons.Default.Timeline),
    NavDestination("Hábitos", Icons.Default.AutoAwesome),
    NavDestination("Mood", Icons.Default.Favorite)
)

@Composable
private fun AppNavigationBar(selectedTab: Int, onSelect: (Int) -> Unit) {
    Column {
        HorizontalDivider(thickness = 1.dp, color = AppColors.Hairline)
        NavigationBar(containerColor = AppColors.Deep, tonalElevation = 0.dp) {
            navDestinations.forEachIndexed { index, destination ->
                NavigationBarItem(
                    selected = selectedTab == index,
                    onClick = { onSelect(index) },
                    icon = { Icon(destination.icon, destination.label) },
                    label = { Text(destination.label, style = MaterialTheme.typography.labelSmall) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AppColors.Cyan,
                        selectedTextColor = AppColors.Ice,
                        unselectedIconColor = AppColors.Dim,
                        unselectedTextColor = AppColors.Dim,
                        indicatorColor = AppColors.Cyan.copy(alpha = 0.12f)
                    )
                )
            }
        }
    }
}
