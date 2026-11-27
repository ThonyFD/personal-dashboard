package com.thonyfd.financedashboard.push

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PushRepositoryTest {

    @Test
    fun rowUsesTokenAsEndpointAndKey() {
        val row = subscriptionRow("tok", "me@example.test", "Pixel 8")
        assertEquals("tok", row.endpoint)
        assertEquals(PushKeys(fcmToken = "tok", platform = "android"), row.keys)
        assertEquals("Android app (Pixel 8)", row.userAgent)
        assertTrue(row.isActive)
    }

    @Test
    fun rowSerializesWithDatabaseColumnNames() {
        val json = Json.encodeToString(subscriptionRow("tok", "me@example.test", "Pixel 8"))
        assertEquals(
            """{"endpoint":"tok","keys":{"fcmToken":"tok","platform":"android"},"user_email":"me@example.test","user_agent":"Android app (Pixel 8)","is_active":true}""",
            json
        )
    }

    // Prod push_subscriptions has no UNIQUE on endpoint (only the id primary key), so
    // registration cannot use ON CONFLICT: it looks the token up first.
    @Test
    fun newTokenIsInserted() {
        assertEquals(RegistrationPlan.Insert, registrationPlan(emptyList()))
    }

    @Test
    fun knownTokenReactivatesItsOldestRow() {
        assertEquals(RegistrationPlan.Activate(4L), registrationPlan(listOf(9L, 4L, 7L)))
    }
}
