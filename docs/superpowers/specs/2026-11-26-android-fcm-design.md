# Android native push (FCM) - design

Date: 2026-11-26. Status: approved approach (B), design pending owner review.

## Intent

This week the backend started sending budget alerts on every purchase (sync every 15 minutes) and the daily payment reminder was fixed. Both go out through FCM to the rows in `push_subscriptions`, but only browsers ever register there. The Android app has no Firebase at all, so the phone app never receives either push. Goal: the owner gets the same pushes natively in the Android app, with the same on/off control per device that the web dashboard has.

This is the first of several pieces to bring the app and widgets level with this week's web work. Budgets screen and widget budget status come later, in their own designs.

## Goals

- Owner's Android app receives budget alerts and payment reminders as native notifications.
- Per-device switch in the app menu, same model as the web (`web/dashboard/src/lib/push-device.ts`): this phone's row only.
- Tapping a notification opens the right tab: payment reminder opens Control, budget alert opens Inicio.
- Same replacement behaviour as web: the payment reminder replaces the previous one (tag `payment-reminder`), each budget alert stays separate (tag `budget-alert-<txnId>`).
- Two Android notification channels, "Presupuesto" and "Pagos", so the owner can mute one from Android settings.
- The app builds and runs without the Firebase keys in `local.properties`; push is then simply unavailable.

## Non-goals

- Budgets screen in the app, budget status in widgets, merchant editor (later designs).
- In-app per-type toggles (Android channel settings cover that).
- Data-only messages, refreshing widgets on push, iOS.
- Any change to who receives pushes: the sender keeps sending to every active row.

## Anti-goals

- Firebase config or keys committed to the repo (repo is public).
- Tokens, emails, amounts or merchants in GitHub Actions logs (logs are public; only ids, tags, counts).
- A non-owner account (habits-only) registering a device and receiving finance pushes.
- Breaking web push: the web payload and behaviour must stay identical.

## Constraints and facts

- Firebase project `mail-reader-433802` (number 720071149950). Android app registered 2026-11-26: App ID `1:720071149950:android:33dbf3f1e1295a1aa8cb2f`, package `com.thonyfd.financedashboard`. Config can be re-downloaded with `firebase apps:sdkconfig ANDROID <appId> --project mail-reader-433802`.
- Sender: `scripts/production/lib/push.ts`, firebase-admin `send()` with `notification`, `data: {tag, link}` and a `webpush` block. Token is `keys.fcmToken || endpoint`. Invalid tokens are deactivated automatically.
- Callers: `scripts/production/send-notifications.ts` (tag `payment-reminder`) and `scripts/production/budget-alerts.ts` (tag `budget-alert-<id>`). Deploy of these scripts is a merge to `main` (they run in GitHub Actions).
- `push_subscriptions`: `endpoint` text UNIQUE, `keys` jsonb NOT NULL, `user_email`, `user_agent`, `is_active`. RLS "Owner only" (`public.is_owner()`), so only the owner can read or write rows.
- Android: minSdk 26, targetSdk 35, Compose, supabase-kt 3.1.4, secrets in `android/local.properties` exposed through `BuildConfig`. `MainActivity` already routes `EXTRA_OPEN_TAB` (int) to a tab for widget deep links. `OwnerState` tells owner from non-owner. `SupabaseConfig.awaitAuth()` must run before queries from background entry points.
- Build env: no gradlew, use gradle 8.9 + JDK 21. Worktrees have no `local.properties`; copy it from the main checkout.
- Work starts from the latest `main` (it moved: manual transfers, own-account totals).

## Approaches

- **A. Standard `google-services` plugin + `android/app/google-services.json` (gitignored).** Official path, auto-init. Costs one more untracked file per worktree, and the build fails without it.
- **B. Values in `local.properties`, manual `FirebaseOptions` init in an `Application` class.** Same pattern as Supabase and `GOOGLE_WEB_CLIENT_ID`, one secrets file, build works without the values. Slightly off the default path: init must happen before the messaging service runs.
- **C. Commit `google-services.json`.** Dropped: goes against the public-repo rule.

**Chosen: B** (owner's pick).

## Design

### Config

- `local.properties` gains `FIREBASE_APP_ID`, `FIREBASE_API_KEY`, `FIREBASE_SENDER_ID`, `FIREBASE_PROJECT_ID`, copied from the downloaded config. Exposed as `BuildConfig` fields. Missing values are allowed (unlike `GOOGLE_WEB_CLIENT_ID`).
- Dependencies: Firebase BoM + `firebase-messaging` in the version catalog. No `google-services` plugin.
- New `Application` subclass (registered in the manifest). `onCreate`: if all four values are present, `FirebaseApp.initializeApp(context, FirebaseOptions)`; always create the two notification channels.

### Channels and notification look

- Channel ids `budget_alerts` ("Presupuesto") and `payment_reminders` ("Pagos"), default importance.
- Manifest metadata: default channel `budget_alerts` (used by messages sent before the backend change), default small icon (new monochrome vector drawable), default color from the brand accent.

### Subscription (per device)

A small repository, `PushRepository`:

- `isEnabledOnThisDevice()`: get the FCM token, select `push_subscriptions` where `endpoint = token` and `is_active`.
- `enable()`: get the token, upsert on `endpoint` with `keys = {fcmToken, platform: "android"}`, `user_email` from the Supabase session, `user_agent = "Android app"` plus device model, `is_active = true`. Store a local "push enabled" flag.
- `disable()`: set `is_active = false` on this device's row only, clear the local flag.
- Token rotation (`onNewToken` in the service): if the local flag is on, `awaitAuth()` then `enable()` with the new token. The old row dies on its own when FCM rejects it.
- Sign out: if enabled, `disable()` before the session is cleared, then delete the FCM token.

### Menu switch

- New "Notificaciones" item in `AppMenuDrawer`, owner only, hidden when Firebase is not configured.
- Turning on: on Android 13+ request `POST_NOTIFICATIONS` (manifest permission added). If denied, stay off and tell the user to allow it in system settings. If granted, `enable()`.
- State is read from the server on drawer open, like the web.

### Receiving and tapping

- `FirebaseMessagingService` subclass. Background notification messages are shown by the system with the channel and tag from the payload.
- Foreground (`onMessageReceived`): build the notification ourselves with the same title, body, channel (from the payload, falling back by tag) and tag, so a same-tag notification replaces the old one. Content intent opens `MainActivity` with `EXTRA_OPEN_TAB`.
- Background tap: the system opens `MainActivity` with the data keys as extras. `MainActivity` reads extra `tag` and maps it with a pure function: `payment-reminder` to Control, `budget-alert-*` to Inicio, anything else to no tab change. Ignored for non-owners (existing `resolveDeepLinkTab`).

### Backend (`scripts/production/lib/push.ts`)

- `PushPayload` gains `channel: 'budget_alerts' | 'payment_reminders'`, set by each caller.
- `send()` adds `android: { priority: 'high', notification: { tag, channelId: channel } }`. `notification`, `data` and `webpush` stay as they are, so web is unchanged.
- Update `budget-alerts.test.ts` expectations and add a test for the message the helper builds (extract a pure `buildMessage(token, payload)` to test it).

### Tests and verification

- Unit tests (JVM): tag to tab mapping, channel fallback by tag, subscription row building, "Firebase configured" check.
- Vitest: `buildMessage` output for web and Android blocks; updated budget alert test.
- Manual end to end on the phone: install debug build, turn the switch on, confirm the row in `push_subscriptions` (id only), send one test push to that token from a local script (never from Actions), check the channel, the tag replacement, and the tap target in foreground and background. Then turn off and confirm `is_active = false`.

## Left to the builder

- Exact Firebase BoM version compatible with AGP 8.7.3, Kotlin 2.1, compileSdk 35.
- Where the local "push enabled" flag lives (DataStore is already a dependency).
- Icon drawable design, within the brand book.
- Copy for the switch and the permission-denied message, in Spanish, matching the app.

## Calls made without the owner (check these)

- Default channel for old-format messages is `budget_alerts`.
- Sign out turns this device's push off.
- `channel` is an explicit payload field set by the callers, not derived from the tag inside `push.ts`.
- `android.priority = 'high'` so budget alerts are not delayed by Doze.
