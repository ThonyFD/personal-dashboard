# Multi-user: personal data per account, finances owner-only

## Intent

The owner wants to let their daughter (and, since sign-up stays open, anyone with a Google account) use the Android app and the web dashboard for habits. Each account sees only its own personal data. The owner's finances never reach any other account.

Why now: Google login just shipped (Phase 0 of Projects and Tasks). A second account that signed in saw all of the owner's data, because no table has an owner and every policy is `USING (true)`. On top of that, the anon key ships inside the app and the web bundle, so today anyone holding it can read everything without logging in.

## Goals

1. Personal data is per account. Each account reads and writes only its own rows: habits, habit logs, mood (daily logs, check-ins and log tags), and later projects and tasks. A new account starts empty, and that is fine.
2. Finances are owner-only. Transactions, manual transactions, incomes, categories, merchants, emails, Gmail sync state, push subscriptions and notification preferences are readable and writable only by the owner account.
3. No access without a session. Anon gets nothing on any table.
4. The UI adapts for non-owner accounts:
   - **Android:** only Timeline, Hábitos and Mood tabs are shown, and the app opens on Hábitos. The ☰ menu still shows the account email and "Cerrar sesión".
   - **Web:** only the Azton section (Timeline, Hábitos, Mood). Any `/finance/...` route redirects to `/azton/habits`, and the section switcher hides Finanzas.
   - **Widgets:** the habits widget works per account. The finance and payments widgets show a short "No disponible" state for non-owners, not an error.
5. The owner's experience is unchanged: same tabs, same data, same widgets, and the Gmail sync keeps working.

## Non-goals

- Finances for other accounts. This would mean `user_id` on finance tables and a Gmail ingestor that knows which account each email belongs to. It is a separate project.
- Invites, allowlists or admin screens. Sign-up stays open (owner's decision).
- Sharing data between accounts (for example, a parent seeing the daughter's habits).
- Account deletion flows.

## Anti-goals

- The owner's existing data ending up owned by nobody, or by the wrong account, after the migration. This counts as a failure even if everything else works.
- The Gmail sync or push notifications breaking.
- The owner's identifiers (auth uid, email) committed to the public repo.
- A non-owner seeing even one finance number, including through views, RPCs or widgets.

## Constraints

- The repo is **public**. No emails, uids, client IDs or dumps in commits. `initial_restore.sql` stays gitignored.
- Migrations go in the repo's `supabase/migrations/` (authoritative), named `YYYYMMDDHHMMSS_name.sql`.
- Android and web parity is required (see `android-web-parity`). Shared TS queries live in `packages/supabase-queries`.
- No em dash characters anywhere.
- UI copy in Spanish, following `design/BRAND_BOOK.md` and the existing `AppColors` and CSS tokens.

## Decisions made with the owner

- The daughter will use habits only. Empty on first login is fine.
- Finance tabs are hidden for non-owners, and the app opens on Hábitos.
- Sign-up stays open to any Google account.
- Finances stay owner-only with no `user_id` (the "two groups" split).
- A short mood-save outage between Migration B and the client updates is acceptable. Android builds reach phones by adb install, so there is no compatibility bridge.
- The owner confirms that the GitHub secret `SUPABASE_SERVICE_ROLE_KEY` holds the service_role key, not the anon key. Migration B is gated on that confirmation.

## Design

### Owner identity

- New table `app_owner (user_id uuid PRIMARY KEY REFERENCES auth.users(id))`, with at most one row (enforced by a check or a unique constant column).
- The owner inserts their uid by hand in the Supabase SQL editor. The uid is never written in a migration.
- SQL function `is_owner()`:
  - `RETURNS boolean`, `STABLE`, `SECURITY DEFINER`, `SET search_path = public`.
  - Returns `EXISTS (SELECT 1 FROM app_owner WHERE user_id = auth.uid())`.
  - `EXECUTE` is granted to `authenticated`.
- `app_owner` has RLS on with no client policies. Clients learn ownership only through `is_owner()`, called as an RPC.

### Personal tables (per account)

- **Tables:** `user_habits`, `habit_logs`, `mood_logs`, `mood_checkins`, `mood_log_tags`.
- **Column:** add `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE`. The default means the existing Android and web inserts do not need to send it.
- **Backfill:** every existing row gets the owner's uid from `app_owner`.
- **Policies:** drop the old `Allow all` policies and replace them with policies for the `authenticated` role, `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.
- **`mood_log_tags`:** may instead inherit ownership through its `mood_log_id`. This is the builder's call; either way, only the owner of the parent `mood_logs` row can see it.
- **Unique constraints become per user:**
  - `habit_logs`: `unique_habit_day (user_habit_id, log_date)` is already per habit and can stay.
  - `mood_logs`: `unique_mood_day (log_date)` becomes `(user_id, log_date)`. Every client upsert that uses `onConflict = "log_date"` must change to `"user_id,log_date"` (Android and `packages/supabase-queries`).
- **Indexes:** add `user_id` to the main read indexes, for example `(user_id, log_date DESC)`.
- **View:** `v_habit_daily_completion` is `security_invoker`, so it follows RLS. Verify that it groups correctly (it should only see the caller's rows).

### Shared catalogs

- `habit_templates` and `mood_tags` stay global.
  - SELECT is allowed to `authenticated`.
  - Writes to `habit_templates` are owner-only.
  - `mood_tags` writes are allowed to `authenticated` (tag names are not sensitive, and the name is globally unique today). This is my call; the builder can make it per user if the clients create tags freely.

### Finance tables (owner-only)

- **Tables:** `transactions`, `manual_transactions`, `monthly_incomes`, `categories`, `merchants`, `emails`, `gmail_sync_state`, `push_subscriptions`, `notification_preferences`, `system_alerts`. `system_alerts` was created by the older `packages/sql/migrations/` folder, so it is not in `supabase/migrations`.
- **Functions from the older folder:** `get_or_create_merchant` and `count_duplicate_merchants` must also be owner-only. Either revoke `EXECUTE` from `anon` and `authenticated`, or check `is_owner()` inside them. My call.
- **Policies:** replace `Allow all` with `authenticated` policies, `USING (is_owner()) WITH CHECK (is_owner())`.
- **Views:** `v_transactions`, `v_merchant_stats` and `v_pending_payments` are `security_invoker`, so they inherit this.
- **RPC:** `get_pending_payments_next_days` must run as invoker. If it is ever made `SECURITY DEFINER`, it must check `is_owner()`.
- **Gmail ingestor**: the GitHub Actions cron runs `scripts/production/sync-emails-daily.ts` and `scripts/production/send-notifications.ts`, not `services/ingestor`. It must use the service role key, which bypasses RLS. Verify this in `services/ingestor/src/database/client.ts` and in the workflow secrets before applying the migration. If it uses the anon key, switch it to the service role key first.
- **Push and notification senders:** any server code that sends pushes or reads `push_subscriptions` must also use the service role. The builder audits every server-side Supabase client in the repo.

### Anon

After the migration, no policy grants anything to `anon`. Every client call needs a session.
- **Android widgets:** they already call `SupabaseConfig.awaitAuth()` before querying. With no session they simply fail, and they must show their existing error or empty state, not crash.
- **Web:** `ProtectedRoute` already requires a login.

### Migration order and safety

0. **Inventory (owner runs one read-only query):** the repo and the production database have drifted apart (there are placeholder migrations and a second `packages/sql/migrations/` folder). Before writing Migration B, the plan provides one read-only query that lists:
   - all public tables;
   - all views and functions, with their security mode and who may call them;
   - all current policies.

   The owner runs it in the SQL editor and shares the output. Migration B must cover every object that query lists.
1. **Migration A:** create `app_owner` and `is_owner()`. Change nothing else.
2. **Manual step (owner):** insert their uid into `app_owner` from the SQL editor. The uid comes from Authentication > Users.
3. **Migration B:**
   - Add `user_id` columns, backfill from `app_owner`, set them NOT NULL, and swap the unique constraints and indexes.
   - Replace all policies (personal and finance) and drop the anon access.
   - At the start, raise an exception if `app_owner` has no row. This prevents a backfill to NULL and a lockout.
4. Take a backup before Migration B. The owner already has `initial_restore.sql`-style dumps; take a fresh one. Migration B runs in one transaction.

### Client changes

**Shared TS (`packages/supabase-queries`):**
- `fetchIsOwner(supabase)`, which calls the `is_owner` RPC.
- Update the mood upsert conflict target.
- No query adds a `user_id` filter by hand; RLS does the filtering.

**Android:**
- After login, `LoginGate` (or a small holder next to it) loads `is_owner` once per session and keeps it in memory. While it loads, the gate keeps showing its spinner so the tabs never flash.
- **AppRoot:** non-owners get the tabs Timeline, Hábitos and Mood, starting on Hábitos. Deep links into finance tabs (`externalTab`, `CategoryNavState` from widgets) are ignored for non-owners.
- **Widgets:**
  - The finance and payments widgets check `is_owner` (caching the last value) and show "No disponible para esta cuenta" when false.
  - The habits widget works per account through RLS.
  - On sign-out, all widget caches are cleared and refreshed, so the next account does not see the previous account's cached data. This is required, because the habits and finance widget state stores persist data today.
- Mood upsert conflict target updated.

**Web:**
- `AuthContext` exposes `isOwner` (loaded with the session; `loading` stays true until it is known).
- Navigation hides the Finanzas section and links for non-owners.
- A route guard redirects `/finance/*` to `/azton/habits` for non-owners.
- `/` and `/app` land on `/azton/habits` for non-owners.

### Projects and Tasks spec

Update `docs/superpowers/specs/2026-11-01-projects-and-tasks-design.md`:
- `projects`, `tasks` and `task_checklist_items` are born with `user_id uuid NOT NULL DEFAULT auth.uid()` and the per-user policies above.
- Storage paths in `project-images` are prefixed with the uid, with a policy that checks `(storage.foldername(name))[1] = auth.uid()::text`.
- That spec's line that says tightening RLS is out of scope is superseded by this spec.

## Testing

**SQL:**
- A script or test (run against a local or branch database if available; otherwise a documented manual check in the SQL editor) that proves:
  - user A cannot read B's habits;
  - a non-owner gets zero rows from every finance table and view;
  - anon gets zero rows everywhere;
  - the owner still sees all existing data, with counts matching before and after.

**Shared TS:** vitest for `fetchIsOwner` mapping and the mood upsert conflict target.

**Android:**
- Unit tests for the tab list selection by ownership.
- On device, check three things:
  - owner unchanged;
  - second account sees only 3 tabs, opens on Hábitos, starts empty, and finance widgets say "No disponible";
  - sign out of one account and in with the other leaves no leftover widget data.

**Web:** the same three checks in the browser.

## Left to the builder

- Exact SQL shape (policy names, how to enforce the single `app_owner` row, whether `mood_log_tags` gets its own `user_id`).
- Where the `isOwner` state lives on Android (inside `LoginGate`, a small `SessionInfo` object, or similar).
- Copy for the "No disponible" widget state.
- Phasing into plan tasks. Suggested order: verify server keys, Migration A, owner manual step, Migration B with the SQL checks, shared TS, Android, web.
