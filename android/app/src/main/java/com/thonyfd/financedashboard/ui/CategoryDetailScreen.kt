package com.thonyfd.financedashboard.ui

import com.thonyfd.financedashboard.ui.theme.AppColors
import com.thonyfd.financedashboard.ui.theme.MoneyStyle
import androidx.compose.foundation.lazy.itemsIndexed
import kotlinx.coroutines.CancellationException
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thonyfd.financedashboard.data.models.Transaction
import com.thonyfd.financedashboard.data.repository.FinanceRepository
import kotlinx.coroutines.launch
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import android.widget.Toast

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
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val nowYearMonth = remember { YearMonth.now() }

    var yearMonth by remember { mutableStateOf(YearMonth.of(initialYear, initialMonth)) }
    var transactions by remember { mutableStateOf<List<Transaction>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var hasLoaded by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            val silentRefresh = hasLoaded
            if (!hasLoaded) isLoading = true
            error = null
            try {
                transactions = repo.getTransactionsByCategory(
                    categoryName, yearMonth.year, yearMonth.monthValue
                )
                hasLoaded = true
                if (silentRefresh) Toast.makeText(context, "Mes actualizado", Toast.LENGTH_SHORT).show()
            } catch (e: CancellationException) {
                throw e // tab cambiada o pantalla cerrada: no es un error
            } catch (e: Exception) {
                error = e.message ?: "Error desconocido"
                Toast.makeText(context, "No se pudieron actualizar las transacciones", Toast.LENGTH_SHORT).show()
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
        containerColor = AppColors.Night,
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(categoryEmoji, fontSize = 20.sp)
                        Text(categoryName, style = MaterialTheme.typography.titleLarge)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = appTopBarColors()
            )
        }
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            val canGoNext = yearMonth.isBefore(nowYearMonth)
            // Hero: total de la categoría con navegación de mes
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(monthLabel, color = AppColors.Mist, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    IconButton(onClick = { yearMonth = yearMonth.minusMonths(1) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.KeyboardArrowLeft, contentDescription = "Mes anterior", tint = AppColors.Ice)
                    }
                    IconButton(
                        onClick = { if (canGoNext) yearMonth = yearMonth.plusMonths(1) },
                        enabled = canGoNext,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Default.KeyboardArrowRight,
                            contentDescription = "Mes siguiente",
                            tint = if (canGoNext) AppColors.Ice else AppColors.Hairline
                        )
                    }
                }
                Text(
                    if (isLoading) "—" else money(total),
                    color = AppColors.Ice,
                    style = MoneyStyle,
                    fontSize = 40.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = (-1).sp
                )
                if (!isLoading) {
                    Text(
                        "${transactions.size} ${if (transactions.size == 1) "movimiento" else "movimientos"}",
                        color = AppColors.Mist,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            when {
                isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AppColors.Cyan, strokeWidth = 2.dp, modifier = Modifier.size(32.dp))
                }
                error != null && !hasLoaded -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No se pudieron cargar los movimientos", color = AppColors.Ice, style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(6.dp))
                        Text(error!!, color = AppColors.Mist, style = MaterialTheme.typography.bodySmall)
                    }
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 28.dp)
                ) {
                    if (transactions.isEmpty()) {
                        item { GroupedPanel { EmptyRow("Sin movimientos en $monthLabel") } }
                    }
                    itemsIndexed(transactions, key = { _, it -> it.id }) { index, txn ->
                        Column(Modifier.panelSegment(index, transactions.size)) {
                            if (index > 0) PanelDivider(startIndent = 16.dp)
                            CategoryTransactionCard(txn)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryTransactionCard(txn: Transaction) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                txn.merchantName ?: txn.provider,
                color = AppColors.Ice,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1
            )
            Spacer(Modifier.height(2.dp))
            Text(
                listOfNotNull(txn.txnDate.take(10), txn.cardLast4?.let { "•••$it" }, txn.description?.takeIf { it.isNotBlank() })
                    .joinToString(" · "),
                color = AppColors.Mist,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1
            )
        }
        Spacer(Modifier.width(12.dp))
        MoneyText(txn.amount, prefix = "−", fontSize = 15)
    }
}
