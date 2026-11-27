# Android Native Push (FCM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner's Android app receives budget alerts and payment reminders as native FCM notifications, with a per-device on/off switch in the app menu.

**Architecture:** Firebase is initialised by hand from `BuildConfig` values (from `local.properties`) in a new `Application` class. A `PushRepository` stores this phone's FCM token as a row in `push_subscriptions`, the same table the web uses, so the existing sender reaches it unchanged. The sender gains an `android` block (tag, channel, priority) built by a pure `buildMessage()`.

**Tech Stack:** Kotlin, Jetpack Compose, supabase-kt 3.1.4, Firebase Android BoM 34.19.0 (`firebase-messaging` 25.1.3), TypeScript + firebase-admin + Vitest for the sender.

**Spec:** `docs/superpowers/specs/2026-11-26-android-fcm-design.md`

## Global Constraints

- Branch `feat/android-fcm`, based on `main` at c2cf9ce.
- Never commit Firebase config or keys; `local.properties` is gitignored and stays that way. Repo is public.
- Logs (Actions and Android `Log`) never contain tokens, emails, amounts or merchants. Ids, tags and counts only.
- Web push payload (`notification`, `data`, `webpush`) must stay byte-for-byte what it is today.
- Channel ids exactly: `budget_alerts` (name "Presupuesto"), `payment_reminders` (name "Pagos"). Default channel for messages without one: `budget_alerts`.
- Tags exactly: `payment-reminder`, `budget-alert-<transactionId>`.
- Tap targets: `payment-reminder` opens `AppTab.Control` (index 1), `budget-alert-*` opens `AppTab.Inicio` (index 0). Non-owners go through `resolveDeepLinkTab`, which already blocks finance tabs.
- `push_subscriptions` row for Android: `endpoint = token`, `keys = {"fcmToken": token, "platform": "android"}`, `user_email` = Supabase session email, `user_agent = "Android app (<Build.MODEL>)"`, `is_active = true`.
- Push works only when all four of `FIREBASE_APP_ID`, `FIREBASE_API_KEY`, `FIREBASE_SENDER_ID`, `FIREBASE_PROJECT_ID` are non-blank; otherwise the app builds and runs, and the menu item is hidden.
- UI copy in Spanish; code comments in English; no em dash character anywhere.
- Android build: `JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home ~/.gradle/wrapper/dists/gradle-8.9-bin/*/gradle-8.9/bin/gradle -p android <task>` (no gradlew in repo). Called `GRADLE` below.
- Commits are conventional (`feat(push): ...`) and end with the session attribution trailer.

## Review Focus

1. **Fresh worktree without the Firebase keys:** app builds, starts without crashing, and the "Notificaciones" item is not shown. Pinned by `isFirebaseConfigured` tests (Task 2) and a no-keys build check (Task 6).
2. **Message without `android` block or with an unknown tag** (old sender still running until merge, or a future tag): goes to `budget_alerts`, tap opens the app on its normal start tab, nothing crashes. Pinned by `channelForTag` / `tabForPushTag` tests (Task 2).
3. **Permission denied on Android 13+:** switch stays off and no row is written. Pinned by `needsNotificationPermission` tests (Task 2) and a manual check (Task 6).
4. **Sign out, then a push arrives:** this phone's row is already `is_active = false`, so nothing arrives. Pinned by the sign-out check in Task 6.
5. **Token rotation while signed out or offline:** `onNewToken` swallows the failure, logs without the token, and leaves the flag on so the next `enable()` from the menu fixes it. Pinned by the `refreshTokenIfEnabled` tests (Task 4): a throwing `register` returns `false` and does not escape.

---

### Task 1: Sender builds an Android block with tag and channel

**Files:**
- Modify: `scripts/production/lib/push.ts`
- Create: `scripts/production/lib/push.test.ts`
- Modify: `scripts/production/send-notifications.ts:62-68`
- Modify: `scripts/production/budget-alerts.ts:154-159`
- Modify: `scripts/production/budget-alerts.test.ts:40-45`

**Interfaces:**
- Produces: `export type PushChannel = 'budget_alerts' | 'payment_reminders'`; `PushPayload.channel: PushChannel` (required); `export function buildMessage(token: string, payload: PushPayload): Message` (`Message` from `firebase-admin/messaging`).

- [ ] **Step 1: Write the failing tests** in `scripts/production/lib/push.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { buildMessage } from './push';

const payload = {
  title: 'T', body: 'B', tag: 'budget-alert-7',
  link: 'https://example.test/finance/budgets', channel: 'budget_alerts' as const,
};

describe('buildMessage', () => {
  it('keeps the web payload as it was', () => {
    const m = buildMessage('tok', payload) as any;
    expect(m.token).toBe('tok');
    expect(m.notification).toEqual({ title: 'T', body: 'B' });
    expect(m.data).toEqual({ tag: 'budget-alert-7', link: 'https://example.test/finance/budgets' });
    expect(m.webpush).toEqual({
      notification: { icon: '/logo.svg', badge: '/badge-72.png', tag: 'budget-alert-7', requireInteraction: false },
      fcmOptions: { link: 'https://example.test/finance/budgets' },
    });
  });

  it('adds an android block with tag, channel and high priority', () => {
    const m = buildMessage('tok', { ...payload, tag: 'payment-reminder', channel: 'payment_reminders', requireInteraction: true }) as any;
    expect(m.android).toEqual({ priority: 'high', notification: { tag: 'payment-reminder', channelId: 'payment_reminders' } });
    expect(m.webpush.notification.requireInteraction).toBe(true);
  });
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run scripts/production/lib/push.test.ts`
Expected: FAIL, `buildMessage` is not exported.

- [ ] **Step 3: Implement `buildMessage` in `push.ts`** and make `sendPushToActiveSubscriptions` call `getMessaging().send(buildMessage(fcmToken, payload))`. Add `channel: PushChannel` to `PushPayload`. Set `channel: 'payment_reminders'` in `send-notifications.ts` and `channel: 'budget_alerts'` in `budget-alerts.ts`; add `channel: 'budget_alerts'` to the expected payload in `budget-alerts.test.ts`.

- [ ] **Step 4: Run the sender tests** (scripts have no tsconfig and run through tsx, so Vitest is the check)

Run: `npx vitest run scripts/production`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/production
git commit -m "feat(push): android block with tag and channel for every push"
```

### Task 2: Firebase config, Application class, channels and routing helpers

**Files:**
- Modify: `android/gradle/libs.versions.toml` (add `firebaseBom = "34.19.0"`, libraries `firebase-bom` = `com.google.firebase:firebase-bom`, `firebase-messaging` = `com.google.firebase:firebase-messaging`)
- Modify: `android/app/build.gradle.kts` (4 `buildConfigField` strings `FIREBASE_APP_ID`, `FIREBASE_API_KEY`, `FIREBASE_SENDER_ID`, `FIREBASE_PROJECT_ID` defaulting to `""`; `implementation(platform(libs.firebase.bom))`, `implementation(libs.firebase.messaging)`; no google-services plugin)
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/push/PushRouting.kt`
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/push/PushSetup.kt`
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/FinanceDashboardApp.kt`
- Modify: `android/app/src/main/AndroidManifest.xml` (`android:name=".FinanceDashboardApp"`, `POST_NOTIFICATIONS` permission, meta-data `com.google.firebase.messaging.default_notification_channel_id` = `@string/default_notification_channel_id`, `default_notification_icon` = `@drawable/ic_stat_notification`, `default_notification_color` = `@color/notification_accent`)
- Modify: `android/app/src/main/res/values/strings.xml` (`default_notification_channel_id` = `budget_alerts`, `translatable="false"`)
- Create: `android/app/src/main/res/values/colors.xml` (`notification_accent` = `#00D9FF`)
- Create: `android/app/src/main/res/drawable/ic_stat_notification.xml` (24dp monochrome white vector, simple coin or bell shape)
- Not committed: `android/local.properties` in the main checkout and in this worktree
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/push/PushRoutingTest.kt`

**Interfaces:**
- Produces (in `PushRouting.kt`, package `com.thonyfd.financedashboard.push`):
  - `const val CHANNEL_BUDGET = "budget_alerts"`, `const val CHANNEL_PAYMENTS = "payment_reminders"`, `const val TAG_PAYMENT_REMINDER = "payment-reminder"`, `const val TAG_BUDGET_PREFIX = "budget-alert-"`
  - `fun channelForTag(tag: String?): String`
  - `fun tabForPushTag(tag: String?): Int?` (returns `AppTab.Control.ordinal` / `AppTab.Inicio.ordinal` / `null`)
  - `fun isFirebaseConfigured(appId: String, apiKey: String, senderId: String, projectId: String): Boolean`
  - `fun needsNotificationPermission(sdkInt: Int, granted: Boolean): Boolean` (true only when `sdkInt >= 33 && !granted`)
- Produces (in `PushSetup.kt`): `object PushSetup { val isAvailable: Boolean; fun init(context: Context) }`. `init` creates both channels always (names "Presupuesto" / "Pagos", descriptions "Alertas de compras contra tus presupuestos" / "Recordatorio diario de pagos pendientes", `IMPORTANCE_DEFAULT`), then calls `FirebaseApp.initializeApp(context, FirebaseOptions)` only when `isFirebaseConfigured(BuildConfig...)`; sets `isAvailable` accordingly. Idempotent (skip if `FirebaseApp.getApps(context)` is not empty).

- [ ] **Step 1: Write the failing tests** in `PushRoutingTest.kt`

```kotlin
@Test fun paymentReminderGoesToPaymentsChannel() = assertEquals(CHANNEL_PAYMENTS, channelForTag("payment-reminder"))
@Test fun budgetAlertGoesToBudgetChannel() = assertEquals(CHANNEL_BUDGET, channelForTag("budget-alert-42"))
@Test fun unknownOrMissingTagFallsBackToBudget() { assertEquals(CHANNEL_BUDGET, channelForTag(null)); assertEquals(CHANNEL_BUDGET, channelForTag("other")) }
@Test fun paymentReminderOpensControl() = assertEquals(AppTab.Control.ordinal, tabForPushTag("payment-reminder"))
@Test fun budgetAlertOpensInicio() = assertEquals(AppTab.Inicio.ordinal, tabForPushTag("budget-alert-42"))
@Test fun unknownTagOpensNoTab() { assertNull(tabForPushTag(null)); assertNull(tabForPushTag("")); assertNull(tabForPushTag("budget")) }
@Test fun firebaseNeedsAllFourValues() {
    assertTrue(isFirebaseConfigured("1:2:android:3", "key", "720071149950", "proj"))
    assertFalse(isFirebaseConfigured("", "key", "720071149950", "proj"))
    assertFalse(isFirebaseConfigured("1:2:android:3", " ", "720071149950", "proj"))
}
@Test fun permissionOnlyAskedOn13AndUpWhenMissing() {
    assertTrue(needsNotificationPermission(33, granted = false))
    assertFalse(needsNotificationPermission(33, granted = true))
    assertFalse(needsNotificationPermission(32, granted = false))
}
```

- [ ] **Step 2: Run and see it fail**

Run: `GRADLE :app:testDebugUnitTest --tests '*PushRoutingTest*'`
Expected: FAIL, unresolved references.

- [ ] **Step 3: Implement `PushRouting.kt`, then `PushSetup`, `FinanceDashboardApp` (calls `PushSetup.init(this)` in `onCreate`), Gradle, manifest and resources as listed in Files.**

- [ ] **Step 4: Put the keys in `local.properties`** (main checkout `/Users/thonyfd/projects/personal-dashboard/android/local.properties`, then copy the whole file into this worktree's `android/`). Values from `firebase apps:sdkconfig ANDROID 1:720071149950:android:33dbf3f1e1295a1aa8cb2f --project mail-reader-433802`: `FIREBASE_APP_ID` = `client[0].client_info.mobilesdk_app_id`, `FIREBASE_API_KEY` = `client[0].api_key[0].current_key`, `FIREBASE_SENDER_ID` = `project_info.project_number`, `FIREBASE_PROJECT_ID` = `project_info.project_id`. Never echo the API key into the terminal output or a log.

- [ ] **Step 5: Run unit tests and a debug build**

Run: `GRADLE :app:testDebugUnitTest :app:assembleDebug`
Expected: BUILD SUCCESSFUL, all tests PASS. If the Firebase BoM fails to resolve or the Kotlin metadata is rejected, step down to the newest 34.x that builds and note it in the commit body.

- [ ] **Step 6: Commit** (check `git status` shows no `local.properties`)

```bash
git add android/gradle/libs.versions.toml android/app/build.gradle.kts android/app/src/main android/app/src/test
git commit -m "feat(android): manual Firebase init and notification channels"
```

### Task 3: PushRepository keeps this phone's row in push_subscriptions

**Files:**
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/push/PushRepository.kt`
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/push/PushRepositoryTest.kt`

**Interfaces:**
- Consumes: `PushSetup.isAvailable` (Task 2), `SupabaseConfig.client`, `SupabaseConfig.awaitAuth()`.
- Produces:
  - `@Serializable data class PushKeys(val fcmToken: String, val platform: String)` (no default: supabase-kt's `Json` does not encode defaults, so `subscriptionRow` passes `"android"` explicitly)
  - `@Serializable data class PushSubscriptionRow(val endpoint: String, val keys: PushKeys, @SerialName("user_email") val userEmail: String, @SerialName("user_agent") val userAgent: String, @SerialName("is_active") val isActive: Boolean)`
  - `fun subscriptionRow(token: String, email: String, deviceModel: String): PushSubscriptionRow`
  - `suspend fun <T> Task<T>.awaitResult(): T` (play-services `Task`, via `suspendCancellableCoroutine`; no new dependency)
  - `object PushRepository` with:
    - `suspend fun isEnabledOnThisDevice(): Boolean` (select `id` where `endpoint = token` and `is_active = true`)
    - `suspend fun enable(context: Context)` (current token, then `register`)
    - `suspend fun register(context: Context, token: String)` (`awaitAuth()`, session email or throw `IllegalStateException("No session")`, `upsert(subscriptionRow(...)) { onConflict = "endpoint" }`, set local flag on)
    - `suspend fun disable(context: Context)` (update `is_active = false` where `endpoint = token`, flag off)
    - `suspend fun disableOnSignOut(context: Context)` (if flag on: `disable`, then `FirebaseMessaging.getInstance().deleteToken().awaitResult()`; never throws)
    - `fun isFlagOn(context: Context): Boolean`
  - Local flag: SharedPreferences `"push"`, key `"enabled"` (same style as `WidgetAppearancePreferences`).

- [ ] **Step 1: Write the failing tests** in `PushRepositoryTest.kt`

```kotlin
@Test fun rowUsesTokenAsEndpointAndKey() {
    val row = subscriptionRow("tok", "me@example.test", "Pixel 8")
    assertEquals("tok", row.endpoint)
    assertEquals(PushKeys(fcmToken = "tok", platform = "android"), row.keys)
    assertEquals("Android app (Pixel 8)", row.userAgent)
    assertTrue(row.isActive)
}
@Test fun rowSerializesWithDatabaseColumnNames() {
    val json = Json.encodeToString(subscriptionRow("tok", "me@example.test", "Pixel 8"))
    assertEquals(
        """{"endpoint":"tok","keys":{"fcmToken":"tok","platform":"android"},"user_email":"me@example.test","user_agent":"Android app (Pixel 8)","is_active":true}""",
        json
    )
}
```

- [ ] **Step 2: Run and see it fail**

Run: `GRADLE :app:testDebugUnitTest --tests '*PushRepositoryTest*'`
Expected: FAIL, unresolved references.

- [ ] **Step 3: Implement `PushRepository.kt`** as in Interfaces. All `Log` calls use tag `"Push"` and never include the token or email.

- [ ] **Step 4: Run tests and build**

Run: `GRADLE :app:testDebugUnitTest :app:assembleDebug`
Expected: BUILD SUCCESSFUL, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add android/app/src
git commit -m "feat(android): register this phone in push_subscriptions"
```

### Task 4: Messaging service and notification taps

**Files:**
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/push/FinancePushService.kt`
- Modify: `android/app/src/main/AndroidManifest.xml` (service `.push.FinancePushService`, `exported="false"`, intent-filter `com.google.firebase.MESSAGING_EVENT`)
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/MainActivity.kt:101-102` (`parseTabFromIntent`)
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/push/PushRoutingTest.kt` (extend)

**Interfaces:**
- Consumes: `channelForTag`, `tabForPushTag` (Task 2); `PushRepository.register`, `PushRepository.isFlagOn` (Task 3); `MainActivity.EXTRA_OPEN_TAB`.
- Produces:
  - `suspend fun refreshTokenIfEnabled(flagOn: Boolean, token: String, register: suspend (String) -> Unit): Boolean` in `PushRouting.kt`: returns `false` without calling `register` when the flag is off; calls it when on; catches any exception from `register` and returns `false`; returns `true` on success.
  - `fun openTabFromIntent(openTabExtra: Int?, pushTag: String?): Int?` in `PushRouting.kt`: `openTabExtra` wins, else `tabForPushTag(pushTag)`.
  - `FinancePushService : FirebaseMessagingService`:
    - `onNewToken(token)`: on a `CoroutineScope(SupervisorJob() + Dispatchers.IO)` call `refreshTokenIfEnabled(PushRepository.isFlagOn(this), token) { PushRepository.register(this, it) }`.
    - `onMessageReceived(message)`: only when `message.notification != null` and `NotificationManagerCompat.areNotificationsEnabled()`. Tag from `message.data["tag"]`; channel = `notification.channelId ?: channelForTag(tag)`; content intent to `MainActivity` with `EXTRA_OPEN_TAB` when `tabForPushTag(tag)` is not null, `FLAG_IMMUTABLE or FLAG_UPDATE_CURRENT`, request code `tag.hashCode()`; `setAutoCancel(true)`, small icon `ic_stat_notification`; `notify(tag, 0, notification)`.
  - `parseTabFromIntent` returns `openTabFromIntent(intent EXTRA_OPEN_TAB if present, intent.getStringExtra("tag"))`.

- [ ] **Step 1: Write the failing tests** (add to `PushRoutingTest.kt`, use `runBlocking`)

```kotlin
@Test fun tokenRefreshSkippedWhenFlagOff() = runBlocking {
    var called = false
    assertFalse(refreshTokenIfEnabled(flagOn = false, token = "t") { called = true })
    assertFalse(called)
}
@Test fun tokenRefreshFailureDoesNotEscape() = runBlocking {
    assertFalse(refreshTokenIfEnabled(flagOn = true, token = "t") { throw IllegalStateException("No session") })
}
@Test fun tokenRefreshRegistersWhenFlagOn() = runBlocking {
    var got: String? = null
    assertTrue(refreshTokenIfEnabled(flagOn = true, token = "t") { got = it })
    assertEquals("t", got)
}
@Test fun explicitTabExtraWinsOverPushTag() = assertEquals(3, openTabFromIntent(3, "payment-reminder"))
@Test fun pushTagUsedWhenNoTabExtra() = assertEquals(AppTab.Control.ordinal, openTabFromIntent(null, "payment-reminder"))
@Test fun nothingWhenNeither() = assertNull(openTabFromIntent(null, null))
```

- [ ] **Step 2: Run and see it fail**

Run: `GRADLE :app:testDebugUnitTest --tests '*PushRoutingTest*'`
Expected: FAIL, unresolved references.

- [ ] **Step 3: Implement the two helpers, the service, the manifest entry and the `parseTabFromIntent` change.**

- [ ] **Step 4: Run tests and build**

Run: `GRADLE :app:testDebugUnitTest :app:assembleDebug`
Expected: BUILD SUCCESSFUL, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add android/app/src
git commit -m "feat(android): show pushes and open the right tab on tap"
```

### Task 5: "Notificaciones" switch in the menu, push off on sign out

**Files:**
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/ui/PushMenuItem.kt`
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/AppMenu.kt` (item between "Widgets" and "Cerrar sesión"; sign-out `onClick` calls `PushRepository.disableOnSignOut(context)` before `signOutWithFallback`)

**Interfaces:**
- Consumes: `PushSetup.isAvailable`, `needsNotificationPermission` (Task 2); `PushRepository.isEnabledOnThisDevice/enable/disable/disableOnSignOut` (Task 3).
- Produces: `@Composable fun PushMenuItem(isOwner: Boolean, drawerOpen: Boolean)`. Renders nothing unless `isOwner && PushSetup.isAvailable`. `NavigationDrawerItem` with label "Notificaciones", icon `Icons.Outlined.Notifications`, trailing `Switch` via `badge`, same colors as the other items. Reads server state each time `drawerOpen` becomes true; shows the switch disabled while a request runs.

Behaviour and copy (exact):
- Turning on: if `needsNotificationPermission(Build.VERSION.SDK_INT, granted)`, launch `RequestPermission(POST_NOTIFICATIONS)`. Denied: switch stays off, Toast "Permite las notificaciones en Ajustes de Android". Granted (or not needed): `enable()`, Toast "Notificaciones activadas en este teléfono".
- Turning off: `disable()`, Toast "Notificaciones apagadas en este teléfono".
- Any failure: switch returns to the server state, Toast "No se pudo cambiar las notificaciones".

- [ ] **Step 1: Implement `PushMenuItem` and the `AppMenu` changes.** UI only; logic it relies on is already tested in Tasks 2 and 3.

- [ ] **Step 2: Build and run all unit tests**

Run: `GRADLE :app:testDebugUnitTest :app:assembleDebug`
Expected: BUILD SUCCESSFUL, all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add android/app/src
git commit -m "feat(android): Notificaciones switch per device, off on sign out"
```

### Task 6: End-to-end check on the phone with a local test push

**Files:**
- Create: `scripts/production/send-test-push.ts` (local only, never wired into Actions)

**Interfaces:**
- Consumes: `buildMessage`, `PushChannel` (Task 1).
- Produces: CLI `npx tsx scripts/production/send-test-push.ts --id <subscriptionId> --kind budget|payment`. Reads the row by id with the service role key, sends one message with `buildMessage`: `budget` uses tag `budget-alert-test-<epochSeconds>`, channel `budget_alerts`, title "🧪 Prueba de presupuesto"; `payment` uses tag `payment-reminder`, channel `payment_reminders`, title "🧪 Prueba de pagos". Prints only `sent` or the FCM error code. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLOUD_PROJECT=mail-reader-433802`, `FIREBASE_ACCESS_TOKEN=$(gcloud auth print-access-token)`.

- [ ] **Step 1: Write the script.** Reuse `ensureFirebase` by exporting it from `push.ts` rather than copying it.

- [ ] **Step 2: Install the debug APK on the owner's phone** (`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`), sign in, open the menu, turn "Notificaciones" on, accept the permission.
Expected: Toast "Notificaciones activadas en este teléfono"; one new active row in `push_subscriptions` with `keys->>'platform' = 'android'` (check id only).

- [ ] **Step 3: Send both kinds with the app in background, then in foreground.**
Expected each time: notification in the right channel ("Presupuesto" / "Pagos" in Android settings); a second `payment` push replaces the first; two `budget` pushes stay separate; tapping `payment` opens Control, tapping `budget` opens Inicio.

- [ ] **Step 4: Deny path.** In Android settings revoke the notification permission, turn the switch on again.
Expected: Toast "Permite las notificaciones en Ajustes de Android", switch off, row unchanged.

- [ ] **Step 5: Sign out path.** Re-grant permission, switch on, sign out from the menu.
Expected: the row now has `is_active = false`; a test push to that id returns an error code, nothing shows on the phone.

- [ ] **Step 6: No-keys build.** Temporarily blank the four `FIREBASE_*` values, run `GRADLE :app:assembleDebug`, install, open the menu.
Expected: build succeeds, app starts, no "Notificaciones" item. Restore the values.

- [ ] **Step 7: Note for the owner:** if Chrome on the same phone is subscribed on the web, turn it off there to avoid double notifications.

- [ ] **Step 8: Commit**

```bash
git add scripts/production/send-test-push.ts scripts/production/lib/push.ts
git commit -m "chore(push): local test push to one subscription"
```
