package com.thonyfd.financedashboard.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.thonyfd.financedashboard.data.models.MerchantOption
import com.thonyfd.financedashboard.data.models.Transaction
import com.thonyfd.financedashboard.data.models.manualTransferInsert
import com.thonyfd.financedashboard.data.models.matchMerchants
import com.thonyfd.financedashboard.data.models.parseManualAmount
import com.thonyfd.financedashboard.data.models.todayInPanama
import com.thonyfd.financedashboard.data.repository.LastManualMerchantStore
import com.thonyfd.financedashboard.data.repository.ManualTransferRepository
import com.thonyfd.financedashboard.ui.theme.AppTheme
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

private val dateLabel = DateTimeFormatter.ofPattern("d MMM yyyy", Locale("es"))

/**
 * Bank-app transfer that sends no email. Saved as a TRANSFER of the chosen
 * merchant, so it counts in that merchant's category and budget. No push alert.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualTransferDialog(onDismiss: () -> Unit, onSaved: (message: String) -> Unit) {
    val context = LocalContext.current
    val repo = remember { ManualTransferRepository() }
    val store = remember { LastManualMerchantStore(context) }
    val scope = rememberCoroutineScope()
    // One key per dialog: a double tap saves a single row.
    val key = remember { UUID.randomUUID().toString() }

    var merchants by remember { mutableStateOf<List<MerchantOption>>(emptyList()) }
    var loadingMerchants by remember { mutableStateOf(true) }
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<MerchantOption?>(null) }
    var amountText by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(todayInPanama()) }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            val list = repo.fetchMerchants()
            merchants = list
            val last = store.read()?.let { id -> list.firstOrNull { it.id == id } }
            if (last != null && selected == null && query.isEmpty()) {
                selected = last
                query = last.name
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = "No se pudieron cargar los comercios"
        } finally {
            loadingMerchants = false
        }
    }

    val suggestions = if (selected != null && selected?.name == query) emptyList() else matchMerchants(merchants, query)

    fun save() {
        val merchant = selected
        val amount = parseManualAmount(amountText)
        if (merchant == null) {
            error = "Elige un comercio de la lista"
            return
        }
        if (amount == null) {
            error = "Escribe un monto mayor que cero"
            return
        }
        error = null
        saving = true
        scope.launch {
            try {
                repo.record(manualTransferInsert(merchant, amount, date, note, key))
                store.save(merchant.id)
                onSaved("Transferencia de ${money(amount)} a ${merchant.name} guardada")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = e.message ?: "No se pudo guardar la transferencia"
                saving = false
            }
        }
    }

    Dialog(onDismissRequest = { if (!saving) onDismiss() }) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(8.dp),
            colors = CardDefaults.cardColors(containerColor = AppTheme.colors.surface),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Registrar transferencia", color = AppTheme.colors.text, style = MaterialTheme.typography.titleMedium)
                Text(
                    "Para transferencias que no mandan correo. Cuenta en el presupuesto del comercio, sin aviso push.",
                    color = AppTheme.colors.textSecondary,
                    style = MaterialTheme.typography.bodySmall
                )

                OutlinedTextField(
                    value = query,
                    onValueChange = { text ->
                        query = text
                        selected = merchants.firstOrNull { it.name.equals(text.trim(), ignoreCase = true) }
                    },
                    label = { Text("Comercio o persona") },
                    placeholder = { Text(if (loadingMerchants) "Cargando..." else "Escribe para buscar") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = appFieldColors()
                )
                if (suggestions.isNotEmpty()) {
                    GroupedPanel {
                        suggestions.forEachIndexed { index, m ->
                            if (index > 0) PanelDivider(startIndent = 16.dp)
                            Text(
                                m.name,
                                color = AppTheme.colors.text,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selected = m
                                        query = m.name
                                    }
                                    .padding(horizontal = 16.dp, vertical = 12.dp)
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Monto") },
                    prefix = { Text("$") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = appFieldColors()
                )

                AppButton(
                    text = "Fecha: ${date.format(dateLabel)}",
                    onClick = { showDatePicker = true },
                    style = AppButtonStyle.Secondary,
                    leadingIcon = Icons.Default.DateRange,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Nota (opcional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = appFieldColors()
                )

                error?.let {
                    Text(it, color = AppTheme.colors.negative, style = MaterialTheme.typography.bodySmall)
                }

                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, androidx.compose.ui.Alignment.End)) {
                    AppButton("Cancelar", onClick = onDismiss, style = AppButtonStyle.Text, enabled = !saving)
                    AppButton("Guardar", onClick = { save() }, loading = saving)
                }
            }
        }
    }

    if (showDatePicker) {
        val state = rememberDatePickerState(
            initialSelectedDateMillis = date.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { date = utcMillisToDate(it) }
                    showDatePicker = false
                }) { Text("Listo") }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancelar") } }
        ) {
            DatePicker(state = state)
        }
    }
}

// The date picker works in UTC midnight millis.
private fun utcMillisToDate(millis: Long): LocalDate = Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate()

/** Confirms and deletes a manual entry. Ingested rows never reach this dialog. */
@Composable
fun DeleteManualTransferDialog(txn: Transaction, onDismiss: () -> Unit, onDeleted: () -> Unit) {
    val repo = remember { ManualTransferRepository() }
    val scope = rememberCoroutineScope()
    var deleting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!deleting) onDismiss() },
        containerColor = AppTheme.colors.surface,
        title = { Text("Eliminar entrada manual", color = AppTheme.colors.text) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "${txn.merchantName ?: "Sin comercio"} · ${money(txn.amount)} · ${txn.txnDate.take(10)}",
                    color = AppTheme.colors.textSecondary
                )
                error?.let { Text(it, color = AppTheme.colors.negative, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            AppButton(
                "Eliminar",
                onClick = {
                    deleting = true
                    scope.launch {
                        try {
                            repo.delete(txn.id)
                            onDeleted()
                        } catch (e: CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            error = e.message ?: "No se pudo eliminar"
                            deleting = false
                        }
                    }
                },
                style = AppButtonStyle.Danger,
                loading = deleting
            )
        },
        dismissButton = { AppButton("Cancelar", onClick = onDismiss, style = AppButtonStyle.Text, enabled = !deleting) }
    )
}
