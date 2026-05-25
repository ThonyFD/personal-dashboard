package com.thonyfd.financedashboard.ui

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

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
private val BG           = Color(0xFF0F0F1A)
private val SURFACE      = Color(0xFF16213E)
private val TEAL         = Color(0xFF00D4AA)
private val MUTED        = Color(0xFF888888)
private val RED          = Color(0xFFFF6B6B)
private val ORANGE       = Color(0xFFFFB347)
private val GREEN        = Color(0xFF4CAF50)
private val WHITE        = Color.White
private val PURPLE       = Color(0xFF805AD5)

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

    // Month label
    val monthLabel = remember(ym) {
        ym.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale("es")))
            .replaceFirstChar { it.uppercase() }
    }
    val isCurrentMonth = ym == YearMonth.now()

    // Load data when month changes
    suspend fun load() {
        state = state.copy(isLoading = true, error = null)
        try {
            val txns = repo.fetchTransactions(ym.year, ym.monthValue)
            val incomes = repo.fetchIncomes(ym.year, ym.monthValue)
            state = state.copy(
                year = ym.year, month = ym.monthValue,
                transactions = txns, incomes = incomes,
                previousBalance = prevBalance.toDoubleOrNull() ?: 0.0,
                isLoading = false
            )
        } catch (e: Exception) {
            state = state.copy(isLoading = false, error = e.message)
        }
    }

    LaunchedEffect(ym) { load() }

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
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = WHITE
                        )
                        IconButton(
                            onClick = { if (!isCurrentMonth) ym = ym.plusMonths(1) },
                            enabled = !isCurrentMonth
                        ) {
                            Icon(
                                Icons.Default.ChevronRight, null,
                                tint = if (isCurrentMonth) Color(0xFF333333) else TEAL
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { scope.launch { load() } }) {
                        Icon(Icons.Default.Refresh, null, tint = TEAL)
                    }
                    IconButton(onClick = { showCopyConfirm = true }) {
                        Icon(Icons.Default.ContentCopy, null, tint = MUTED)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A1A2E),
                    titleContentColor = WHITE
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddTxn = true },
                containerColor = TEAL,
                contentColor = Color.Black
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
                Text("⚠️ ${state.error}", color = RED, fontSize = 14.sp)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
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
                        scope.launch {
                            repo.deleteIncome(income.id)
                            load()
                        }
                    }
                )
            }

            // Summary cards
            item { SummaryCards(state) }

            // Transactions header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "TRANSACCIONES (${state.transactions.size})",
                        color = TEAL, fontSize = 11.sp, fontWeight = FontWeight.Bold
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            "✓ ${state.paidCount}",
                            color = GREEN, fontSize = 12.sp, fontWeight = FontWeight.Bold
                        )
                        Text(
                            "⏳ ${state.pendingCount}",
                            color = ORANGE, fontSize = 12.sp, fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Transaction list
            if (state.transactions.isEmpty()) {
                item {
                    Box(
                        Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Sin transacciones este mes", color = MUTED, fontSize = 13.sp)
                    }
                }
            } else {
                items(state.transactions, key = { it.id }) { txn ->
                    TransactionItem(
                        txn = txn,
                        onTogglePaid = {
                            scope.launch {
                                repo.togglePaid(txn.id, !txn.isPaid)
                                load()
                            }
                        },
                        onEdit = { editingTxn = txn },
                        onDelete = { showDeleteTxn = txn }
                    )
                }
            }

            item { Spacer(Modifier.height(80.dp)) }
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
                    repo.addTransaction(insert)
                    showAddTxn = false
                    load()
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
                    repo.updateTransaction(txn.id, insert)
                    editingTxn = null
                    load()
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
                    repo.addIncome(insert)
                    showAddIncome = false
                    load()
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
                    scope.launch {
                        repo.deleteTransaction(txn.id)
                        showDeleteTxn = null
                        load()
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
                        repo.copyFromPreviousMonth(prevYm.year, prevYm.monthValue, ym.year, ym.monthValue)
                        showCopyConfirm = false
                        load()
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
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SURFACE),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { onToggle() },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("INGRESOS DEL MES", color = TEAL, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "$${String.format("%,.2f", state.totalIncome)}",
                        color = GREEN, fontSize = 16.sp, fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        null, tint = MUTED, modifier = Modifier.size(18.dp)
                    )
                }
            }

            if (expanded) {
                Spacer(Modifier.height(10.dp))

                state.incomes.forEach { income ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(income.source, color = WHITE, fontSize = 14.sp, modifier = Modifier.weight(1f))
                        Text("$${String.format("%,.2f", income.amount)}", color = GREEN, fontSize = 14.sp)
                        Spacer(Modifier.width(8.dp))
                        IconButton(
                            onClick = { onDeleteIncome(income) },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.Close, null, tint = RED, modifier = Modifier.size(16.dp))
                        }
                    }
                }

                TextButton(onClick = onAddIncome, modifier = Modifier.align(Alignment.Start)) {
                    Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Agregar ingreso", color = TEAL, fontSize = 13.sp)
                }

                HorizontalDivider(color = Color(0xFF2A2A4A))
                Spacer(Modifier.height(8.dp))

                // Previous balance input
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Saldo anterior:", color = MUTED, fontSize = 13.sp)
                    OutlinedTextField(
                        value = prevBalance,
                        onValueChange = onPrevBalanceChange,
                        modifier = Modifier.width(140.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        textStyle = androidx.compose.ui.text.TextStyle(color = WHITE, fontSize = 14.sp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = TEAL, unfocusedBorderColor = Color(0xFF333355),
                            cursorColor = TEAL
                        ),
                        prefix = { Text("$", color = MUTED) }
                    )
                }

                Spacer(Modifier.height(6.6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Disponible:", color = MUTED, fontSize = 13.sp)
                    Text(
                        "$${String.format("%,.2f", state.available)}",
                        color = WHITE, fontSize = 14.sp, fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------
@Composable
private fun SummaryCards(state: MonthlyControlState) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Row 1: metrics group
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(SURFACE, RoundedCornerShape(10.dp))
                .padding(6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            MetricCard("Gastos",    state.totalGastos,    WHITE, Modifier.weight(1f))
            MetricCard("Inversión", state.totalInversion, GREEN, Modifier.weight(1f))
            MetricCard("Deuda",     state.totalDeuda,     RED,   Modifier.weight(1f))
            MetricCard("Ahorro",    state.totalAhorro,    TEAL,  Modifier.weight(1f))
        }
        // Row 2: totals group
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF1E1440), RoundedCornerShape(10.dp))
                .padding(6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            MetricCard("Saldo Final",        state.saldoFinal, if (state.saldoFinal >= 0) GREEN else RED, Modifier.weight(1f))
            MetricCard("Gasto Total", state.totalSpent, PURPLE, Modifier.weight(1f))
        }
    }
}

@Composable
private fun MetricCard(label: String, amount: Double, color: Color, modifier: Modifier = Modifier) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F0F2A)),
        shape = RoundedCornerShape(8.dp),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(label, color = MUTED, fontSize = 10.sp)
            Spacer(Modifier.height(4.dp))
            Text(
                "$${String.format("%,.2f", amount)}",
                color = color,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Transaction Item
// ---------------------------------------------------------------------------
@Composable
private fun TransactionItem(
    txn: FullManualTransactionRow,
    onTogglePaid: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val rowBg = if (txn.isPaid) SURFACE else Color(0xFF1F1F3A)
    val typeColor = typeColor(txn.transactionType)
    val typeLabel = TRANSACTION_TYPE_LABELS[txn.transactionType ?: ""] ?: "Gasto"

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = rowBg),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Day badge
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .background(Color(0xFF0F0F2A), RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = txn.day?.toString() ?: "-",
                    color = TEAL, fontSize = 13.sp, fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.width(10.dp))

            // Description + meta
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = txn.description,
                    color = if (txn.isPaid) MUTED else WHITE,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (txn.transactionType != null) {
                        Text(typeLabel, color = typeColor, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                        Text("·", color = MUTED, fontSize = 10.sp)
                    }
                    if (txn.paymentMethod != null) {
                        Text(txn.paymentMethod, color = MUTED, fontSize = 10.sp)
                    }
                    if (txn.notes != null) {
                        Text("·", color = MUTED, fontSize = 10.sp)
                        Text(txn.notes, color = MUTED, fontSize = 10.sp)
                    }
                }
            }

            Spacer(Modifier.width(8.dp))

            // Amount
            Text(
                text = "$${String.format("%,.2f", txn.amount)}",
                color = typeColor,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(Modifier.width(8.dp))

            // Paid toggle
            IconButton(onClick = onTogglePaid, modifier = Modifier.size(32.dp)) {
                Text(
                    text = if (txn.isPaid) "✓" else "⏳",
                    fontSize = 16.sp
                )
            }

            // Edit
            IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Edit, null, tint = MUTED, modifier = Modifier.size(16.dp))
            }

            // Delete
            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Delete, null, tint = RED.copy(alpha = 0.6f), modifier = Modifier.size(16.dp))
            }
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
    unfocusedBorderColor = Color(0xFF333355),
    focusedLabelColor = TEAL,
    cursorColor = TEAL,
    focusedTextColor = WHITE,
    unfocusedTextColor = WHITE
)
