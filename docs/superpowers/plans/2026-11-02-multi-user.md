# Multi-user Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Google account gets its own habits and mood data, finances become readable only by the owner account, anon loses all access, and Android plus web hide finance surfaces from non-owners.

**Architecture:**
- **Ownership:** a one-row `app_owner` table plus a `SECURITY DEFINER` function `is_owner()` mark the owner.
- **Personal tables:** they get `user_id uuid DEFAULT auth.uid()` with `user_id = auth.uid()` policies.
- **Finance tables:** they get `is_owner()` policies.
- **Clients:** they ask `is_owner` once per session (RPC) and pick tabs, routes and widget states from it. RLS does all row filtering, so no query adds a `user_id` filter.

**Tech Stack:**
- Supabase Postgres (SQL migrations).
- `packages/supabase-queries` (TS, vitest).
- Android: Kotlin, Compose, Glance, supabase-kt 3.1.4, JUnit 4.
- Web: React 18 with react-router 6.

**Spec:** `docs/superpowers/specs/2026-11-02-multi-user-design.md`

## Global Constraints

- **Public repo:**
  - Never commit an email, auth uid, key, client ID or dump.
  - The owner uid is inserted by hand in the SQL editor and never written in a migration.
- **Migrations:** in `supabase/migrations/`, named `YYYYMMDDHHMMSS_name.sql`.
- **No em dash characters** in code, SQL comments, copy or commits.
- **UI copy:** Spanish. Android uses `AppColors`, `AppButton` and `AppIconButton`. Web uses CSS tokens from `web/dashboard/src/index.css`.
- **Personal tables:** `user_habits`, `habit_logs`, `mood_logs`, `mood_checkins`, `mood_log_tags`.
- **Shared catalogs:**
  - `habit_templates`: read by `authenticated`, written by the owner.
  - `mood_tags`: read and write by `authenticated`.
- **Owner-only:** `transactions`, `manual_transactions`, `monthly_incomes`, `categories`, `merchants`, `emails`, `gmail_sync_state`, `push_subscriptions`, `notification_preferences`, `system_alerts`, plus functions `get_or_create_merchant` and `count_duplicate_merchants`, plus anything else the Task 1 inventory finds.
- **Anon:** no policy grants anything to `anon`.
- **Non-owner UI:**
  - **Android:** tabs Timeline, Hábitos and Mood, opening on Hábitos.
  - **Web:** the Azton section only, and `/finance/*` redirects to `/azton/habits`.
  - **Finance and payments widgets:** show `No disponible para esta cuenta`.
- **Mood outage:** a short mood-save outage between Migration B and the client deploys is accepted. There is no compatibility bridge.
- **Build commands:**
  - **Gradle:** run outside the sandbox: `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" /Users/thonyfd/.gradle/wrapper/dists/gradle-9.7.0-bin/d4tj7w02tcgubx9zk9hbippn6/gradle-9.7.0/bin/gradle` (written `GRADLE` below), from `android/`.
  - **TS tests:** `npx vitest run packages/supabase-queries` from the repo root.
  - **Web build:** `npm run build` in `web/dashboard`.

## Review Focus

1. **Owner opens the app offline with a saved session.** `is_owner` cannot be fetched. Expected: the last known value is used (cached on device), so the owner still sees finance tabs. Test `ownerStateFallsBackToCachedValueWhenFetchFails` in Task 4.
2. **Sign out as owner, sign in as the daughter on the same phone.** Expected: no owner habit names, finance totals or payments remain in widgets or tabs. Test `clearAccountCachesResetsEveryStore` in Task 5, plus the device check in Task 8.
3. **A widget, alarm or worker runs with no session** (signed out, or before the first login). Expected: no crash; the widget shows its existing error or empty state. Device check in Task 8 (`adb logcat -s AndroidRuntime` shows no FATAL).
4. **A non-owner deep link from an old pinned finance widget or notification** (`externalTab = 0/1`, `CategoryNavState`). Expected: ignored, and the app stays on Hábitos. Test `nonOwnerIgnoresFinanceDeepLinks` in Task 4.
5. **A user saves mood for a day the owner already logged.** Expected: it succeeds, because uniqueness is per user. SQL check `mood_same_day_two_users` in Task 2.

---

### Task 0 (manual, owner): Gate checks

Not code. The implementer posts these steps and waits for the owner's answers.

- [ ] **Step 1:** The owner confirms that the GitHub Actions secret `SUPABASE_SERVICE_ROLE_KEY` (used by `.github/workflows/daily-email-sync.yml`, `scripts/production/sync-emails-daily.ts` and `scripts/production/send-notifications.ts`) holds the **service_role** key from Supabase > Project Settings > API Keys. If it holds the anon key, stop. The owner replaces the secret and re-runs the workflow once before going on.
- [ ] **Step 2:** The implementer greps every server-side Supabase client (`grep -rn "createClient" scripts services packages --include=*.ts`) and lists which env var each one uses. Every one that runs without a user session must use the service role key. Report the list.
- [ ] **Step 3:** The owner runs this read-only inventory in the SQL editor and pastes the output. The output contains no data rows.

```sql
SELECT 'table' AS kind, c.relname AS name, c.relrowsecurity::text AS detail
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
UNION ALL
SELECT 'view', c.relname, coalesce(array_to_string(c.reloptions, ','), '')
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
UNION ALL
SELECT 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
       CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END || ' acl=' || coalesce(p.proacl::text, 'default')
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
UNION ALL
SELECT 'policy', tablename || '.' || policyname, array_to_string(roles, ',') || ' ' || cmd || ' using=' || coalesce(qual, '')
FROM pg_policies WHERE schemaname = 'public'
ORDER BY 1, 2;
```

- [ ] **Step 4:** The implementer compares the inventory with the Global Constraints lists. Any table, view or function not listed gets classified as personal, catalog or owner-only (finance-related means owner-only), and the classification is added to Task 2 before Task 2 starts.

### Task 1: Migration A, owner identity

**Files:**
- Create: `supabase/migrations/20261102000001_app_owner.sql`

**Interfaces:**
- Produces:
  - table `public.app_owner (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton))`, with RLS enabled and no policies;
  - function `public.is_owner() RETURNS boolean`, `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`, body `SELECT EXISTS (SELECT 1 FROM app_owner WHERE user_id = auth.uid())`;
  - `REVOKE ALL ON FUNCTION is_owner() FROM PUBLIC; GRANT EXECUTE ON FUNCTION is_owner() TO authenticated;`.

- [ ] **Step 1:** Write the migration exactly as specified in Produces. Change nothing else.
- [ ] **Step 2:** The owner applies it (same way previous migrations were applied: `supabase db push` or the SQL editor; the implementer asks which).
- [ ] **Step 3 (manual, owner):** In the SQL editor, run `INSERT INTO app_owner (user_id) VALUES ('<uid from Authentication > Users>');`. The implementer never sees or commits the uid.
- [ ] **Step 4: Verify.** Signed in as the owner on the web, run `await supabase.rpc('is_owner')` in the browser console. Expected: `{ data: true }`. With a second account, expected: `{ data: false }`.
- [ ] **Step 5: Commit** `feat(db): add app_owner and is_owner()`.

### Task 2: Migration B, ownership and policies

**Files:**
- Create: `supabase/migrations/20261102000002_multi_user_rls.sql`
- Create: `supabase/checks/multi_user_rls_check.sql` (manual verification script, not a migration)

**Interfaces:**
- Consumes: `app_owner`, `is_owner()` from Task 1; the classification from Task 0 Step 4.
- Produces:
  - `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE` on every personal table;
  - constraint `unique_mood_day UNIQUE (user_id, log_date)` on `mood_logs`.

- [ ] **Step 1: Write the check script first** (`supabase/checks/multi_user_rls_check.sql`).
  - **Shape:** it runs inside `BEGIN; ... ROLLBACK;` and impersonates users with `SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', json_build_object('sub', <uid>)::text, true);`.
  - **Inputs:** a psql variable `:owner` for the owner uid, plus a throwaway uid it creates in `auth.users` and rolls back.
  - **Output:** one row per named check, with `name` and `ok boolean`.
  - **Checks:**
    - `owner_sees_all_habits`: the owner's count equals the pre-migration count saved by the owner.
    - `other_sees_no_habits`
    - `other_sees_no_finance`: zero rows from every owner-only table and from `v_transactions`, `v_merchant_stats`, `v_pending_payments`, `get_pending_payments_next_days(30)`.
    - `other_can_insert_own_habit`
    - `other_cannot_insert_for_owner`: an insert with `user_id = owner` fails.
    - `mood_same_day_two_users`: both users insert `mood_logs` for the same `log_date` and both succeed.
    - `anon_sees_nothing`: under `SET LOCAL role anon`, zero rows from every table.
    - `other_cannot_log_owner_habit`: an insert into `habit_logs` that points at an owner `user_habit_id` fails.
- [ ] **Step 2: Write the migration** in one transaction:
  1. `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM app_owner) THEN RAISE EXCEPTION 'app_owner is empty, insert the owner uid first'; END IF; END $$;`
  2. For each personal table:
     - add `user_id` nullable;
     - `UPDATE ... SET user_id = (SELECT user_id FROM app_owner)`;
     - set NOT NULL and `DEFAULT auth.uid()`;
     - create an index on `(user_id, <main date or sort column>)`.
  3. Constraints on `mood_logs`: drop `unique_mood_day` and recreate it as `(user_id, log_date)`.
  4. Drop every existing policy on the tables in scope (names come from the Task 0 inventory). Then create:
     - **Personal tables:** `TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`. For `habit_logs`, `WITH CHECK` also requires `EXISTS (SELECT 1 FROM user_habits h WHERE h.id = user_habit_id AND h.user_id = auth.uid())`. The same applies to `mood_log_tags` against `mood_logs`.
     - **`habit_templates`:**
       - SELECT `TO authenticated USING (true)`;
       - INSERT, UPDATE and DELETE `TO authenticated USING (is_owner()) WITH CHECK (is_owner())`.
     - **`mood_tags`:** ALL `TO authenticated USING (true) WITH CHECK (true)`.
     - **Owner-only tables:** ALL `TO authenticated USING (is_owner()) WITH CHECK (is_owner())`.
  5. Functions: `REVOKE EXECUTE ON FUNCTION get_or_create_merchant(...), count_duplicate_merchants(...) FROM PUBLIC, anon, authenticated;` (they are only called with the service role). Use exact signatures from the inventory. If `get_pending_payments_next_days` is invoker it stays as is. If the inventory shows it as definer, add `IF NOT is_owner() THEN RETURN; END IF;`.
- [ ] **Step 3: Backup (manual, owner).** Take a fresh dump of the production database, kept outside the repo and gitignored. Before applying the migration, save pre-migration counts with `SELECT count(*) FROM user_habits; SELECT count(*) FROM habit_logs; SELECT count(*) FROM mood_logs;`.
- [ ] **Step 4: Apply** the migration (owner, same method as Task 1).
- [ ] **Step 5: Run the check script** in the SQL editor, with the owner uid pasted locally (not saved). Expected: every row has `ok = true`. If any is false, restore from the Step 3 dump, fix, and repeat.
- [ ] **Step 6: Smoke test the server side.** Trigger `daily-email-sync` with `workflow_dispatch`. Expected: a green run, and new emails (if any) inserted.
- [ ] **Step 7: Commit** `feat(db): per-user habits and mood, owner-only finances, no anon access`.

### Task 3: Shared TS queries

**Files:**
- Modify: `packages/supabase-queries/src/mood.ts:72` (conflict target)
- Create: `packages/supabase-queries/src/account.ts`
- Modify: `packages/supabase-queries/src/index.ts` (export)
- Test: `packages/supabase-queries/src/account.test.ts`, `packages/supabase-queries/src/mood.test.ts`

**Interfaces:**
- Produces: `fetchIsOwner(client: SupabaseClient): Promise<boolean>`. It calls `client.rpc('is_owner')`, throws on error, and returns `data === true`.

- [ ] **Step 1: Write failing tests**, using a hand-made fake client object (`{ rpc: async () => ({ data, error }) }`, and `from().upsert()` recording its args):
  - `fetchIsOwner returns true only for data === true` (cases `true` gives true; `false`, `null` give false);
  - `fetchIsOwner throws on rpc error`;
  - `upsertMood uses user_id,log_date as conflict target`, which asserts the recorded `onConflict === 'user_id,log_date'`.
- [ ] **Step 2: Run** `npx vitest run packages/supabase-queries`. Expected: these 3 fail.
- [ ] **Step 3: Implement** `account.ts`, change `onConflict` to `'user_id,log_date'`, and export `fetchIsOwner`.
- [ ] **Step 4: Run** the tests again. Expected: all pass.
- [ ] **Step 5: Commit** `feat(queries): fetchIsOwner and per-user mood upsert`.

### Task 4: Android, ownership state and tabs

**Files:**
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/data/auth/OwnerState.kt`
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/ui/AppTabs.kt`
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/LoginScreen.kt` (`LoginGate`)
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/MainActivity.kt` (`AppRoot`, `navDestinations`, `AppNavigationBar`)
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/data/auth/OwnerStateTest.kt`, `android/app/src/test/java/com/thonyfd/financedashboard/ui/AppTabsTest.kt`

**Interfaces:**
- **Produces in `OwnerState.kt`:**
  - `suspend fun resolveIsOwner(fetch: suspend () -> Boolean, cached: Boolean?, save: suspend (Boolean) -> Unit): Boolean`. On success it saves and returns the fetched value. On failure it returns `cached ?: false`.
  - `object OwnerCache`, backed by SharedPreferences `"account"`, key `"is_owner"`:
    - `fun get(context: Context): Boolean?`
    - `fun set(context: Context, value: Boolean)`
    - `fun clear(context: Context)`
  - `suspend fun SupabaseConfig.fetchIsOwner(): Boolean`: `client.postgrest.rpc("is_owner").decodeAs<Boolean>()`. Confirm the 3.1.4 rpc API with Context7 first.
- **Produces in `AppTabs.kt`:**
  - `enum class AppTab(val label: String, val icon: ImageVector) { Inicio, Control, Timeline, Habitos, Mood }`, with the labels and icons of today's `navDestinations`;
  - `fun visibleTabs(isOwner: Boolean): List<AppTab>`: all five for the owner, `[Timeline, Habitos, Mood]` otherwise;
  - `fun startTab(isOwner: Boolean): AppTab`: `Inicio` for the owner, `Habitos` otherwise;
  - `fun resolveDeepLinkTab(index: Int, isOwner: Boolean): AppTab?`: maps the legacy index 0..4 to `AppTab.entries[index]`, and returns null when the tab is not visible.
- **Consumes:** `AuthGateState` (existing).

- [ ] **Step 1: Write failing tests.**
  - **`OwnerStateTest`:**
    - `ownerStateUsesFetchedValueAndSavesIt`
    - `ownerStateFallsBackToCachedValueWhenFetchFails` (fetch throws `IOException`, cached `true`, expect `true`)
    - `ownerStateDefaultsToFalseWithNoCache`
  - **`AppTabsTest`:**
    - `ownerSeesAllFiveTabs`
    - `nonOwnerSeesTimelineHabitsMood`
    - `nonOwnerStartsOnHabits`
    - `nonOwnerIgnoresFinanceDeepLinks`: `resolveDeepLinkTab(0, false) == null`, `resolveDeepLinkTab(1, false) == null`, `resolveDeepLinkTab(3, false) == AppTab.Habitos`.
- [ ] **Step 2: Run** `GRADLE :app:testDebugUnitTest --tests '*OwnerStateTest*' --tests '*AppTabsTest*'`. Expected: FAIL (unresolved).
- [ ] **Step 3: Implement** `OwnerState.kt` and `AppTabs.kt`.
- [ ] **Step 4: Wire `LoginGate`.**
  - On `LoggedIn`, run `resolveIsOwner` once per session (keyed on the session user id) and keep the spinner until it resolves.
  - Pass `isOwner` to content as `content: @Composable (isOwner: Boolean) -> Unit`.
- [ ] **Step 5: Wire `AppRoot(isOwner: Boolean, ...)`.**
  - The selected state becomes an `AppTab` initialised with `startTab(isOwner)`.
  - The bottom bar renders `visibleTabs(isOwner)`.
  - `externalTab` goes through `resolveDeepLinkTab`.
  - `externalNav` (category detail) is ignored when `!isOwner`.
  - Remove `navDestinations` and `NavDestination` if nothing else uses them.
- [ ] **Step 6: Run** all unit tests and `GRADLE :app:compileDebugKotlin`. Expected: PASS and a successful build.
- [ ] **Step 7: Commit** `feat(android): owner-aware tabs, non-owners open on habits`.

### Task 5: Android, widgets and sign-out cleanup

**Files:**
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/widget/AccountCaches.kt`
- Modify: `widget/FinanceWidget.kt`, `widget/PaymentsWidget.kt`, `widget/FinanceWidgetWorker.kt` (owner check before fetching)
- Modify: `widget/FinanceWidgetStateStore.kt`, `widget/PaymentsWidgetStateStore.kt`, `widget/HabitsWidgetStateStore.kt` (add `suspend fun clear(context: Context)` that removes every stored key, mood state included)
- Modify: `ui/AppMenu.kt` (call `clearAccountCaches` after sign-out)
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/widget/AccountCachesTest.kt`

**Interfaces:**
- **Consumes:** `OwnerCache` and `SupabaseConfig.fetchIsOwner()` from Task 4.
- **Produces:**
  - `suspend fun clearAccountCaches(clearers: List<suspend () -> Unit>)`, which runs every clearer even when one throws;
  - `suspend fun clearAllAccountCaches(context: Context)`, which passes the three store `clear` calls plus `OwnerCache.clear`, then refreshes all widgets with `WidgetAppearancePreferences.refreshAll(context)` or the existing per-widget update calls.

- [ ] **Step 1: Write failing tests:**
  - `clearAccountCachesResetsEveryStore`: three fake clearers, all called;
  - `clearAccountCachesContinuesAfterFailure`: the second throws, the third is still called.
- [ ] **Step 2: Run** `GRADLE :app:testDebugUnitTest --tests '*AccountCachesTest*'`. Expected: FAIL.
- [ ] **Step 3: Implement** `AccountCaches.kt` and the store `clear` functions.
- [ ] **Step 4: Gate the finance and payments widgets.**
  - Before fetching, resolve ownership with `resolveIsOwner(fetch = { SupabaseConfig.fetchIsOwner() }, cached = OwnerCache.get(context), save = { OwnerCache.set(context, it) })`.
  - When false, skip the fetch and render the text `No disponible para esta cuenta`, styled like the existing error state.
- [ ] **Step 5:** In `AppMenu.kt`, call `clearAllAccountCaches(context)` after `signOutWithFallback`, before the toast.
- [ ] **Step 6: Run** all unit tests and `GRADLE :app:compileDebugKotlin`. Expected: PASS and a successful build.
- [ ] **Step 7: Commit** `feat(android): finance widgets owner-only and caches cleared on sign-out`.

### Task 6: Web, owner-aware navigation and routes

**Files:**
- Modify: `web/dashboard/src/contexts/AuthContext.tsx` (add `isOwner: boolean`)
- Modify: `web/dashboard/src/api/supabase-data-client.ts` (wrap `fetchIsOwner`)
- Create: `web/dashboard/src/components/OwnerRoute.tsx`
- Modify: `web/dashboard/src/App.tsx` (wrap every `/finance/*` element, hide the Finanzas switcher and links, and make `/app` and `/finance` redirect by role)

**Interfaces:**
- **Consumes:** `fetchIsOwner` from Task 3.
- **Produces:**
  - `useAuth().isOwner: boolean`. `loading` stays true until it is known for the current session. It resets to false on sign-out. If the fetch fails, `isOwner` is false and the error is logged.
  - `OwnerRoute({ children })`: renders children for the owner and `<Navigate to="/azton/habits" replace />` otherwise. It sits inside `ProtectedRoute`.

- [ ] **Step 1: Implement** the `AuthContext` change. Fetch on `onAuthStateChange` when the user id changes.
- [ ] **Step 2: Implement** `OwnerRoute` and wrap the finance routes.
- [ ] **Step 3: Update `Navigation`.**
  - Non-owners do not get the section switcher, and `currentLinks` is always `aztonLinks`.
  - The brand click goes to `/azton/habits`.
  - Also hide `AlertBanner` for non-owners.
- [ ] **Step 4: Run** `npm run build` in `web/dashboard`. Expected: success.
- [ ] **Step 5: Commit** `feat(web): owner-aware navigation, finance routes owner-only`.

### Task 7: Projects and Tasks spec update

**Files:**
- Modify: `docs/superpowers/specs/2026-11-01-projects-and-tasks-design.md`

- [ ] **Step 1: Apply the per-user rules.**
  - In Constraints, replace the "single-user pattern ... Allow all" rule with the per-user rule: `user_id uuid NOT NULL DEFAULT auth.uid()` and `TO authenticated USING (user_id = auth.uid())`.
  - Add `user_id` to `projects`, `tasks` and `task_checklist_items` in the data model.
  - Storage paths in `project-images` become `<uid>/<project_id>/<file>`, with policies on `(storage.foldername(name))[1] = auth.uid()::text`.
  - Delete the line that says tightening RLS is out of scope, and point to this multi-user spec.
- [ ] **Step 2: Commit** `docs: projects and tasks spec follows per-user ownership`.

### Task 8: Rollout and end-to-end verification

- [ ] **Step 1: Deploy order.**
  1. Tasks 1 and 2 (DB).
  2. Merge the web to `main` so it deploys.
  3. `GRADLE :app:installDebug` on the owner's phone and on the daughter's phone.

  Mood saves may fail between the end of Task 2 and the client deploys (accepted).
- [ ] **Step 2: Owner, Android.**
  - All 5 tabs are visible.
  - Finance data and widgets look the same as before.
  - Mood saves.
  - A habit toggle from the widget works.
- [ ] **Step 3: Second account, Android, same phone.**
  1. Sign out (the confirm dialog and toast appear).
  2. Sign in with the second account.
  3. Only Timeline, Hábitos and Mood are visible, and the app opens on Hábitos.
  4. The lists are empty.
  5. The habits widget is empty, and the finance and payments widgets show `No disponible para esta cuenta`.
  6. Create a habit and complete it. Save a mood for today.
  7. Sign out, sign in as the owner. The owner's data is intact and none of the second account's habits are visible.
- [ ] **Step 4: Reboot** the phone without opening the app. `adb logcat -s AndroidRuntime` shows no FATAL.
- [ ] **Step 5: Web, both accounts.**
  - **Owner:** unchanged.
  - **Second account:** only Azton links are visible, `/finance/overview` redirects to `/azton/habits`, and the data matches Android.
- [ ] **Step 6: Workflows.** The next scheduled `daily-email-sync` run is green, and push notifications still arrive.
