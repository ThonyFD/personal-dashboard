# Projects and Tasks - Design

Date: 2026-11-01
Surfaces: Android app (`android/`) and web dashboard (`web/dashboard/`), same Supabase backend.

## Intent

The user wants to organize their personal work by **project** ("Bitácora deportiva", "Datacetria", ...). A project is a container with its own image (PNG or JPG). Inside a project the user sees two kinds of work:

1. **Habits** (already exist in the app) that belong to that project, with their current progress.
2. **Tasks** (new): one-off items with everything needed to manage them.

This is a large feature expansion of the app, not a small "add categories" tweak. Both Android and web must ship it with the same data model.

## Goals

- Create, edit, archive projects from Android and web, each with name, image (PNG/JPG upload), and accent color.
- Assign existing and new habits to a project (optional).
- Full task management inside a project: title, notes, due date (optional time), priority, status, checklist (subtasks), reminder.
- Android local notification at the reminder time.
- Project detail view: header with image, habits with today's/period progress, tasks grouped by status.
- Changes made on one surface appear on the other (shared Supabase tables, shared queries in `packages/supabase-queries`).

## Non-goals (this iteration)

- Recurring tasks and tags (the user was asked and did not request them).
- Multi-user, sharing, or collaboration. The app is single-user, like existing habits/mood tables.
- Web push reminders. Reminders are an Android notification only; web shows due dates/overdue state.
- Replacing the existing transaction categories (`categories` table / Categories page). Those stay untouched.
- Offline-first sync. Same online model as the rest of the app.

## Anti-goals

- Breaking existing habits: the Habits screen, widget, timeline, and day rollover must keep working for habits with no project.
- Diverging Android and web models (e.g., a field that exists only on one surface).
- Storing images as base64 in table rows.

## Constraints

- Backend: Supabase (Postgres + Storage). Migrations live in the repo's `supabase/migrations/` (authoritative; `/Users/thonyfd/supabase/migrations` is a drifted copy, not used) with `YYYYMMDDHHMMSS_name.sql` naming. Follow the per-user pattern from `docs/superpowers/specs/2026-11-02-multi-user-design.md`: every new table has `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE`, RLS enabled with `TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())` (child rows also check that the parent belongs to `auth.uid()`), `BIGSERIAL` ids, `created_at`/`updated_at` with the `update_updated_at_column()` trigger.
- Shared TypeScript queries go in `packages/supabase-queries/src` (new `projects.ts`, `tasks.ts`, types in `types.ts`, exported from `index.ts`), with tests next to them like `habits.test.ts`.
- Android: Kotlin + Compose, supabase-kt Postgrest. Insert payloads that carry booleans/defaults that differ from DB defaults must use `@EncodeDefault` (see the `is_paid` bug fixed on 2026-11-01).
- Visual style: follow `design/BRAND_BOOK.md` and the existing app components (`AppComponents.kt`, `appFieldColors()`, `AppColors`).
- Repo is public: no real data, keys, or sample images with personal content committed.
- No em dash characters in code, comments, or copy.

## Decisions made with the user

- Projects contain both habits and one-off tasks.
- Tasks include "everything needed to manage them": title, notes, due date with optional time, priority, status (pending / in progress / done), checklist, reminder notification on Android.
- Images: PNG or JPG uploaded from phone or web.
- Web must be kept in sync with all of this.
- A habit belongs to at most one project (or none). The existing Habits view keeps working as today.
- Android gets Google sign-in via Supabase Auth (same Google OAuth provider the web already uses), so the image bucket can be truly private.
- Archiving a project: its habits keep showing normally (Habits, widget, timeline, streaks); its open tasks stop firing reminders while archived and resume if unarchived.

## Data model (proposed, builder may refine names)

```sql
projects (
  id BIGSERIAL PK,
  user_id UUID NOT NULL DEFAULT auth.uid(),        -- owner account (per-user RLS)
  name VARCHAR(80) NOT NULL,
  description TEXT,
  color_hex VARCHAR(7),
  image_path TEXT,            -- object path in Storage bucket 'project-images', NULL = fallback (initial + color)
  sort_order INT NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at, updated_at
)

user_habits.project_id BIGINT NULL REFERENCES projects(id) ON DELETE SET NULL

tasks (
  id BIGSERIAL PK,
  user_id UUID NOT NULL DEFAULT auth.uid(),        -- owner account (per-user RLS)
  project_id BIGINT NULL REFERENCES projects(id) ON DELETE CASCADE,  -- NULL = inbox (no project)
  title VARCHAR(200) NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',     -- PENDING | IN_PROGRESS | DONE
  priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',    -- LOW | MEDIUM | HIGH | URGENT
  due_date DATE,
  due_time TIME,                                     -- only meaningful with due_date
  remind_at TIMESTAMPTZ,                             -- absolute instant, America/Panama for UI
  completed_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at, updated_at
)

task_checklist_items (
  id BIGSERIAL PK,
  user_id UUID NOT NULL DEFAULT auth.uid(),        -- owner account (per-user RLS)
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at, updated_at
)
```

CHECK constraints on `status` and `priority`. Indexes on `projects(user_id, sort_order)`, `tasks(user_id, status)`, `tasks(project_id, status)`, `tasks(due_date)`, `user_habits(project_id)`.

Deleting a project: UI offers **archive** as the primary action; hard delete cascades tasks and unlinks habits (habits survive with `project_id = NULL`).

## Android authentication (new phase, before projects)

- Today `SupabaseConfig.kt` installs only Postgrest with the anon key; there is no sign-in. The `supabase.auth` dependency is already declared in `build.gradle.kts`.
- Add Supabase Auth with Google sign-in (Credential Manager / native Google ID token flow, or OAuth deep link; builder picks, preferring native ID token). Only the owner's Google account is expected.
- Session persisted on device and auto-refreshed. Login screen shown when there is no session; existing screens unchanged after login.
- Widgets, `HabitsDayRolloverReceiver`, and new reminder receivers must load the persisted session before calling Supabase, and degrade gracefully (show last cached state) if there is none.
- Existing tables are already split per user (habits, mood) and owner-only (finances) by `docs/superpowers/specs/2026-11-02-multi-user-design.md`, which supersedes the earlier "tightening RLS is out of scope" note. A habit may only link to a project of the same user.

## Images

- Supabase Storage bucket `project-images`, private, with `storage.objects` policies for the `authenticated` role only (not anon), restricted to the caller's own folder: `(storage.foldername(name))[1] = auth.uid()::text`. Bucket and policies are created in the same migration (insert into `storage.buckets`).
- Display via signed URLs (or authenticated download) on both surfaces.
- Accept PNG and JPG only. Client resizes/compresses before upload to max 1024px on the long edge, target under ~500 KB.
- Path: `{user_id}/{project_id}/{uuid}.{ext}` (the first folder is the owner's uid, which the storage policies check). Replacing an image uploads a new object, updates `image_path`, then deletes the old object.
- Android: system photo picker (`PickVisualMedia`), needs adding `supabase-kt` storage module. Web: `<input type="file" accept="image/png,image/jpeg">`.

## Screens

### Android
- New bottom-nav destination **Proyectos** (MainActivity tab list). Builder decides placement; it must not remove an existing tab.
- Projects list: grid/cards with image, name, counts (open tasks, habits), overdue badge. FAB to create.
- Project editor: name, description, color, image pick/replace/remove, archive.
- Project detail: image header; section Habits (today's state, tap to complete reusing existing habit log logic); section Tasks grouped Pending / In progress / Done (Done collapsed); add task.
- Task editor: title, notes, project selector, status, priority, due date + optional time, reminder, checklist (add/check/reorder/delete).
- Habit editor (`HabitsScreen.kt`): add a "Proyecto" select field (None + projects).

### Web
- New route group under `/azton/projects` (list) and `/azton/projects/:id` (detail), linked in the Azton nav next to Habits/Mood/Timeline.
- Same capabilities as Android: project CRUD with image upload, task CRUD with checklist, habit-project assignment in the existing Habits editor.

## Reminders (Android)

- When a task with `remind_at` in the future is created/edited on Android, schedule an exact-or-inexact alarm (reuse the `AlarmManager` approach of `HabitsDayRolloverReceiver`) that posts a notification with the task title and project.
- Tasks in archived projects never schedule reminders; unarchiving reschedules future ones.
- Tasks created or edited on web: on app start and on Projects screen load, Android re-syncs upcoming reminders (next 7 days) from Supabase and (re)schedules them, cancelling alarms for tasks that changed, were completed, or deleted. Reboot: reschedule via `BOOT_COMPLETED`.
- Requires `POST_NOTIFICATIONS` runtime permission (Android 13+).

## Phasing (suggested order)

0. Android: Google sign-in with Supabase Auth, session for widgets/receivers.
1. Migration + Storage bucket + shared TS queries/types with tests.
2. Android: data layer, Projects list/editor with images, project on habits.
3. Android: tasks + checklist + detail view.
4. Android: reminders.
5. Web: projects, tasks, habit assignment.

Each phase should be shippable and installable on the device.

## Left to the builder

- Exact component structure, file names, and nav placement within the constraints above.
- Image compression library/approach per platform.
- Sorting rules within task groups (suggested: priority desc, then due date asc).
- Empty states and copy (Spanish, matching existing app tone).
- Whether inbox tasks (no project) get a visible "Sin proyecto" bucket in the UI (recommended).
