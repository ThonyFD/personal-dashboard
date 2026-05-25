package com.thonyfd.financedashboard.ui

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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thonyfd.financedashboard.data.models.CategorySpend
import com.thonyfd.financedashboard.data.models.Transaction
import com.thonyfd.financedashboard.data.models.UpcomingPayment
import com.thonyfd.financedashboard.data.models.WidgetData
import com.thonyfd.financedashboard.data.repository.FinanceRepository
import com.thonyfd.financedashboard.ui.theme.FinanceDashboardTheme
import com.thonyfd.financedashboard.widget.FinanceWidgetWorker
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        FinanceWidgetWorker.schedule(this)
        categoryNav = parseCategoryFromIntent(intent)
        setContent {
            FinanceDashboardTheme {
                AppRoot(
                    externalNav = categoryNav,
                    onExternalConsumed = { categoryNav = null }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        categoryNav = parseCategoryFromIntent(intent)
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
}

// ---------------------------------------------------------------------------
// Root with bottom navigation
// ---------------------------------------------------------------------------
@Composable
fun AppRoot(
    externalNav: CategoryNavState? = null,
    onExternalConsumed: () -> Unit = {}
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
        containerColor = Color(0xFF0F0F1A),
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF16213E),
                tonalElevation = 0.dp
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Home, "Dashboard") },
                    label = { Text("Dashboard") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF00D4AA),
                        selectedTextColor = Color(0xFF00D4AA),
                        unselectedIconColor = Color(0xFF666666),
                        unselectedTextColor = Color(0xFF666666),
                        indicatorColor = Color(0xFF1A1A2E)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.DateRange, "Control Mensual") },
                    label = { Text("Control") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF00D4AA),
                        selectedTextColor = Color(0xFF00D4AA),
                        unselectedIconColor = Color(0xFF666666),
                        unselectedTextColor = Color(0xFF666666),
                        indicatorColor = Color(0xFF1A1A2E)
                    )
                )
            }
        }
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
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf<WidgetData?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            isLoading = true
            error = null
            try {
                data = repo.getWidgetData()
            } catch (e: Exception) {
                error = e.message ?: "Error desconocido"
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().padding(padding)) {
        TopAppBar(
            title = { Text("💰 Finance Dashboard", fontWeight = FontWeight.Bold) },
            actions = {
                IconButton(onClick = { load() }) {
                    Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color(0xFF1A1A2E),
                titleContentColor = Color.White,
                actionIconContentColor = Color(0xFF00D4AA)
            )
        )

        when {
            isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF00D4AA))
            }
            error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("⚠️ Error", color = Color(0xFFFF6B6B), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text(error!!, color = Color(0xFF888888), fontSize = 13.sp)
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
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { MonthlySpendSection(data) }

        item { SectionHeader("📅 Pagos pendientes") }
        if (data.upcomingPayments.isEmpty()) {
            item { EmptyState(if (data.isCurrentMonth) "Todo al día ✓" else "Sin pendientes") }
        } else {
            items(data.upcomingPayments) { UpcomingPaymentCard(it) }
        }

        item { SectionHeader("💳 Últimas transacciones") }
        if (data.recentTransactions.isEmpty()) {
            item { EmptyState("Sin transacciones recientes") }
        } else {
            items(data.recentTransactions) { TransactionCard(it) }
        }

        if (data.topCategories.isNotEmpty()) {
            item { SectionHeader("📊 Top categorías del mes") }
            item { CategoriesRow(data.topCategories, onCategoryClick) }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

// ---------------------------------------------------------------------------
// Monthly Spend + Month info
// ---------------------------------------------------------------------------
@Composable
private fun MonthlySpendSection(data: WidgetData) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Card(
            modifier = Modifier.weight(1f),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF16213E)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Gasto total del mes", color = Color(0xFF888888), fontSize = 12.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "$${String.format("%,.2f", data.monthlySpend)}",
                    color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold
                )
            }
        }
        Card(
            modifier = Modifier.weight(1f),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF16213E)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    data.monthLabel,
                    color = Color(0xFF00D4AA), fontSize = 13.sp, fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column {
                        Text(
                            "${data.txnCount}",
                            color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold
                        )
                        Text("txns", color = Color(0xFF888888), fontSize = 11.sp)
                    }
                    Column {
                        Text(
                            "${data.pendingCount}",
                            color = if (data.pendingCount > 0) Color(0xFFFFB347) else Color(0xFF00D4AA),
                            fontSize = 18.sp, fontWeight = FontWeight.Bold
                        )
                        Text("pendientes", color = Color(0xFF888888), fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Upcoming Payment Card
// ---------------------------------------------------------------------------
@Composable
private fun UpcomingPaymentCard(payment: UpcomingPayment) {
    val urgencyColor = when {
        payment.daysUntil < 0  -> Color(0xFFFF6B6B)
        payment.daysUntil <= 3 -> Color(0xFFFF6B6B)
        payment.daysUntil <= 7 -> Color(0xFFFFB347)
        else                   -> Color(0xFF00D4AA)
    }
    val daysLabel = when {
        payment.daysUntil < 0  -> "Vencido (día ${payment.day ?: "?"})"
        payment.daysUntil == 0 -> "Hoy"
        payment.daysUntil == 1 -> "Mañana"
        payment.day != null    -> "día ${payment.day}"
        else                   -> "En ${payment.daysUntil} días"
    }
    val typeColor = when (payment.transactionType) {
        "Inversión" -> Color(0xFF4CAF50)
        "Deuda"     -> Color(0xFFFF6B6B)
        "Ahorro"    -> Color(0xFF00D4AA)
        else        -> Color(0xFF888888)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF16213E)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(payment.description, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        payment.transactionType ?: "Gasto",
                        color = typeColor, fontSize = 11.sp, fontWeight = FontWeight.Medium
                    )
                    if (payment.paymentMethod != null) {
                        Text("· ${payment.paymentMethod}", color = Color(0xFF666666), fontSize = 11.sp)
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "$${String.format("%,.2f", payment.amount)}",
                    color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(daysLabel, color = urgencyColor, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Transaction Card
// ---------------------------------------------------------------------------
@Composable
private fun TransactionCard(txn: Transaction) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF16213E)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    txn.merchantName ?: txn.provider,
                    color = Color.White, fontWeight = FontWeight.Medium, fontSize = 15.sp
                )
                Text(txn.txnDate, color = Color(0xFF888888), fontSize = 12.sp)
            }
            Text(
                "-$${String.format("%,.2f", txn.amount)}",
                color = Color(0xFFFF6B6B), fontWeight = FontWeight.Bold, fontSize = 16.sp
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Categories Row (tappable)
// ---------------------------------------------------------------------------
@Composable
private fun CategoriesRow(categories: List<CategorySpend>, onCategoryClick: (CategorySpend) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        categories.take(4).forEach { cat ->
            Card(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onCategoryClick(cat) },
                colors = CardDefaults.cardColors(containerColor = Color(0xFF16213E)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(cat.emoji, fontSize = 20.sp)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${cat.percentage}%", color = Color(0xFF00D4AA), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text(cat.name, color = Color(0xFF888888), fontSize = 9.sp)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
@Composable
private fun SectionHeader(title: String) {
    Text(
        title, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(vertical = 4.dp)
    )
}

@Composable
private fun EmptyState(message: String) {
    Box(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF16213E)).padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(message, color = Color(0xFF555555), fontSize = 13.sp)
    }
}
