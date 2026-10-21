# Azton Module — Implementation Spec (for Codex)

> **Fuente funcional:** [`../../Blueprint Tecnico y Funcional Azton v2.md`](../../Blueprint%20Tecnico%20y%20Funcional%20Azton%20v2.md)
> **Este documento es la fuente de verdad TÉCNICA.** Donde el Blueprint y este doc difieran (PKs, tipos, multiusuario), **gana este doc** — adapta el Blueprint a las convenciones reales del repo descritas aquí.

Spec autocontenida para implementar el módulo **Azton** (tracker de hábitos + estado de ánimo + gamificación) en **web + Android + widget**, reusando los patrones existentes del proyecto. No necesitas re-explorar el repo: todas las referencias de archivo y firmas están abajo.

---

## 0. Alcance y decisiones tomadas

Decisiones del owner (ya cerradas — no re-preguntar):

| Tema | Decisión | Implicación |
|------|----------|-------------|
| **Usuarios** | **Mono-usuario** | NO añadir columnas `user_id`. NO añadir auth a Android. RLS permisiva igual que el resto del repo. |
| **Alcance v1** | **MVP sin IA** | Implementar Módulos 1, 3 y 4 del Blueprint. **Omitir** Módulo 2 (onboarding/arquetipos) y Módulo 5 (agentes LLM). |
| **Onboarding** | Manual | El "set inicial de 3 hábitos" se siembra por SQL (sección 2.6), no por motor de arquetipos. |
| **LLM** | Ninguno por ahora | Sin llamadas a Gemini/Claude en este módulo. |

**Qué se construye (MVP):**
1. **Motor de Hábitos + Timeline** — Day Blocks (MORNING/AFTERNOON/EVENING), catálogo de plantillas, CRUD de hábitos del usuario, logs diarios, Focus Timer.
2. **Mood Tracker** — selector 1–5, micro-journaling (≤280 chars), tags de síntomas/disparadores (N:M).
3. **Gamificación** — rachas (streaks) y heatmap mensual de consistencia.

**Qué NO se construye:** onboarding conversacional, motor de arquetipos, agentes LLM, planificador dinámico, reporte de correlaciones. (Las tablas quedan listas para añadirlos después.)

---

## 1. Convenciones del repo (OBLIGATORIO seguirlas)

Estas convenciones se derivaron del código existente. Cualquier tabla/función/UI nueva debe calcarlas.

### 1.1 Base de datos (Supabase / Postgres)
- **PK:** `id BIGSERIAL PRIMARY KEY` (NO UUID, NO `VARCHAR(36)`).
- **Timestamps:** toda tabla lleva `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` y `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Trigger de updated_at:** ya existe la función `update_updated_at_column()` (en `20260407000002_post_restore.sql`). Crear un trigger `BEFORE UPDATE` por tabla que la use.
- **FKs:** `BIGINT REFERENCES tabla(id) ON DELETE [CASCADE|SET NULL]`.
- **Sin `user_id`** (mono-usuario). El scoping es por RLS permisiva.
- **RLS:** habilitar y crear policy permisiva idéntica al resto:
  ```sql
  ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow all for authenticated" ON <tabla> FOR ALL USING (true) WITH CHECK (true);
  ```
- **Vistas** (si se necesitan joins): `CREATE VIEW ... WITH (security_invoker = on) AS ...` para que hereden RLS.
- **Numéricos:** enteros para scores/minutos (`INT`). Si hubiera dinero sería `DECIMAL(12,2)`, pero aquí no aplica.
- **Migraciones:** doble ubicación (ver 2.1).

### 1.2 Paquete de queries compartido (`packages/supabase-queries`)
- Una función por operación; **primer parámetro siempre `client: SupabaseClient`** (inyección de dependencia).
- Funciones `async` que devuelven tipos del dominio o lanzan el `error` de Supabase (`if (error) throw error`).
- **Mappers** `mapXxx(r: any): Domain` convierten snake_case (DB) → camelCase (TS). Los `amount`/numéricos se envuelven en `Number(...)`.
- En `create*`, setear `created_at` y `updated_at` con `new Date().toISOString()`.
- En `update*`, construir un `patch` parcial y setear `updated_at`.
- Tipos en `src/types.ts`; re-export de tipos y funciones en `src/index.ts` (imports con extensión `.js`).
- Referencia canónica: [`packages/supabase-queries/src/monthly.ts`](../../packages/supabase-queries/src/monthly.ts).

### 1.3 Web (`web/dashboard`)
- Cada función compartida se re-exporta con el cliente ya inyectado en [`src/api/supabase-data-client.ts`](../../web/dashboard/src/api/supabase-data-client.ts) (`export const fetchX = (...) => _fetchX(supabase, ...)`).
- Páginas en `src/pages/Xxx.tsx`, usando **React Query** (`useQuery`/`useMutation`, invalidar con `queryClient.invalidateQueries`).
- Registrar página en [`src/App.tsx`](../../web/dashboard/src/App.tsx): import + `<Link>` en `.menu-links` (~L90) + `<Route>` envuelto en `<ProtectedRoute>` (~L169).
- Estilos: CSS co-localizado `Xxx.css` o estilos inline; usar variables de marca (`--c-surface`, `--c-border-violet`, `--c-text`, `--c-primary`, `--c-glow`, `--f-body`).
- **Brand Book manda en lo visual:** [`design/BRAND_BOOK.md`](../../design/BRAND_BOOK.md) (estética dark/futurista, alto contraste).

### 1.4 Android (`android`, Jetpack Compose + Glance)
- Data: SDK de Supabase Kotlin directo (`SupabaseConfig.client`), sin auth (anon key). Repos en `data/repository/`, modelos `@Serializable` en `data/models/`.
- Patrón de repo: ver [`FinanceRepository.kt`](../../android/app/src/main/java/com/thonyfd/financedashboard/data/repository/FinanceRepository.kt) — `supabase.from("tabla").select { filter { eq(...) } ... }.decodeList<Model>()`.
- UI: pantallas Composable en `ui/`, navegación por **tabs** con `selectedTab` (índice) en `MainActivity.kt`.
- Widget: Glance + DataStore (StateStore) + `CoroutineWorker` + `GlanceAppWidgetReceiver`. Ver patrón de `PaymentsWidget`.

---

## 2. FASE 1 — Base de datos

### 2.1 Ubicación de la migración (doble, obligatoria)
Crear el **mismo** archivo en las dos rutas (el repo mantiene fuente + producción en paralelo):
1. `packages/sql/migrations/008_add_habits_and_mood.sql`
2. `/Users/thonyfd/supabase/migrations/20260626000001_add_habits_and_mood.sql`

> Mantener idéntico el contenido SQL en ambos. La fecha del segundo sigue el formato `YYYYMMDD000001`.

### 2.2 DDL completo (calcado a convenciones)

```sql
-- ════════════════════════════════════════════════════════════════════
-- Azton Module: Habits + Timeline + Mood + Gamification (single-user)
-- ════════════════════════════════════════════════════════════════════

-- ── Módulo 1: Catálogo estático de plantillas ──────────────────────
CREATE TABLE habit_templates (
  id                       BIGSERIAL PRIMARY KEY,
  name                     VARCHAR(100) NOT NULL,
  category                 VARCHAR(50)  NOT NULL,           -- 'Salud' | 'Mente' | 'Productividad'
  default_duration_minutes INT          NOT NULL DEFAULT 5,
  icon_identifier          VARCHAR(50),
  color_hex                VARCHAR(7),                       -- '#RRGGBB'
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Módulo 1: Hábitos activos del usuario ──────────────────────────
CREATE TABLE user_habits (
  id                      BIGSERIAL PRIMARY KEY,
  template_id             BIGINT REFERENCES habit_templates(id) ON DELETE SET NULL,
  name                    VARCHAR(100) NOT NULL,
  icon_identifier         VARCHAR(50),
  color_hex               VARCHAR(7),
  day_block               VARCHAR(20)  NOT NULL,            -- 'MORNING' | 'AFTERNOON' | 'EVENING'
  frequency_type          VARCHAR(20)  NOT NULL DEFAULT 'DAILY', -- 'DAILY' | 'WEEKDAYS' | 'CUSTOM'
  custom_days_mask        INT          NOT NULL DEFAULT 127,-- 7 bits; bit0=Lun ... bit6=Dom (ver 2.4)
  target_duration_minutes INT          NOT NULL DEFAULT 5,
  sort_order              INT          NOT NULL DEFAULT 0,
  is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Módulo 1: Logs diarios de ejecución ────────────────────────────
CREATE TABLE habit_logs (
  id                      BIGSERIAL PRIMARY KEY,
  user_habit_id           BIGINT NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  log_date                DATE   NOT NULL,
  status                  VARCHAR(20) NOT NULL,             -- 'COMPLETED' | 'SKIPPED' | 'PARTIAL'
  actual_duration_minutes INT    NOT NULL DEFAULT 0,
  completed_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_habit_day UNIQUE (user_habit_id, log_date)
);

-- ── Módulo 3: Registro diario de humor ─────────────────────────────
CREATE TABLE mood_logs (
  id           BIGSERIAL PRIMARY KEY,
  log_date     DATE NOT NULL,
  mood_score   INT  NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  journal_text VARCHAR(280),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_mood_day UNIQUE (log_date)    -- single-user: 1 registro por día
);

-- ── Módulo 3: Diccionario de etiquetas ─────────────────────────────
CREATE TABLE mood_tags (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(50) NOT NULL UNIQUE,
  category   VARCHAR(36),                          -- 'PHYSICAL_SYMPTOM' | 'EXTERNAL_TRIGGER'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Módulo 3: Relación N:M log↔tag ─────────────────────────────────
CREATE TABLE mood_log_tags (
  mood_log_id BIGINT NOT NULL REFERENCES mood_logs(id) ON DELETE CASCADE,
  tag_id      BIGINT NOT NULL REFERENCES mood_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (mood_log_id, tag_id)
);

-- ── Índices ────────────────────────────────────────────────────────
CREATE INDEX idx_user_habits_active   ON user_habits(is_active, day_block, sort_order);
CREATE INDEX idx_habit_logs_date      ON habit_logs(log_date DESC);
CREATE INDEX idx_habit_logs_habit     ON habit_logs(user_habit_id, log_date DESC);
CREATE INDEX idx_mood_logs_date       ON mood_logs(log_date DESC);

-- ── Triggers updated_at (reusan función existente) ─────────────────
CREATE TRIGGER update_habit_templates_updated_at BEFORE UPDATE ON habit_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_habits_updated_at BEFORE UPDATE ON user_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habit_logs_updated_at BEFORE UPDATE ON habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mood_logs_updated_at BEFORE UPDATE ON mood_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mood_tags_updated_at BEFORE UPDATE ON mood_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS permisiva (igual que el resto del repo) ────────────────────
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_log_tags   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON habit_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON user_habits     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON habit_logs      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mood_logs       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mood_tags       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON mood_log_tags   FOR ALL USING (true) WITH CHECK (true);
```

### 2.3 Vista de heatmap (densidad diaria de consistencia)

```sql
CREATE OR REPLACE VIEW v_habit_daily_completion
WITH (security_invoker = on) AS
SELECT
  log_date,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
  COUNT(*)                                     AS logged_count
FROM habit_logs
GROUP BY log_date;
```

> El % de consistencia "real" (completados / debidos) depende de qué hábitos tocaban ese día (ver 2.4). La vista entrega la densidad bruta; el cálculo de racha/heatmap pulido vive en la capa de queries (sección 6).

### 2.4 Convención de `custom_days_mask` (CRÍTICA — usarla idéntica en TS y Kotlin)
- 7 bits, **bit 0 = Lunes … bit 6 = Domingo**.
- "Hábito debido (due) hoy" =
  - `frequency_type = 'DAILY'` → siempre, **o**
  - `frequency_type = 'WEEKDAYS'` → Lun–Vie (bits 0–4), **o**
  - `frequency_type = 'CUSTOM'` → `(custom_days_mask >> weekdayIndex) & 1 == 1`, donde `weekdayIndex` = 0 para Lunes … 6 para Domingo.
- Defaults útiles: `127` = todos los días, `62` = L–V (`0b0011111`... ver nota), define las constantes una sola vez por capa.
- **Implementación de `weekdayIndex` desde una fecha:** en JS `(new Date(d).getDay() + 6) % 7` (getDay 0=Dom). En Kotlin `LocalDate.dayOfWeek.value - 1` (DayOfWeek 1=Mon).

### 2.5 Estados y rachas (definición exacta — Módulo 4)
- **Día "100%":** existe ≥1 hábito debido ese día **y** todos los hábitos debidos tienen `habit_logs.status = 'COMPLETED'`.
- **Racha (streak):** nº de días consecutivos 100% terminando en hoy (si hoy aún no está 100%, se permite que la racha termine ayer y siga "viva" hasta fin del día). Romper si un día debido quedó sin completar (vacío o `SKIPPED`).
- Días sin hábitos debidos (p.ej. fin de semana con todo en WEEKDAYS) **no rompen** la racha: son neutrales (se saltan en el conteo).

### 2.6 Seed inicial (incluir al final de la migración)

```sql
-- Plantillas base (Salud / Mente / Productividad)
INSERT INTO habit_templates (name, category, default_duration_minutes, icon_identifier, color_hex) VALUES
  ('Beber agua',        'Salud',         5,  'water',     '#3BA7FF'),
  ('Caminar',           'Salud',         20, 'walk',      '#34D399'),
  ('Estirar',           'Salud',         10, 'stretch',   '#22D3EE'),
  ('Meditar',           'Mente',         10, 'meditate',  '#A78BFA'),
  ('Journaling',        'Mente',         10, 'journal',   '#F472B6'),
  ('Lectura',           'Mente',         20, 'book',      '#FBBF24'),
  ('Deep work',         'Productividad', 50, 'focus',     '#F59E0B'),
  ('Planificar el día', 'Productividad', 10, 'plan',      '#60A5FA');

-- Tags de mood
INSERT INTO mood_tags (name, category) VALUES
  ('Insomnio',        'PHYSICAL_SYMPTOM'),
  ('Dolor de cabeza', 'PHYSICAL_SYMPTOM'),
  ('Fatiga',          'PHYSICAL_SYMPTOM'),
  ('Ansiedad',        'PHYSICAL_SYMPTOM'),
  ('Estrés laboral',  'EXTERNAL_TRIGGER'),
  ('Cafeína',         'EXTERNAL_TRIGGER'),
  ('Mala alimentación','EXTERNAL_TRIGGER'),
  ('Discusión',       'EXTERNAL_TRIGGER');

-- Set inicial de 3 hábitos (reemplaza al onboarding del Blueprint)
INSERT INTO user_habits (template_id, name, icon_identifier, color_hex, day_block, frequency_type, target_duration_minutes, sort_order)
SELECT id, name, icon_identifier, color_hex, 'MORNING',   'DAILY', default_duration_minutes, 0 FROM habit_templates WHERE name = 'Beber agua';
INSERT INTO user_habits (template_id, name, icon_identifier, color_hex, day_block, frequency_type, target_duration_minutes, sort_order)
SELECT id, name, icon_identifier, color_hex, 'MORNING',   'DAILY', default_duration_minutes, 1 FROM habit_templates WHERE name = 'Meditar';
INSERT INTO user_habits (template_id, name, icon_identifier, color_hex, day_block, frequency_type, target_duration_minutes, sort_order)
SELECT id, name, icon_identifier, color_hex, 'AFTERNOON', 'WEEKDAYS', default_duration_minutes, 0 FROM habit_templates WHERE name = 'Deep work';
```

### 2.7 Aplicación
- Aplicar contra Supabase con la herramienta/flujo de migraciones que el repo ya use (las migraciones de `/Users/thonyfd/supabase/migrations/` son las de producción).
- **Verificación:** las 6 tablas existen, RLS activa, seed presente (`SELECT count(*) FROM habit_templates` = 8, `mood_tags` = 8, `user_habits` = 3).

---

## 3. FASE 2 — Paquete de queries compartido

Crear dos archivos nuevos en `packages/supabase-queries/src/` y exportarlos. **Seguir el patrón de `monthly.ts` al pie de la letra.**

### 3.1 Tipos — añadir a `src/types.ts`

```ts
export type DayBlock = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type FrequencyType = 'DAILY' | 'WEEKDAYS' | 'CUSTOM';
export type HabitStatus = 'COMPLETED' | 'SKIPPED' | 'PARTIAL';

export interface HabitTemplate {
  id: number;
  name: string;
  category: string;
  defaultDurationMinutes: number;
  iconIdentifier: string | null;
  colorHex: string | null;
}

export interface UserHabit {
  id: number;
  templateId: number | null;
  name: string;
  iconIdentifier: string | null;
  colorHex: string | null;
  dayBlock: DayBlock;
  frequencyType: FrequencyType;
  customDaysMask: number;
  targetDurationMinutes: number;
  sortOrder: number;
  isActive: boolean;
}

export interface HabitLog {
  id: number;
  userHabitId: number;
  logDate: string;             // 'YYYY-MM-DD'
  status: HabitStatus;
  actualDurationMinutes: number;
}

export interface MoodTag {
  id: number;
  name: string;
  category: string | null;
}

export interface MoodLog {
  id: number;
  logDate: string;             // 'YYYY-MM-DD'
  moodScore: number;           // 1..5
  journalText: string | null;
  tagIds: number[];            // hidratado desde mood_log_tags
}

export interface HabitDayCompletion {
  logDate: string;
  completedCount: number;
  loggedCount: number;
}
```

### 3.2 `src/habits.ts` — funciones a implementar

Firmas (todas `(client: SupabaseClient, ...)`, devuelven Promesas, `if (error) throw error`, mappers snake→camel):

- `fetchHabitTemplates(client): Promise<HabitTemplate[]>`
- `fetchUserHabits(client, opts?: { activeOnly?: boolean }): Promise<UserHabit[]>` — order by `day_block`, `sort_order`.
- `createUserHabit(client, habit: Omit<UserHabit,'id'>): Promise<number>` — set `created_at`/`updated_at`.
- `updateUserHabit(client, id: number, updates: Partial<UserHabit>): Promise<void>` — patch parcial + `updated_at`.
- `deleteUserHabit(client, id: number): Promise<void>`.
- `fetchHabitLogsByDate(client, logDate: string): Promise<HabitLog[]>`.
- `fetchHabitLogsInRange(client, startDate: string, endDate: string): Promise<HabitLog[]>`.
- `upsertHabitLog(client, params: { userHabitId: number; logDate: string; status: HabitStatus; actualDurationMinutes?: number }): Promise<void>` — usar `.upsert(..., { onConflict: 'user_habit_id,log_date' })` (constraint `unique_habit_day`).
- `deleteHabitLog(client, userHabitId: number, logDate: string): Promise<void>` — para "desmarcar".
- `fetchDailyCompletion(client, startDate: string, endDate: string): Promise<HabitDayCompletion[]>` — desde `v_habit_daily_completion`.

**Helpers puros (exportar, sin `client`)** para reuso web/Android-doc/server:
- `isHabitDueOnDate(habit: UserHabit, date: string): boolean` — implementa la lógica de 2.4.
- `computeStreak(habits: UserHabit[], logs: HabitLog[], today: string): number` — implementa 2.5.
- `WEEKDAYS_MASK = 62`, `ALL_DAYS_MASK = 127`.

### 3.3 `src/mood.ts` — funciones a implementar

- `fetchMoodTags(client): Promise<MoodTag[]>`.
- `fetchMoodLogByDate(client, logDate: string): Promise<MoodLog | null>` — incluye `tagIds` (join a `mood_log_tags`).
- `fetchMoodLogsInRange(client, startDate, endDate): Promise<MoodLog[]>`.
- `upsertMoodLog(client, params: { logDate: string; moodScore: number; journalText?: string | null; tagIds: number[] }): Promise<number>` —
  1. upsert en `mood_logs` con `onConflict: 'log_date'`, devolver `id`;
  2. reemplazar tags: `delete from mood_log_tags where mood_log_id = id`, luego `insert` de `tagIds`.
- `deleteMoodLog(client, id: number): Promise<void>`.

### 3.4 Export barrel — `src/index.ts`
Añadir bloques `export type { ... } from './types.js'` y `export { ... } from './habits.js'` / `'./mood.js'` siguiendo el estilo existente (sección 1.2).

---

## 4. FASE 3 — Web dashboard

### 4.1 Data client — `web/dashboard/src/api/supabase-data-client.ts`
Añadir re-exports con `supabase` inyectado, p.ej.:
```ts
export const fetchUserHabits = (opts?: { activeOnly?: boolean }) => _fetchUserHabits(supabase, opts);
export const upsertHabitLog = (p: {...}) => _upsertHabitLog(supabase, p);
// ...idem para todas las de habits.ts y mood.ts + re-export de tipos.
```

### 4.2 Páginas nuevas (en `src/pages/`)
1. **`Timeline.tsx`** (ruta `/timeline`) — vista principal de hábitos del día:
   - Tres secciones colapsables por Day Block (Mañana/Tarde/Noche).
   - Cada hábito debido hoy = fila con check (toggle `upsertHabitLog`/`deleteHabitLog` → `COMPLETED`), nombre, icono/color, duración objetivo.
   - Barra de progreso del día (completados / debidos) + chip de **racha** (`computeStreak`).
   - Botón "Focus" por hábito → modal **Focus Timer** (cronómetro/cuenta regresiva; al terminar guarda `actualDurationMinutes` y status `COMPLETED`).
   - React Query keys: `['user-habits']`, `['habit-logs', date]`. Invalidar al togglear.
2. **`Habits.tsx`** (ruta `/habits`) — CRUD de hábitos:
   - Lista de hábitos activos/inactivos; crear desde plantilla (`fetchHabitTemplates`) o custom.
   - Form: nombre, day_block, frequency_type, selector de días (custom mask), duración, color/icono.
   - Mutaciones `createUserHabit`/`updateUserHabit`/`deleteUserHabit`.
3. **`Mood.tsx`** (ruta `/mood`) — registro de hoy + historial:
   - Mood picker 1–5 (emojis), textarea ≤280 (contador), multiselect de `mood_tags` agrupados por categoría.
   - `upsertMoodLog`; precargar el log de hoy si existe.
   - Mini-historial: últimos 14 días con su score.
4. **Heatmap** — componente `HabitHeatmap.tsx` (en `src/components/`) reusable; cuadrícula mensual coloreada por `completedCount/loggedCount` desde `fetchDailyCompletion`. Embeberlo en `Timeline.tsx` o `Overview.tsx`.

### 4.3 Registro en `App.tsx`
- Imports de las 3 páginas.
- `<Link>` en `.menu-links` (~L90): "Timeline", "Hábitos", "Mood".
- `<Route>` de cada una envuelta en `<ProtectedRoute>` (~L169).

### 4.4 Estilo
Seguir Brand Book (dark/futurista, variables `--c-*`). CSS co-localizado por página (`Timeline.css`, etc.) como hace `MonthlyControl.css`.

### 4.5 Aceptación web
- Togglear un hábito persiste y se refleja al recargar; la racha sube/baja correctamente.
- Mood de hoy se guarda con tags y se reabre precargado.
- Heatmap pinta el mes actual sin errores de consola.
- `npm run build` (o el script del repo) compila sin errores de tipos.

---

## 5. FASE 4 — Android (Compose)

### 5.1 Modelos — `data/models/` (nuevos, `@Serializable`, `@SerialName` snake_case)
`HabitTemplateRow`, `UserHabitRow`, `HabitLogRow`, `MoodLogRow`, `MoodTagRow`. Espejo de las columnas DB (`@SerialName("day_block")`, etc.).

### 5.2 Repos — `data/repository/`
- **`HabitRepository.kt`** — calca `FinanceRepository`:
  - `getHabitsForToday(): List<UserHabitRow>` (filtra `is_active` y "due today" con la lógica 2.4 en Kotlin).
  - `getLogsForDate(date)`, `toggleHabitLog(habitId, date, status, minutes)` (upsert sobre `unique_habit_day`), `getDailyCompletion(start, end)`, `computeStreak(...)`.
  - CRUD: `createHabit`, `updateHabit`, `deleteHabit`.
- **`MoodRepository.kt`** — `getMoodForDate(date)`, `upsertMood(...)` (+ tags N:M), `getMoodTags()`, `getMoodRange(start,end)`.

### 5.3 Pantallas — `ui/`
- **`TimelineScreen.kt`** — equivalente Compose de la web (Day Blocks, checks, progreso, racha, Focus Timer con `LaunchedEffect`/timer).
- **`HabitsScreen.kt`** — CRUD con diálogos (patrón de diálogos de `MonthlyControlScreen.kt`).
- **`MoodScreen.kt`** — picker + journaling + tags.

### 5.4 Navegación — `ui/MainActivity.kt`
- Actualmente `selectedTab` (Int) con `when (selectedTab) { 0 -> DashboardTab(...) 1 -> MonthlyControlScreen(...) }` y `BottomNavigationBar` con 2 ítems (~L87–L160).
- Añadir ítems/índices (p.ej. `2 -> TimelineScreen`, `3 -> MoodScreen`). Si la barra queda con muchos ítems, agrupar Finanzas vs Azton o usar un menú; decisión menor de UX — mantener consistencia visual.

### 5.5 Aceptación Android
- App compila (`./gradlew assembleDebug`).
- Toggles de hábito y registro de mood persisten en Supabase (verificable desde la web — comparten DB).

---

## 6. FASE 5 — Widget "Hábitos Hoy" (Glance)

Replicar el patrón `PaymentsWidget` (5 archivos + manifest + xml). Referencias:
[`PaymentsWidgetStateStore.kt`](../../android/app/src/main/java/com/thonyfd/financedashboard/widget/PaymentsWidgetStateStore.kt),
[`PaymentsWidgetReceiver.kt`](../../android/app/src/main/java/com/thonyfd/financedashboard/widget/PaymentsWidgetReceiver.kt),
[`FinanceWidgetWorker.kt`](../../android/app/src/main/java/com/thonyfd/financedashboard/widget/FinanceWidgetWorker.kt).

### 6.1 Archivos nuevos (en `widget/`)
1. **`HabitsWidget.kt`** — `GlanceAppWidget`. Muestra: fecha, racha actual, lista de hábitos debidos hoy con su estado (✓/○), contador "X/Y completados". Acción de refresh (`HabitsWidget`/worker). Opcional: tap en un hábito → action que togglea (si se complica, dejar solo lectura + tap abre la app en TimelineScreen).
2. **`HabitsWidgetStateStore.kt`** — DataStore `name = "habits_widget_state"`. `data class HabitsWidgetData(lastUpdated, streak, items: List<...>, completedCount, dueCount)`. `saveWidgetData`, `loadWidgetData`, `invalidateCache` (mismo patrón de serialización JSON a `List<List<String>>`).
3. **`HabitsWidgetReceiver.kt`** — `GlanceAppWidgetReceiver` con `glanceAppWidget = HabitsWidget()`; en `onEnabled/onUpdate/onReceive(BOOT)` llamar al worker (ver 6.2).

### 6.2 Worker
Opción simple y consistente: **extender `FinanceWidgetWorker.doWork()`** para que, además de los widgets de finanzas, consulte `HabitRepository` y haga `HabitsWidgetStateStore.saveWidgetData(...)` + `HabitsWidget().updateAll(context)`. Así reusa el `PeriodicWorkRequest` de 30 min ya programado. (Alternativa: worker dedicado, pero no hace falta.)

### 6.3 Registro
- **`AndroidManifest.xml`** — añadir un tercer `<receiver android:name=".widget.HabitsWidgetReceiver">` con `APPWIDGET_UPDATE` + `<meta-data android:name="android.appwidget.provider" android:resource="@xml/habits_widget_info" />` (calcar el bloque de `PaymentsWidgetReceiver`, ~L40–L50).
- **`res/xml/habits_widget_info.xml`** — copiar `payments_widget_info.xml`, cambiar `android:description="@string/habits_widget_description"`.
- **`res/values/strings.xml`** — añadir `habits_widget_description`.

### 6.4 Aceptación widget
- El widget se puede añadir al home, muestra hábitos de hoy y la racha, y se refresca con el worker (inmediato al activar + periódico).

---

## 7. Orden de entrega y verificación por capa

Implementar y validar **en este orden** (cada fase depende de la anterior):

1. **DB** (Fase 1) → verificar tablas + seed (2.7).
2. **Queries** (Fase 2) → `npm run build`/typecheck del paquete; smoke test de una query contra Supabase.
3. **Web** (Fase 3) → criterios 4.5.
4. **Android** (Fase 4) → criterios 5.5.
5. **Widget** (Fase 5) → criterios 6.4.

Se puede frenar después de cualquier fase y tener algo funcional (DB+Queries+Web ya es un producto usable).

---

## 8. Checklist de archivos a crear/editar

**Crear:**
- `packages/sql/migrations/008_add_habits_and_mood.sql`
- `/Users/thonyfd/supabase/migrations/20260626000001_add_habits_and_mood.sql` (idéntico)
- `packages/supabase-queries/src/habits.ts`
- `packages/supabase-queries/src/mood.ts`
- `web/dashboard/src/pages/Timeline.tsx` (+ `.css`)
- `web/dashboard/src/pages/Habits.tsx` (+ `.css`)
- `web/dashboard/src/pages/Mood.tsx` (+ `.css`)
- `web/dashboard/src/components/HabitHeatmap.tsx`
- `android/.../data/models/` → `HabitModels.kt`, `MoodModels.kt`
- `android/.../data/repository/HabitRepository.kt`, `MoodRepository.kt`
- `android/.../ui/TimelineScreen.kt`, `HabitsScreen.kt`, `MoodScreen.kt`
- `android/.../widget/HabitsWidget.kt`, `HabitsWidgetStateStore.kt`, `HabitsWidgetReceiver.kt`
- `android/.../res/xml/habits_widget_info.xml`

**Editar:**
- `packages/supabase-queries/src/types.ts` (tipos nuevos)
- `packages/supabase-queries/src/index.ts` (exports)
- `web/dashboard/src/api/supabase-data-client.ts` (re-exports)
- `web/dashboard/src/App.tsx` (imports + links + routes)
- `android/.../ui/MainActivity.kt` (tabs)
- `android/.../widget/FinanceWidgetWorker.kt` (refrescar HabitsWidget)
- `android/app/src/main/AndroidManifest.xml` (receiver)
- `android/app/src/main/res/values/strings.xml` (string del widget)

---

## 9. Reglas para el implementador (Codex)
- **No introducir multiusuario ni auth.** Si algo "pide" `user_id`, omitirlo.
- **No añadir IA** en esta entrega.
- Calcar firmas/estilo de `monthly.ts`, `FinanceRepository.kt` y `PaymentsWidget*` — no inventar abstracciones nuevas.
- `custom_days_mask` (2.4) y la definición de racha (2.5) deben ser **idénticas** en TS y Kotlin.
- Respetar el Brand Book en todo lo visual.
- Mantener los dos archivos de migración SQL idénticos.
```
