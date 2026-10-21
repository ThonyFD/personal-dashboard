package com.thonyfd.financedashboard.ui

import com.thonyfd.financedashboard.ui.theme.AppColors
import androidx.compose.runtime.key
import com.thonyfd.financedashboard.ui.theme.MoneyStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.lazy.itemsIndexed
import kotlinx.coroutines.CancellationException
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.thonyfd.financedashboard.data.models.*
import com.thonyfd.financedashboard.data.repository.MonthlyControlRepository
import kotlinx.coroutines.launch
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import android.widget.Toast

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
private val BG           = AppColors.Night
private val SURFACE      = AppColors.Panel
private val TEAL         = AppColors.Cyan
private val MUTED        = AppColors.Mist
private val RED          = AppColors.Coral
private val ORANGE       = AppColors.Amber
private val GREEN        = AppColors.Lime
private val WHITE        = AppColors.Ice
private val PURPLE       = AppColors.Violet

fun typeColor(type: String?) = when (type) {
    "Inversión" -> GREEN
    "Deuda"     -> RED
    "Ahorro"    -> TEAL
    else        -> WHITE
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonthlyControlScreen(padding: PaddingValues = PaddingValues()) {
    val repo = remember { MonthlyControlRepository() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var ym by remember { mutableStateOf(YearMonth.now()) }
    var state by remember { mutableStateOf(MonthlyControlState(ym.year, ym.monthValue)) }
    var prevBalance by remember { mutableStateOf("0") }
    var showAddTxn by remember { mutableStateOf(false) }
    var editingTxn by remember { mutableStateOf<FullManualTransactionRow?>(null) }
    var showAddIncome by remember { mutableStateOf(false) }
    var showIncomes by remember { mutableStateOf(true) }
    var showCopyConfirm by remember { mutableStateOf(false) }
    var showDeleteTxn by remember { mutableStateOf<FullManualTransactionRow?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    // Tracks whether data has been loaded at least once for the current month
    var hasLoaded by remember { mutableStateOf(false) }

    // Month label
    val monthLabel = remember(ym) {
        ym.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale("es")))
            .replaceFirstChar { it.uppercase() }
    }
    val isCurrentMonth = ym == YearMonth.now()

    // Load data when month changes.
    // Shows full-screen loader only on first load per month (hasLoaded = false).
    // When called after actions (add/edit), hasLoaded is already true so the
    // LazyColumn stays alive and the scroll position is preserved.
    suspend fun load() {
        if (!hasLoaded) state = state.copy(isLoading = true, error = null)
        try {
            val txns = repo.fetchTransactions(ym.year, ym.monthValue)
            val incomes = repo.fetchIncomes(ym.year, ym.monthValue)
            state = state.copy(
                year = ym.year, month = ym.monthValue,
                transactions = txns, incomes = incomes,
                previousBalance = prevBalance.toDoubleOrNull() ?: 0.0,
                isLoading = false
            )
            hasLoaded = true
        } catch (e: CancellationException) {
            throw e // tab cambiada o pantalla cerrada: no es un error
        } catch (e: Exception) {
            state = state.copy(isLoading = false, error = e.message)
        }
    }

    // Reset hasLoaded when month changes so the loader shows again
    LaunchedEffect(ym) {
        hasLoaded = false
        load()
    }

    // Recompute previousBalance effect
    LaunchedEffect(prevBalance) {
        state = state.copy(previousBalance = prevBalance.toDoubleOrNull() ?: 0.0)
    }

    Scaffold(
        containerColor = BG,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { ym = ym.minusMonths(1) }) {
                            Icon(Icons.Default.ChevronLeft, null, tint = TEAL)
                        }
                        Text(
                            text = monthLabel,
                            style = MaterialTheme.typography.titleLarge,
                            color = WHITE
                        )
                        IconButton(
                            onClick = { if (!isCurrentMonth) ym = ym.plusMonths(1) },
                            enabled = !isCurrentMonth
                        ) {
                            Icon(
                                Icons.Default.ChevronRight, null,
                                tint = if (isCurrentMonth) AppColors.Hairline else TEAL
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { scope.launch { load() } }) {
                        Icon(Icons.Outlined.Refresh, "Actualizar")
                    }
                    IconButton(onClick = { showCopyConfirm = true }) {
                        Icon(Icons.Outlined.ContentCopy, "Copiar mes anterior")
                    }
                },
                colors = appTopBarColors()
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddTxn = true },
                containerColor = TEAL,
                contentColor = AppColors.Night,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, "Agregar transacción")
            }
        }
    ) { innerPadding ->

        if (state.isLoading) {
            Box(
                Modifier.fillMaxSize().padding(innerPadding),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator(color = TEAL) }
            return@Scaffold
        }

        if (state.error != null) {
            Box(
                Modifier.fillMaxSize().padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                    Text("No se pudo cargar el mes", color = WHITE, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text(state.error ?: "", color = MUTED, style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(16.dp))
                    OutlinedButton(onClick = { scope.launch { load() } }) { Text("Reintentar", color = TEAL) }
                }
            }
            return@Scaffold
        }

        val displayedTransactions = remember(state.transactions, searchQuery) {
            state.transactions
                .filter { searchQuery.isBlank() || it.description.contains(searchQuery, ignoreCase = true) }
                .sortedWith(compareBy { it.isPaid })
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(innerPadding),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Resumen del mes
            item { SummaryCards(state) }

            // Income section
            item {
                IncomeSection(
                    state = state,
                    prevBalance = prevBalance,
                    onPrevBalanceChange = { prevBalance = it },
                    expanded = showIncomes,
                    onToggle = { showIncomes = !showIncomes },
                    onAddIncome = { showAddIncome = true },
                    onDeleteIncome = { income ->
                        // Optimistic removal — remove from list immediately
                        state = state.copy(incomes = state.incomes.filter { it.id != income.id })
                        scope.launch {
                            try {
                                repo.deleteIncome(income.id)
                                Toast.makeText(context, "Ingreso eliminado", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                load() // Revert by reloading on error
                                Toast.makeText(context, "No se pudo eliminar el ingreso", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                )
            }

            // Transactions header
            item {
                SectionHeader(
                    "Pagos del mes",
                    trailing = "${state.paidCount} de ${state.paidCount + state.pendingCount} pagados"
                )
            }

            // Search filter
            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Buscar pago") },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = MUTED, modifier = Modifier.size(18.dp)) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Close, "Limpiar", tint = MUTED, modifier = Modifier.size(16.dp))
                            }
                        }
                    },
                    colors = appFieldColors(),
                    shape = RoundedCornerShape(14.dp)
                )
            }

            // Transaction list
            if (displayedTransactions.isEmpty()) {
                item {
                    Box(
                        Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            if (searchQuery.isBlank()) "Sin transacciones este mes" else "Sin resultados para \"$searchQuery\"",
                            color = MUTED, fontSize = 13.sp
                        )
                    }
                }
            } else {
                item {
                GroupedPanel {
                displayedTransactions.forEachIndexed { index, txn ->
                    key(txn.id) {
                    TransactionItem(
                        txn = txn,
                        showDivider = index > 0,
                        onTogglePaid = {
                            val newPaid = !txn.isPaid
                            // Optimistic update: flip the item in place — no reload, no scroll reset
                            state = state.copy(
                                transactions = state.transactions.map { t ->
                                    if (t.id == txn.id) t.copy(isPaid = newPaid) else t
                                }
                            )
                            scope.launch {
                                try {
                                    repo.togglePaid(txn.id, newPaid)
                                    Toast.makeText(context, if (newPaid) "Marcado como pagado" else "Marcado como pendiente", Toast.LENGTH_SHORT).show()
                                } catch (e: Exception) {
                                    // Revert optimistic change on error
                                    state = state.copy(
                                        transactions = state.transactions.map { t ->
                                            if (t.id == txn.id) t.copy(isPaid = !newPaid) else t
                                        }
                                    )
                                    Toast.makeText(context, "No se pudo guardar el cambio", Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        onEdit = { editingTxn = txn },
                        onDelete = { showDeleteTxn = txn }
                    )
                    }
                }
                }
                }
            }

            item { Spacer(Modifier.height(88.dp)) }
        }
    }

    // Add transaction dialog
    if (showAddTxn) {
        TransactionDialog(
            title = "Nueva Transacción",
            initial = null,
            year = ym.year, month = ym.monthValue,
            onDismiss = { showAddTxn = false },
            onSave = { insert ->
                scope.launch {
                    runCatching { repo.addTransaction(insert) }
                        .onSuccess { showAddTxn = false; Toast.makeText(context, "Transacción creada", Toast.LENGTH_SHORT).show(); load() }
                        .onFailure { Toast.makeText(context, "No se pudo crear la transacción", Toast.LENGTH_SHORT).show() }
                }
            }
        )
    }

    // Edit transaction dialog
    editingTxn?.let { txn ->
        TransactionDialog(
            title = "Editar Transacción",
            initial = txn,
            year = ym.year, month = ym.monthValue,
            onDismiss = { editingTxn = null },
            onSave = { insert ->
                scope.launch {
                    runCatching { repo.updateTransaction(txn.id, insert) }
                        .onSuccess { editingTxn = null; Toast.makeText(context, "Transacción actualizada", Toast.LENGTH_SHORT).show(); load() }
                        .onFailure { Toast.makeText(context, "No se pudo actualizar", Toast.LENGTH_SHORT).show() }
                }
            }
        )
    }

    // Add income dialog
    if (showAddIncome) {
        IncomeDialog(
            year = ym.year, month = ym.monthValue,
            onDismiss = { showAddIncome = false },
            onSave = { insert ->
                scope.launch {
                    runCatching { repo.addIncome(insert) }
                        .onSuccess { showAddIncome = false; Toast.makeText(context, "Ingreso agregado", Toast.LENGTH_SHORT).show(); load() }
                        .onFailure { Toast.makeText(context, "No se pudo agregar el ingreso", Toast.LENGTH_SHORT).show() }
                }
            }
        )
    }

    // Delete confirmation
    showDeleteTxn?.let { txn ->
        AlertDialog(
            onDismissRequest = { showDeleteTxn = null },
            containerColor = SURFACE,
            title = { Text("Eliminar", color = WHITE) },
            text = { Text("¿Eliminar \"${txn.description}\"?", color = MUTED) },
            confirmButton = {
                TextButton(onClick = {
                    // Optimistic removal — remove from list before API call
                    state = state.copy(transactions = state.transactions.filter { it.id != txn.id })
                    showDeleteTxn = null
                    scope.launch {
                        try {
                            repo.deleteTransaction(txn.id)
                            Toast.makeText(context, "Transacción eliminada", Toast.LENGTH_SHORT).show()
                        } catch (e: Exception) {
                            load() // Revert by reloading on error
                            Toast.makeText(context, "No se pudo eliminar", Toast.LENGTH_SHORT).show()
                        }
                    }
                }) { Text("Eliminar", color = RED) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteTxn = null }) {
                    Text("Cancelar", color = MUTED)
                }
            }
        )
    }

    // Copy from previous month confirmation
    if (showCopyConfirm) {
        val prevYm = ym.minusMonths(1)
        val prevLabel = prevYm.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale("es")))
            .replaceFirstChar { it.uppercase() }
        AlertDialog(
            onDismissRequest = { showCopyConfirm = false },
            containerColor = SURFACE,
            title = { Text("Copiar del mes anterior", color = WHITE) },
            text = {
                Text(
                    "¿Copiar las transacciones de $prevLabel a $monthLabel?\n\nSe copiarán como pendientes.",
                    color = MUTED
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch {
                        runCatching { repo.copyFromPreviousMonth(prevYm.year, prevYm.monthValue, ym.year, ym.monthValue) }
                            .onSuccess { showCopyConfirm = false; Toast.makeText(context, "Mes anterior copiado", Toast.LENGTH_SHORT).show(); load() }
                            .onFailure { Toast.makeText(context, "No se pudo copiar el mes", Toast.LENGTH_SHORT).show() }
                    }
                }) { Text("Copiar", color = TEAL) }
            },
            dismissButton = {
                TextButton(onClick = { showCopyConfirm = false }) {
                    Text("Cancelar", color = MUTED)
                }
            }
        )
    }
}

// ---------------------------------------------------------------------------
// Income Section
// ---------------------------------------------------------------------------
@Composable
private fun IncomeSection(
    state: MonthlyControlState,
    prevBalance: String,
    onPrevBalanceChange: (String) -> Unit,
    expanded: Boolean,
    onToggle: () -> Unit,
    onAddIncome: () -> Unit,
    onDeleteIncome: (MonthlyIncomeRow) -> Unit
) {
    GroupedPanel {
        Row(
            modifier = Modifier.fillMaxWidth().clickable { onToggle() }.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text("Ingresos", color = WHITE, style = MaterialTheme.typography.titleSmall)
                Text(
                    "${state.incomes.size} ${if (state.incomes.size == 1) "fuente" else "fuentes"}",
                    color = MUTED,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            MoneyText(state.totalIncome, color = WHITE, fontSize = 17)
            Spacer(Modifier.width(6.dp))
            Icon(
                if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                if (expanded) "Contraer" else "Expandir",
                tint = MUTED, modifier = Modifier.size(20.dp)
            )
        }

        if (expanded) {
            state.incomes.forEach { income ->
                PanelDivider(startIndent = 16.dp)
                Row(
                    modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 6.dp, top = 6.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(income.source, color = WHITE, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    MoneyText(income.amount, color = WHITE, fontSize = 14)
                    IconButton(onClick = { onDeleteIncome(income) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Close, "Eliminar ingreso", tint = AppColors.Dim, modifier = Modifier.size(16.dp))
                    }
                }
            }

            PanelDivider(startIndent = 16.dp)
            TextButton(onClick = onAddIncome, modifier = Modifier.padding(horizontal = 4.dp)) {
                Icon(Icons.Default.Add, null, tint = TEAL, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Agregar ingreso", color = TEAL, style = MaterialTheme.typography.labelLarge)
            }

            PanelDivider(startIndent = 0.dp)
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Saldo anterior", color = MUTED, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                OutlinedTextField(
                    value = prevBalance,
                    onValueChange = onPrevBalanceChange,
                    modifier = Modifier.width(140.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    textStyle = MoneyStyle.copy(color = WHITE, fontSize = 15.sp),
                    colors = appFieldColors(),
                    shape = RoundedCornerShape(12.dp),
                    prefix = { Text("$", color = MUTED) }
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Disponible", color = MUTED, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                MoneyText(state.available, color = WHITE, fontSize = 16)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Resumen: saldo final como cifra principal y desglose en un solo panel
// ---------------------------------------------------------------------------
@Composable
private fun SummaryCards(state: MonthlyControlState) {
    val positive = state.saldoFinal >= 0
    val formatted = String.format("%,.2f", kotlin.math.abs(state.saldoFinal))

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Column(Modifier.padding(top = 8.dp, start = 2.dp)) {
            Text("Saldo final del mes", color = MUTED, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    (if (positive) "" else "−") + "$",
                    color = if (positive) MUTED else RED,
                    style = MoneyStyle, fontSize = 26.sp,
                    modifier = Modifier.padding(bottom = 7.dp, end = 2.dp)
                )
                Text(
                    formatted.substringBeforeLast('.'),
                    color = if (positive) WHITE else RED,
                    style = MoneyStyle, fontSize = 46.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1.2).sp
                )
                Text(
                    "." + formatted.substringAfterLast('.'),
                    color = MUTED, style = MoneyStyle, fontSize = 22.sp,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }
            Spacer(Modifier.height(4.dp))
            Text(
                "Ingresos ${money(state.totalIncome)}  ·  Gasto total ${money(state.totalSpent)}",
                color = MUTED,
                style = MaterialTheme.typography.bodySmall
            )
        }

        GroupedPanel {
            Row(Modifier.fillMaxWidth()) {
                MetricCard("Gastos", state.totalGastos, WHITE, Modifier.weight(1f))
                VerticalHairline()
                MetricCard("Inversión", state.totalInversion, GREEN, Modifier.weight(1f))
            }
            PanelDivider(startIndent = 0.dp)
            Row(Modifier.fillMaxWidth()) {
                MetricCard("Deuda", state.totalDeuda, RED, Modifier.weight(1f))
                VerticalHairline()
                MetricCard("Ahorro", state.totalAhorro, TEAL, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun VerticalHairline() {
    Box(Modifier.width(1.dp).height(64.dp).background(AppColors.Hairline))
}

@Composable
private fun MetricCard(label: String, amount: Double, color: Color, modifier: Modifier = Modifier) {
    Column(modifier = modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(6.dp).background(color, CircleShape))
            Spacer(Modifier.width(6.dp))
            Text(label, color = MUTED, style = MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(4.dp))
        MoneyText(amount, color = WHITE, fontSize = 17)
    }
}

// ---------------------------------------------------------------------------
// Transaction Item: toca para editar, mantén presionado para eliminar
// ---------------------------------------------------------------------------
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun TransactionItem(
    txn: FullManualTransactionRow,
    modifier: Modifier = Modifier,
    showDivider: Boolean = false,
    onTogglePaid: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val typeColor = typeColor(txn.transactionType)
    val typeLabel = TRANSACTION_TYPE_LABELS[txn.transactionType ?: ""] ?: "Gasto"
    val meta = listOfNotNull(typeLabel, txn.paymentMethod, txn.notes).joinToString(" · ")

    Column(modifier) {
        if (showDivider) PanelDivider()
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .combinedClickable(onClick = onEdit, onLongClick = onDelete)
                .padding(start = 16.dp, end = 12.dp, top = 12.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Día del mes
            Column(Modifier.width(36.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = txn.day?.toString() ?: "–",
                    color = if (txn.isPaid) MUTED else WHITE,
                    style = MoneyStyle, fontSize = 18.sp, fontWeight = FontWeight.Medium
                )
                Box(Modifier.size(width = 14.dp, height = 2.dp).background(typeColor.copy(alpha = 0.8f), RoundedCornerShape(1.dp)))
            }

            Spacer(Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = txn.description,
                    color = if (txn.isPaid) MUTED else WHITE,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(meta, color = MUTED, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }

            Spacer(Modifier.width(10.dp))
            MoneyText(txn.amount, color = if (txn.isPaid) MUTED else WHITE, fontSize = 15)
            Spacer(Modifier.width(12.dp))
            CheckCircle(checked = txn.isPaid, onClick = onTogglePaid, size = 28.dp)
        }
    }
}

// ---------------------------------------------------------------------------
// Add / Edit Transaction Dialog
// ---------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TransactionDialog(
    title: String,
    initial: FullManualTransactionRow?,
    year: Int,
    month: Int,
    onDismiss: () -> Unit,
    onSave: (ManualTransactionInsert) -> Unit
) {
    var day by remember { mutableStateOf(initial?.day?.toString() ?: "") }
    var description by remember { mutableStateOf(initial?.description ?: "") }
    var amount by remember { mutableStateOf(initial?.amount?.toString() ?: "") }
    var txnType by remember { mutableStateOf(initial?.transactionType ?: "") }
    var paymentMethod by remember { mutableStateOf(initial?.paymentMethod ?: "") }
    var isPaid by remember { mutableStateOf(initial?.isPaid ?: false) }
    var notes by remember { mutableStateOf(initial?.notes ?: "") }
    var typeExpanded by remember { mutableStateOf(false) }
    var methodExpanded by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(8.dp),
            colors = CardDefaults.cardColors(containerColor = SURFACE),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(title, color = WHITE, fontSize = 18.sp, fontWeight = FontWeight.Bold)

                // Day + Description
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = day, onValueChange = { day = it },
                        label = { Text("Día", color = MUTED) },
                        modifier = Modifier.width(80.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        colors = inputColors()
                    )
                    OutlinedTextField(
                        value = description, onValueChange = { description = it },
                        label = { Text("Descripción *", color = MUTED) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        colors = inputColors()
                    )
                }

                // Amount
                OutlinedTextField(
                    value = amount, onValueChange = { amount = it },
                    label = { Text("Monto *", color = MUTED) },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    prefix = { Text("$", color = MUTED) },
                    colors = inputColors()
                )

                // Transaction Type dropdown
                ExposedDropdownMenuBox(
                    expanded = typeExpanded,
                    onExpandedChange = { typeExpanded = it }
                ) {
                    OutlinedTextField(
                        value = TRANSACTION_TYPE_LABELS[txnType] ?: "Gasto Normal",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Tipo", color = MUTED) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = typeExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        colors = inputColors()
                    )
                    ExposedDropdownMenu(
                        expanded = typeExpanded,
                        onDismissRequest = { typeExpanded = false },
                        modifier = Modifier.background(SURFACE)
                    ) {
                        TRANSACTION_TYPES.forEach { type ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        TRANSACTION_TYPE_LABELS[type] ?: "Gasto Normal",
                                        color = typeColor(type.ifEmpty { null })
                                    )
                                },
                                onClick = { txnType = type; typeExpanded = false }
                            )
                        }
                    }
                }

                // Payment Method dropdown
                ExposedDropdownMenuBox(
                    expanded = methodExpanded,
                    onExpandedChange = { methodExpanded = it }
                ) {
                    OutlinedTextField(
                        value = paymentMethod.ifEmpty { "Seleccionar..." },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Forma de pago", color = MUTED) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = methodExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        colors = inputColors()
                    )
                    ExposedDropdownMenu(
                        expanded = methodExpanded,
                        onDismissRequest = { methodExpanded = false },
                        modifier = Modifier.background(SURFACE)
                    ) {
                        DropdownMenuItem(
                            text = { Text("-", color = MUTED) },
                            onClick = { paymentMethod = ""; methodExpanded = false }
                        )
                        PAYMENT_METHODS.forEach { method ->
                            DropdownMenuItem(
                                text = { Text(method, color = WHITE) },
                                onClick = { paymentMethod = method; methodExpanded = false }
                            )
                        }
                    }
                }

                // Notes
                OutlinedTextField(
                    value = notes, onValueChange = { notes = it },
                    label = { Text("Notas", color = MUTED) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = inputColors()
                )

                // Paid toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Estado:", color = MUTED, fontSize = 14.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (isPaid) "Pagado ✓" else "Pendiente ⏳",
                            color = if (isPaid) GREEN else ORANGE,
                            fontSize = 14.sp, fontWeight = FontWeight.Medium
                        )
                        Spacer(Modifier.width(8.dp))
                        Switch(
                            checked = isPaid,
                            onCheckedChange = { isPaid = it },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = GREEN,
                                checkedTrackColor = GREEN.copy(alpha = 0.4f),
                                uncheckedThumbColor = ORANGE,
                                uncheckedTrackColor = ORANGE.copy(alpha = 0.3f)
                            )
                        )
                    }
                }

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancelar", color = MUTED)
                    }
                    Spacer(Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (description.isBlank() || amount.isBlank()) return@Button
                            onSave(
                                ManualTransactionInsert(
                                    year = year, month = month,
                                    day = day.toIntOrNull(),
                                    description = description.trim(),
                                    amount = amount.toDoubleOrNull() ?: 0.0,
                                    transactionType = txnType.ifEmpty { null },
                                    paymentMethod = paymentMethod.ifEmpty { null },
                                    isPaid = isPaid,
                                    notes = notes.trim().ifEmpty { null }
                                )
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = TEAL)
                    ) {
                        Text("Guardar", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Add Income Dialog
// ---------------------------------------------------------------------------
@Composable
private fun IncomeDialog(
    year: Int,
    month: Int,
    onDismiss: () -> Unit,
    onSave: (MonthlyIncomeInsert) -> Unit
) {
    var source by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(8.dp),
            colors = CardDefaults.cardColors(containerColor = SURFACE),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Nuevo Ingreso", color = WHITE, fontSize = 18.sp, fontWeight = FontWeight.Bold)

                OutlinedTextField(
                    value = source, onValueChange = { source = it },
                    label = { Text("Fuente *", color = MUTED) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = inputColors()
                )
                OutlinedTextField(
                    value = amount, onValueChange = { amount = it },
                    label = { Text("Monto *", color = MUTED) },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    prefix = { Text("$", color = MUTED) },
                    colors = inputColors()
                )
                OutlinedTextField(
                    value = notes, onValueChange = { notes = it },
                    label = { Text("Notas", color = MUTED) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = inputColors()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) { Text("Cancelar", color = MUTED) }
                    Spacer(Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (source.isBlank() || amount.isBlank()) return@Button
                            onSave(
                                MonthlyIncomeInsert(
                                    year = year, month = month,
                                    source = source.trim(),
                                    amount = amount.toDoubleOrNull() ?: 0.0,
                                    notes = notes.trim().ifEmpty { null }
                                )
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = TEAL)
                    ) { Text("Guardar", color = Color.Black, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Input field colours helper
// ---------------------------------------------------------------------------
@Composable
private fun inputColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = TEAL,
    unfocusedBorderColor = AppColors.Hairline,
    focusedLabelColor = TEAL,
    cursorColor = TEAL,
    focusedTextColor = WHITE,
    unfocusedTextColor = WHITE
)
