package com.thonyfd.financedashboard

import android.app.Application
import com.thonyfd.financedashboard.push.PushRepository
import com.thonyfd.financedashboard.push.PushSetup
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class FinanceDashboardApp : Application() {
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        PushSetup.init(this)
        appScope.launch { PushRepository.retryPendingTokenDelete(this@FinanceDashboardApp) }
    }
}
