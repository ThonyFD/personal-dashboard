package com.thonyfd.financedashboard.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thonyfd.financedashboard.data.models.Transaction
import com.thonyfd.financedashboard.data.repository.FinanceRepository
import kotlinx.coroutines.launch
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryDetailScreen(
    categoryName: String,
    categoryEmoji: String,
    initialYear: Int,
    initialMonth: Int,
    onBack: () -> Unit
) {
    BackHandler { onBack() }

    val repo = remember { FinanceRepository() }
    val scope = rememberCoroutineScope()
    val nowYearMonth = remember { YearMonth.now() }

    var yearMonth by remember { mutableStateOf(YearMonth.of(initialYear, initialMonth)) }
    var transactions by remember { mutableStateOf<List<Transaction>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            isLoading = true
            error = null
            try {
                transactions = repo.getTransactionsByCategory(
                    categoryName, yearMonth.year, yearMonth.monthValue
                )
            } catch (e: Exception) {
                error = e.message ?: "Error desconocido"
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(yearMonth) { load() }

    val monthLabel = yearMonth.atDay(1)
        .format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale("es")))
        .replaceFirstChar { it.uppercase() }
    val total = transactions.sumOf { it.amount }

    Scaffold(
        containerColor = Color(0xFF0F0F1A),
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(categoryEmoji, fontSize = 20.sp)
                        Text(categoryName, fontWeight = FontWeight.Bold)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A1A2E),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color(0xFF00D4AA)
                )
            )
        }
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            // Month navigation bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF16213E))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { yearMonth = yearMonth.minusMonths(1) }) {
                    Icon(
                        Icons.Default.KeyboardArrowLeft,
                        contentDescription = "Mes anterior",
                        tint = Color(0xFF00D4AA)
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(monthLabel, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    if (!isLoading) {
                        Text(
                            "$${String.format("%,.2f", total)} · ${transactions.size} txns",
                            color = Color(0xFF00D4AA),
                            fontSize = 12.sp
                        )
                    }
                }
                val canGoNext = yearMonth.isBefore(nowYearMonth)
                IconButton(
                    onClick = { if (canGoNext) yearMonth = yearMonth.plusMonths(1) },
                    enabled = canGoNext
                ) {
                    Icon(
                        Icons.Default.KeyboardArrowRight,
                        contentDescription = "Mes siguiente",
                        tint = if (canGoNext) Color(0xFF00D4AA) else Color(0xFF333333)
                    )
                }
            }

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
                transactions.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "Sin transacciones en $monthLabel",
                        color = Color(0xFF555555),
                        fontSize = 14.sp
                    )
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(transactions, key = { it.id }) { txn ->
                        CategoryTransactionCard(txn)
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryTransactionCard(txn: Transaction) {
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
                    color = Color.White,
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp
                )
                Spacer(Modifier.height(2.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(txn.txnDate, color = Color(0xFF888888), fontSize = 12.sp)
                    if (txn.cardLast4 != null) {
                        Text("· •••${txn.cardLast4}", color = Color(0xFF555555), fontSize = 12.sp)
                    }
                }
                if (!txn.description.isNullOrBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        txn.description,
                        color = Color(0xFF666666),
                        fontSize = 11.sp,
                        maxLines = 1
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                "-$${String.format("%,.2f", txn.amount)}",
                color = Color(0xFFFF6B6B),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
        }
    }
}
