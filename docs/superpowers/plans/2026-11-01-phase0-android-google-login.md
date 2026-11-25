# Phase 0: Android Google Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Android app signs in with the owner's Google account through Supabase Auth, keeps the session on the device, and every Supabase call (screens, widgets, receivers) carries that session.

**Architecture:** `SupabaseConfig.client` installs `Auth` (default `SettingsSessionManager`, auto refresh) and the `ComposeAuth` plugin with native Google login (Credential Manager). A `LoginGate` composable wraps `AppRoot` and shows a login screen while there is no session. Background entry points call `SupabaseConfig.awaitAuth()` before their first query so the persisted session is loaded. Existing table RLS stays as is (anon still works), so a missing session in a widget never breaks it.

**Tech Stack:** Kotlin 2.1, Compose (BOM 2024.12.01), supabase-kt 3.1.4 (`auth-kt`, `compose-auth`), JUnit 4.

**Spec:** `docs/superpowers/specs/2026-11-01-projects-and-tasks-design.md` (section "Android authentication").

## Global Constraints

- Same Google OAuth provider the web uses (Supabase Google provider). Web client ID is the `serverClientId`; never hardcode it, read `GOOGLE_WEB_CLIENT_ID` from `android/local.properties` into `BuildConfig`.
- Repo is public: no client IDs, keys, SHA-1s, or emails committed. `local.properties` stays gitignored.
- Tightening RLS on existing tables is out of scope.
- UI copy in Spanish, styled with `AppColors`, `AppButton`, `FinanceDashboardTheme` per `design/BRAND_BOOK.md`.
- No em dash characters in code, comments, or copy.
- Before writing supabase-kt calls, confirm the 3.1.4 API with Context7 (`/supabase-community/supabase-kt`): names below are from the 3.x Compose Auth docs.

## Review Focus

1. Cold start with a saved but expired session: the gate must wait for `SessionStatus.Initializing` to finish and refresh, never flash the login screen. Covered by `mapsInitializingToLoading` / `mapsRefreshFailureToLoggedIn`.
2. Widget update or alarm firing before the app was ever opened after reboot: must not crash and must still load data (anon fallback). Covered by Task 3 manual check.
3. User cancels the Google sheet: stays on the login screen with no error toast. Covered by Task 2 step on `NativeSignInResult.ClosedByUser`.
4. No network on login: shows "Sin conexión, intenta de nuevo" and keeps the button enabled. Covered by Task 2 step on `NativeSignInResult.NetworkError`.
5. Sign out: clears the session and returns to the login screen; widgets keep showing cached data. Covered by Task 2 sign-out step.

---

### Task 0 (manual, owner): Google Cloud and Supabase setup

Not code. The owner does this once; the implementer lists the steps and waits.

- [ ] **Step 1:** In the Google Cloud project that holds the web OAuth client used by Supabase, create an **Android** OAuth client: package `com.thonyfd.financedashboard`, SHA-1 of the debug keystore (`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`). Add the release SHA-1 later when a release key exists.
- [ ] **Step 2:** In Supabase Dashboard > Authentication > Providers > Google, add the Android client ID to "Authorized Client IDs" (comma separated after the web one).
- [ ] **Step 3:** Add `GOOGLE_WEB_CLIENT_ID=<web client id>` to `android/local.properties`.

### Task 1: Auth plugins in the client and the session state mapper

**Files:**
- Modify: `android/gradle/libs.versions.toml` (add `supabase-compose-auth = { group = "io.github.jan-tennert.supabase", name = "compose-auth", version.ref = "supabase" }`, `junit = { group = "junit", name = "junit", version = "4.13.2" }`)
- Modify: `android/app/build.gradle.kts` (deps `libs.supabase.compose.auth`, `testImplementation(libs.junit)`; `buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", ...)` like `SUPABASE_URL`)
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/data/SupabaseConfig.kt`
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/data/auth/AuthGateState.kt`
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/data/auth/AuthGateStateTest.kt`

**Interfaces:**
- Produces: `enum class AuthGateState { Loading, LoggedIn, LoggedOut }`; `fun SessionStatus.toGateState(): AuthGateState`; `suspend fun SupabaseConfig.awaitAuth()` (awaits `client.auth.awaitInitialization()`, swallows and logs errors).

- [ ] **Step 1: Write the failing test** `AuthGateStateTest`:
  - `mapsInitializingToLoading`: `SessionStatus.Initializing.toGateState() == AuthGateState.Loading`
  - `mapsAuthenticatedToLoggedIn`: `SessionStatus.Authenticated(session = UserSession(accessToken = "a", refreshToken = "r", expiresIn = 3600, tokenType = "bearer", user = null)).toGateState() == LoggedIn`
  - `mapsNotAuthenticatedToLoggedOut`: `SessionStatus.NotAuthenticated(isSignOut = false).toGateState() == LoggedOut`
  - `mapsRefreshFailureToLoggedOut`: `SessionStatus.RefreshFailure(cause = ...)` maps to `LoggedOut` (build the cause with the 3.1.4 `RefreshFailureCause` subtype available; adjust constructor args to the actual 3.1.4 signatures).
- [ ] **Step 2: Run** `gradle :app:testDebugUnitTest --tests '*AuthGateStateTest*'`. Expected: FAIL, `toGateState` unresolved.
- [ ] **Step 3: Implement** `toGateState()` as an exhaustive `when` in `AuthGateState.kt`.
- [ ] **Step 4: Update `SupabaseConfig.client`:** `install(Auth)` (defaults: `autoLoadFromStorage = true`, `alwaysAutoRefresh = true`), `install(ComposeAuth) { googleNativeLogin(serverClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID) }`, keep `install(Postgrest)`. Add `awaitAuth()`.
- [ ] **Step 5: Run** tests again and `gradle :app:compileDebugKotlin`. Expected: PASS, build OK.
- [ ] **Step 6: Commit** `feat(android): install supabase auth and compose auth`.

### Task 2: Login gate, login screen, sign out

**Files:**
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/ui/LoginScreen.kt`
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/MainActivity.kt` (wrap `AppRoot(...)` in `LoginGate { ... }`)
- Modify: the existing settings/overflow location in `AppRoot` top bar (add "Cerrar sesión"; builder picks the spot already used for secondary actions)

**Interfaces:**
- Consumes: `AuthGateState`, `toGateState()`, `SupabaseConfig.client`.
- Produces: `@Composable fun LoginGate(content: @Composable () -> Unit)`.

- [ ] **Step 1:** `LoginGate` collects `client.auth.sessionStatus` as state, maps with `toGateState()`: `Loading` shows a centered progress indicator on `AppColors.Night`; `LoggedOut` shows `LoginScreen`; `LoggedIn` shows `content()`.
- [ ] **Step 2:** `LoginScreen` uses `client.composeAuth.rememberSignInWithGoogle(onResult = ...)`; one `AppButton("Entrar con Google")` that calls `.startFlow()`. Results: `Success` does nothing (status flow switches the gate); `ClosedByUser` does nothing; `NetworkError` shows inline text "Sin conexión, intenta de nuevo"; `Error` shows "No se pudo iniciar sesión" plus logs the message. Button shows loading while the flow runs.
- [ ] **Step 3:** Sign out action calls `client.auth.signOut()` inside a coroutine; gate returns to login.
- [ ] **Step 4:** Install on device (`ANDROID_SERIAL=R5CX20XE9FL gradle :app:installDebug`). Verify by hand: fresh install shows login; Google sheet signs in; force-stop and reopen goes straight to the app with no login flash; cancel sheet stays on login; airplane mode shows the network message; sign out returns to login.
- [ ] **Step 5: Commit** `feat(android): google sign-in gate`.

### Task 3: Session in widgets and receivers

**Files:**
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/widget/FinanceWidget.kt` (before `FinanceRepository().getWidgetData` at the two call sites)
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/widget/FinanceWidgetWorker.kt` (start of `doWork`)
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/widget/HabitsWidget.kt` (before repository calls near lines 103, 390, 427)
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/widget/HabitsDayRolloverReceiver.kt` (if it queries Supabase)

**Interfaces:**
- Consumes: `SupabaseConfig.awaitAuth()`.

- [ ] **Step 1:** Call `SupabaseConfig.awaitAuth()` at each background entry point before the first Supabase query. Errors are already swallowed inside `awaitAuth`, so existing `runCatching` and cache fallbacks stay unchanged.
- [ ] **Step 2:** `gradle :app:compileDebugKotlin` then install. Verify by hand: after login, reboot the phone without opening the app; widgets refresh with data and nothing crashes (`adb logcat -s AndroidRuntime` shows no FATAL). Signed out: widgets still load (anon policies).
- [ ] **Step 3: Commit** `feat(android): load auth session in widgets and receivers`.
