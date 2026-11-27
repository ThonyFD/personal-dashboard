package com.thonyfd.financedashboard.data.repository

import android.content.Context
import com.thonyfd.financedashboard.data.SupabaseConfig
import com.thonyfd.financedashboard.data.models.MANUAL_PROVIDER
import com.thonyfd.financedashboard.data.models.ManualTransferInsert
import com.thonyfd.financedashboard.data.models.MerchantOption
import io.github.jan.supabase.postgrest.exception.PostgrestRestException
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order

/** Manual transfers (bank-app transfers that send no email). See data/models/ManualTransfer.kt. */
class ManualTransferRepository {

    private val supabase = SupabaseConfig.client

    /** Every merchant, most used first, for the dialog's search. */
    suspend fun fetchMerchants(): List<MerchantOption> =
        supabase.from("merchants")
            .select(Columns.list("id", "name")) {
                order("transaction_count", Order.DESCENDING)
                limit(2000)
            }
            .decodeList<MerchantOption>()

    /** A repeated key means the row is already saved: not an error. */
    suspend fun record(row: ManualTransferInsert) {
        try {
            supabase.from("transactions").insert(row)
        } catch (e: PostgrestRestException) {
            if (e.code != "23505") throw e
        }
    }

    /** Only rows typed in by hand: ingested rows would come back on the next sync. */
    suspend fun delete(id: Long) {
        supabase.from("transactions").delete {
            filter {
                eq("id", id)
                eq("provider", MANUAL_PROVIDER)
            }
        }
    }
}

/** Merchant of the last saved transfer, so the usual payee comes preselected. */
class LastManualMerchantStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun read(): Long? = prefs.getLong(KEY, 0L).takeIf { it > 0L }

    fun save(id: Long) {
        prefs.edit().putLong(KEY, id).apply()
    }

    private companion object {
        const val PREFS = "manual_transfer"
        const val KEY = "last_merchant_id"
    }
}
