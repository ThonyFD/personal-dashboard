package com.thonyfd.financedashboard

import android.app.Application
import com.thonyfd.financedashboard.push.PushSetup

class FinanceDashboardApp : Application() {
    override fun onCreate() {
        super.onCreate()
        PushSetup.init(this)
    }
}
