# Skins Phase 1: Tokens and Skin Mechanism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every surface (web, Android app, each widget kind) reads its colors from semantic tokens selected by a per-surface skin + mode setting, shipping only the Brand skin (dark, unchanged; light, new) plus the pickers.

**Architecture:** Web: semantic CSS custom properties in one `tokens.css`, switched by `data-skin` and `data-variant` attributes on `<html>` that a small React provider (and a pre-paint inline script) sets from `localStorage`. Android app: a `SkinTokens` data class per skin/variant provided through a `CompositionLocal`, chosen from SharedPreferences exposed as a `StateFlow`. Widgets: same `SkinTokens`, resolved per `WidgetKind` from `WidgetAppearancePreferences`, using Glance day/night `ColorProvider` for `system` mode.

**Tech Stack:** React 18 + Vite + plain CSS, Vitest (root `vitest.config.ts`, node env); Kotlin, Jetpack Compose Material3, Glance 1.1.1, JUnit 4.

**Spec:** `docs/superpowers/specs/2026-11-09-skins-design.md` (Phase 1 of "Phasing"). Nothing, Glass and the custom font get their own plans.

## Global Constraints

- Skin ids: `brand | nothing | glass`. Only `brand` is selectable in this phase; the other two are typed but hidden from pickers.
- Mode ids: `system | light | dark`. Default skin `brand`, default mode `dark`.
- UI copy (Spanish, exact): section "Apariencia"; mode label "Modo"; options "Sistema", "Claro", "Oscuro"; skin option "Brand"; widget entry "Widgets"; widget rows "Dashboard financiero", "Pagos próximos", "Hábitos de hoy"; widget confirm button "Guardar".
- Public surfaces always render Brand dark: web paths `/`, `/login`, `/terms`, `/privacy`; Android `LoginScreen`.
- Brand dark on web and app must stay visually equivalent to today. Widgets intentionally move to the Brand Book palette.
- Contrast: text tokens vs their background >= 4.5:1; accent/positive/negative/warning vs background >= 3:1 (large text, KPIs). Both variants.
- Web alpha variants use `color-mix(in srgb, var(--token) N%, transparent)`, never new hex/rgba literals.
- No em dash characters anywhere. Repo is public: no personal data in fixtures.
- Android/web parity: every user-facing behavior lands on both.

## Review Focus

1. `localStorage` throwing (private mode) or holding garbage (`"neon"`, `null`, JSON) must fall back to `brand` + `dark`, not crash or blank the page. Test in Task 1.
2. Sign-out or visiting `/login`, `/terms`, `/privacy`, `/` while a light skin is chosen must show Brand dark; returning to a signed-in route restores the choice. Test in Task 1 (`isPublicPath`), manual check in Task 4.
3. A non-owner opening the widget dialog sees only "Hábitos de hoy". Test in Task 9.
4. Charts (Recharts) re-color immediately when skin or mode changes, without reload. Manual check in Task 3 and Task 5.
5. A widget in `system` mode follows the phone's night mode switch without waiting for a data refresh (day/night `ColorProvider`). Manual check in Task 8.

---

## Web

### Task 1: Appearance model (pure logic)

**Files:**
- Create: `web/dashboard/src/theme/appearance.ts`
- Test: `web/dashboard/src/theme/appearance.test.ts`

**Interfaces:**
- Produces:
  - `type Skin = 'brand' | 'nothing' | 'glass'`, `type Mode = 'system' | 'light' | 'dark'`, `type Variant = 'light' | 'dark'`
  - `interface Appearance { skin: Skin; mode: Mode }`
  - `const DEFAULT_APPEARANCE: Appearance = { skin: 'brand', mode: 'dark' }`
  - `const SELECTABLE_SKINS: readonly Skin[] = ['brand']`
  - `const STORAGE_KEY = 'appearance.v1'`
  - `loadAppearance(storage: Pick<Storage, 'getItem'> | null): Appearance`
  - `saveAppearance(storage: Pick<Storage, 'setItem'> | null, a: Appearance): void` (swallows exceptions)
  - `resolveVariant(mode: Mode, prefersDark: boolean): Variant`
  - `isPublicPath(pathname: string): boolean`
  - `effectiveAppearance(a: Appearance, pathname: string, prefersDark: boolean): { skin: Skin; variant: Variant }` (public path forces `brand`/`dark`)

- [ ] **Step 1: Write failing tests** in `appearance.test.ts`:
  - `loadAppearance(null)` equals `DEFAULT_APPEARANCE`.
  - storage whose `getItem` throws returns `DEFAULT_APPEARANCE`.
  - stored `'not json'`, `'null'`, `'{"skin":"neon","mode":"dark"}'`, `'{"skin":"brand","mode":"sepia"}'` each return `DEFAULT_APPEARANCE` for the invalid field only (e.g. `{"skin":"brand","mode":"sepia"}` gives `{skin:'brand', mode:'dark'}`).
  - stored `'{"skin":"brand","mode":"light"}'` round-trips.
  - a stored skin not in `SELECTABLE_SKINS` (e.g. `"glass"`) falls back to `'brand'`.
  - `saveAppearance` with throwing `setItem` does not throw.
  - `resolveVariant('system', true) === 'dark'`, `resolveVariant('system', false) === 'light'`, `resolveVariant('light', true) === 'light'`, `resolveVariant('dark', false) === 'dark'`.
  - `isPublicPath` true for `'/'`, `'/login'`, `'/terms'`, `'/privacy'`, `'/login/'`; false for `'/finance/overview'`, `'/azton/habits'`.
  - `effectiveAppearance({skin:'brand',mode:'light'}, '/login', false)` equals `{skin:'brand', variant:'dark'}`; same input on `'/azton/mood'` equals `{skin:'brand', variant:'light'}`.

- [ ] **Step 2: Run, expect FAIL** (module not found): `npx vitest run web/dashboard/src/theme/appearance.test.ts`
- [ ] **Step 3: Implement** `appearance.ts` with the signatures above. Validation per field against the literal unions; trailing slash normalized in `isPublicPath`.
- [ ] **Step 4: Run, expect PASS:** same command.
- [ ] **Step 5: Commit** `feat(web): appearance model for skins and mode`

### Task 2: Semantic tokens, Brand dark and light, contrast test

**Files:**
- Create: `web/dashboard/src/theme/tokens.css`
- Create: `web/dashboard/src/theme/contrast.ts`
- Test: `web/dashboard/src/theme/tokens.test.ts`
- Modify: `web/dashboard/src/index.css` (remove the `:root` palette block; import `./theme/tokens.css` first; keep the Google Fonts import)

**Interfaces:**
- Produces CSS custom properties (all on `:root` = Brand dark, overridden under `:root[data-variant="light"]` for Brand light, and both scoped so later skins add `:root[data-skin="nothing"]...`):
  - Existing names kept so current CSS keeps working: `--c-primary`, `--c-green`, `--c-violet`, `--c-glow`, `--c-white`, `--c-bg`, `--c-surface`, `--c-surface-2`, `--c-muted`, `--c-border`, `--c-border-violet`, `--c-text`, `--c-text-2`, `--c-text-3`, `--f-heading`, `--f-body`, `--r-sm..xl` (dark values exactly as today in `index.css`).
  - New: `--c-surface-raised` (`#17223A`), `--c-hairline` (`#1F2B45`), `--c-negative` (`#FF6B81`), `--c-warning` (`#FFC069`), `--c-on-accent` (`#081022`), `--c-chart-1` .. `--c-chart-8` (dark: `#00D9FF #39FF14 #7A5CFF #FF6B81 #FFC069 #E8FFFF #5E677A #00A3BF`).
  - Brand light starting values (test is the authority; adjust the minimum needed if a contrast assertion fails): bg `#F4FAFC`, surface `#FFFFFF`, surface-2 `#EAF2F6`, surface-raised `#E2ECF2`, hairline `#D3DEE6`, text `#081022`, text-2 `#3E4A5E`, text-3 `#5E677A`, muted `#5E677A`, primary `#007C99`, green `#2A8C0F`, violet `#5B3FE0`, negative `#C8304A`, warning `#9A5B00`, on-accent `#FFFFFF`, glow `#081022`, chart-1..8 `#007C99 #2A8C0F #5B3FE0 #C8304A #9A5B00 #081022 #5E677A #00A3BF`. `--c-border` light = `color-mix(in srgb, #007C99 18%, transparent)`.
  - `contrast.ts`: `contrastRatio(hexA: string, hexB: string): number` (WCAG 2.x relative luminance) and `parseTokenBlock(css: string, selector: string): Record<string, string>`.

- [ ] **Step 1: Write failing test** `tokens.test.ts`: reads `tokens.css` with `fs`, parses the `:root` and `:root[data-variant="light"]` blocks, and for each variant asserts:
  - `contrastRatio(--c-text, --c-bg) >= 4.5`, `(--c-text-2, --c-bg) >= 4.5`, `(--c-text, --c-surface) >= 4.5`, `(--c-text-3, --c-bg) >= 3`
  - `(--c-primary | --c-green | --c-negative | --c-warning, --c-bg) >= 3`
  - `(--c-on-accent, --c-primary) >= 4.5`
  - every name in the dark block exists in the light block (no token missing in a variant).
  Plus `contrastRatio('#000000', '#FFFFFF')` ≈ 21 and `contrastRatio('#777777','#777777') === 1`. Hex-only values are compared; `--c-text-2/3` in dark are rgba today, so the test composites rgba over `--c-bg` (implement `contrastRatio` accepting `rgba(...)` composited on the second argument).
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run web/dashboard/src/theme/tokens.test.ts`
- [ ] **Step 3: Implement** `contrast.ts`, write `tokens.css`, switch `index.css` to import it.
- [ ] **Step 4: Run, expect PASS.** Then `cd web/dashboard && npm run build` succeeds.
- [ ] **Step 5: Commit** `feat(web): semantic tokens with brand light and contrast checks`

### Task 3: Appearance provider, pre-paint script, chart colors hook

**Files:**
- Create: `web/dashboard/src/theme/AppearanceContext.tsx`
- Modify: `web/dashboard/index.html` (inline script in `<head>` before the module script)
- Modify: `web/dashboard/src/main.tsx` (wrap app in `AppearanceProvider`; it must sit inside the router so it can read `location`, so put it in `App.tsx` inside `BrowserRouter` if `main.tsx` is outside the router)

**Interfaces:**
- Consumes: Task 1 functions.
- Produces:
  - `AppearanceProvider({ children })`: holds `Appearance` state (initial `loadAppearance(safeLocalStorage())`), listens to `matchMedia('(prefers-color-scheme: dark)')` change, computes `effectiveAppearance(...)` from `useLocation().pathname`, and sets `document.documentElement.dataset.skin` and `.dataset.variant` in a layout effect. Also sets `<meta name="color-scheme">` content to the variant.
  - `useAppearance(): { appearance: Appearance; setAppearance(a: Appearance): void; variant: Variant }` (setAppearance saves and applies immediately).
  - `useChartColors(): { series: string[]; text: string; grid: string; tooltipBg: string }` read via `getComputedStyle(document.documentElement)` from `--c-chart-1..8`, `--c-text-2`, `--c-hairline`, `--c-surface`; recomputed when `skin` or `variant` changes.
- Inline script: reads `localStorage['appearance.v1']` in try/catch, validates against the same literals, applies Brand dark on public paths, sets `data-skin`/`data-variant`. Keep under 20 lines; comment that it mirrors `appearance.ts`.

- [ ] **Step 1: Implement** the provider, hook and script.
- [ ] **Step 2: Verify:** `cd web/dashboard && npm run build` passes. `npm run dev`, set `localStorage['appearance.v1']='{"skin":"brand","mode":"light"}'` in devtools, reload an `/azton/habits` route: `<html data-variant="light">` from first paint (no dark flash in a throttled reload). On `/login`: `data-variant="dark"`.
- [ ] **Step 3: Commit** `feat(web): appearance provider and pre-paint skin script`

### Task 4: Apariencia section in the menu drawer

**Files:**
- Create: `web/dashboard/src/components/AppearanceSettings.tsx`, `web/dashboard/src/components/AppearanceSettings.css`
- Modify: `web/dashboard/src/App.tsx` (render `<AppearanceSettings />` in the drawer between `menu-links` and `menu-footer`)

**Interfaces:**
- Consumes: `useAppearance()`, `SELECTABLE_SKINS`.
- Renders: label "Apariencia"; a skin option per `SELECTABLE_SKINS` with a small swatch (bg, surface, accent of that skin); a "Modo" segmented control with "Sistema", "Claro", "Oscuro". Uses only tokens. Accessible: radio-group semantics, visible focus.

- [ ] **Step 1: Implement** component and CSS.
- [ ] **Step 2: Verify manually:** choosing "Claro" restyles instantly; reload keeps it; sign out shows the home/login in Brand dark; sign in returns to light. Visible for owner and non-owner.
- [ ] **Step 3: Commit** `feat(web): appearance picker in menu drawer`

### Task 5: Replace hardcoded colors, finance pages

**Files:**
- Modify: `web/dashboard/src/pages/{Overview,CashFlow,MonthlyControl,Recurring,Goals,Budgets,Reports,Exports,Charts,Transactions,Merchants,Categories,SystemHealth}.tsx`, `web/dashboard/src/pages/MonthlyControl.css`, `web/dashboard/src/components/{AlertBanner,TransactionDetailModal}.tsx` and `AlertBanner.css`

**Rules (apply to every file in Tasks 5 to 7):**
- Every hex/rgb/rgba literal becomes `var(--c-…)` or `color-mix(...)` of a token. Map to the visually nearest existing token; add a new token to `tokens.css` (both variants, passing Task 2's test) only when no existing token is close. Inline `style={{ color: '#...' }}` becomes `style={{ color: 'var(--c-…)' }}`.
- Recharts props (`fill`, `stroke`, `Cell`, `Tooltip contentStyle`, axis `tick`) come from `useChartColors()`.
- Semantics hold: expenses use `--c-negative`, income/progress `--c-green`.

- [ ] **Step 1: Capture "before" screenshots** of each listed page (owner account, desktop and ~390px width) into the scratchpad, on current `development`.
- [ ] **Step 2: Refactor** the files.
- [ ] **Step 3: Verify no literals remain:** `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" <files>` returns nothing (emoji/hash in strings excepted; review hits). `npx vitest run web/dashboard/src/theme` and `cd web/dashboard && npm run build` pass.
- [ ] **Step 4: Compare "after" screenshots** in Brand dark against "before": visually equivalent. Then switch to "Claro" and check each page is readable and charts re-color without reload.
- [ ] **Step 5: Commit** `refactor(web): finance pages use semantic tokens`

### Task 6: Replace hardcoded colors, Azton pages and shared CSS

**Files:**
- Modify: `web/dashboard/src/pages/{Timeline,Habits,Mood}.tsx` and `.css`, `web/dashboard/src/components/HabitHeatmap.tsx`, `web/dashboard/src/App.css`, `web/dashboard/src/components/{NotificationSettings,SignOut}.css` and `.tsx`

- [ ] Steps 1 to 5 as Task 5 (rules from Task 5), commit `refactor(web): azton pages and shell use semantic tokens`.

### Task 7: Public pages pinned to Brand dark

**Files:**
- Modify: `web/dashboard/src/pages/{HomePage,Login,PrivacyPolicy,TermsOfService}.tsx` only if they contain literals that break when tokens change (they always render with `:root` dark values because of Task 3; no refactor needed otherwise).

- [ ] **Step 1: Verify** with appearance set to light: `/`, `/login`, `/terms`, `/privacy` look exactly like before (screenshots).
- [ ] **Step 2: Commit** only if changes were needed: `fix(web): public pages stay brand dark`.

---

## Android

### Task 8: SkinTokens, Brand palettes, app theme wiring

**Files:**
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/ui/theme/Skin.kt`
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/ui/theme/AppearancePreferences.kt`
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/theme/Theme.kt`
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/MainActivity.kt` (theme wrapping only)
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/ui/theme/SkinTest.kt`

**Interfaces:**
- Produces in `Skin.kt`:
  - `enum class Skin(val key: String) { BRAND("brand"), NOTHING("nothing"), GLASS("glass"); companion object { val SELECTABLE = listOf(BRAND); fun fromKey(key: String?): Skin } }` (unknown or non-selectable gives `BRAND`)
  - `enum class ThemeMode(val key: String) { SYSTEM("system"), LIGHT("light"), DARK("dark"); companion object { fun fromKey(key: String?): ThemeMode } }` (unknown gives `DARK`)
  - `fun resolveDark(mode: ThemeMode, systemDark: Boolean): Boolean`
  - `data class SkinTokens(val bg: Color, val surfaceLow: Color, val surface: Color, val surfaceRaised: Color, val hairline: Color, val text: Color, val textSecondary: Color, val textPassive: Color, val accent: Color, val onAccent: Color, val positive: Color, val negative: Color, val warning: Color, val depth: Color, val chart: List<Color>, val isDark: Boolean)`
  - `val BrandDark: SkinTokens` = today's `AppColors` (bg Night, surfaceLow Deep, surface Panel, surfaceRaised PanelHigh, hairline Hairline, text Ice, textSecondary Mist, textPassive Dim, accent Cyan, onAccent Night, positive Lime, negative Coral, warning Amber, depth Violet).
  - `val BrandLight: SkinTokens` = the web Brand light values from Task 2 (bg `#F4FAFC`, surfaceLow `#EAF2F6`, surface `#FFFFFF`, surfaceRaised `#E2ECF2`, hairline `#D3DEE6`, text `#081022`, textSecondary `#3E4A5E`, textPassive `#5E677A`, accent `#007C99`, onAccent `#FFFFFF`, positive `#2A8C0F`, negative `#C8304A`, warning `#9A5B00`, depth `#5B3FE0`). Keep in sync with any adjustments made in Task 2.
  - `fun tokensFor(skin: Skin, dark: Boolean): SkinTokens` (only BRAND has palettes this phase)
  - `fun contrastRatio(a: Color, b: Color): Double`
- Produces in `AppearancePreferences.kt`: `object AppearancePreferences { fun state(context: Context): StateFlow<Pair<Skin, ThemeMode>>; fun set(context: Context, skin: Skin, mode: ThemeMode) }`, SharedPreferences `app_appearance`, keys `skin`, `mode`.
- Produces in `Theme.kt`:
  - `val LocalSkinTokens = staticCompositionLocalOf { BrandDark }`
  - `object AppTheme { val colors: SkinTokens @Composable @ReadOnlyComposable get() }`
  - `@Composable fun FinanceDashboardTheme(tokens: SkinTokens = BrandDark, content: @Composable () -> Unit)` building the Material `ColorScheme` from tokens (`darkColorScheme` or `lightColorScheme` by `tokens.isDark`, same role mapping as today's `DarkColorScheme`).
  - `@Composable fun AppearanceTheme(content: @Composable () -> Unit)` collects `AppearancePreferences.state`, resolves with `isSystemInDarkTheme()`, calls `FinanceDashboardTheme(tokensFor(...))`. Also sets status/navigation bar icon appearance for light variants.
  - `AppColors` object removed at the end of Task 9; in this task it stays so the app compiles.
- `MainActivity`: outer `FinanceDashboardTheme()` (Brand dark, covers `LoginScreen`); inside the `LoginGate` signed-in lambda, wrap `AppRoot` in `AppearanceTheme { }`.

- [ ] **Step 1: Write failing tests** `SkinTest.kt`:
  - `Skin.fromKey(null) == BRAND`, `fromKey("neon") == BRAND`, `fromKey("glass") == BRAND` (not selectable yet), `fromKey("brand") == BRAND`.
  - `ThemeMode.fromKey(null) == DARK`, `fromKey("sepia") == DARK`, `fromKey("system") == SYSTEM`.
  - `resolveDark(SYSTEM, true)`, `!resolveDark(SYSTEM, false)`, `!resolveDark(LIGHT, true)`, `resolveDark(DARK, false)`.
  - For `BrandDark` and `BrandLight`: `contrastRatio(text, bg) >= 4.5`, `(textSecondary, bg) >= 4.5`, `(text, surface) >= 4.5`, `(accent|positive|negative|warning, bg) >= 3.0`, `(onAccent, accent) >= 4.5`, `chart.size >= 8`.
- [ ] **Step 2: Run, expect FAIL:** `cd android && ./gradlew :app:testDebugUnitTest --tests '*SkinTest*'`
- [ ] **Step 3: Implement** the three files and the MainActivity wrapping.
- [ ] **Step 4: Run, expect PASS**, then `./gradlew :app:assembleDebug` succeeds.
- [ ] **Step 5: Commit** `feat(android): skin tokens, brand light and appearance theme`

### Task 9: Migrate app call sites to tokens, Apariencia in drawer

**Files:**
- Modify: `ui/{AppComponents,AppMenu,CategoryDetailScreen,HabitsScreen,MainActivity,MonthlyControlScreen,MoodScreen,TimelineScreen}.kt`
- Delete: `ui/TimelineColors.kt` (its uses move to `AppTheme.colors`)
- Modify: `ui/theme/Theme.kt` (remove `AppColors` once unused; `LoginScreen.kt` keeps Brand dark by reading `AppTheme.colors` under the outer theme)
- Create: `ui/AppearanceDialog.kt`

**Interfaces:**
- Consumes: `AppTheme.colors`, `AppearancePreferences`, `Skin.SELECTABLE`, `ThemeMode`.
- Mapping: `AppColors.Night->bg`, `Deep->surfaceLow`, `Panel->surface`, `PanelHigh->surfaceRaised`, `Hairline->hairline`, `Ice->text`, `Mist->textSecondary`, `Dim->textPassive`, `Cyan->accent`, `Lime->positive`, `Violet->depth`, `Coral->negative`, `Amber->warning`. Raw `Color(0x...)` in these files map to the nearest token. Inside `DrawScope`/non-composable lambdas, read `AppTheme.colors` into a local `val` before the lambda.
- `AppearanceDialog(onDismiss: () -> Unit)`: "Apariencia" title, skin options from `Skin.SELECTABLE` with swatches, "Modo" with "Sistema" / "Claro" / "Oscuro". Applies instantly via `AppearancePreferences.set`.
- `AppMenuDrawer(drawerState, isOwner: Boolean, content)`: new item "Apariencia" (opens `AppearanceDialog`) above "Cerrar sesión". `MainActivity` passes `isOwner`. (Task 10 adds the "Widgets" item.)

- [ ] **Step 1: Migrate** call sites; delete `TimelineColors.kt`; remove `AppColors`.
- [ ] **Step 2: Verify:** `grep -rn "AppColors\|Color(0x" android/app/src/main/java/com/thonyfd/financedashboard/ui` only hits `ui/theme/Skin.kt`. `./gradlew :app:testDebugUnitTest :app:assembleDebug` passes.
- [ ] **Step 3: Verify on device** (`adb install`): before/after screenshots of each tab in Brand dark are visually equivalent; "Claro" restyles instantly and survives restart; "Sistema" follows the phone toggle; sign-out shows `LoginScreen` in Brand dark.
- [ ] **Step 4: Commit** `refactor(android): screens read skin tokens; apariencia in drawer`

### Task 10: Widget skin and mode per kind, dialog in drawer, Brand Book palette

**Files:**
- Modify: `widget/WidgetAppearancePreferences.kt`
- Create: `widget/WidgetTokens.kt`
- Create: `ui/WidgetAppearanceDialog.kt` (moved out of `MainActivity.kt`, which loses the top-bar widgets button, `showWidgetAppearance` state and the old private dialog)
- Modify: `ui/AppMenu.kt` (add "Widgets" drawer item, below "Apariencia", opening `WidgetAppearanceDialog(isOwner, ...)`)
- Modify: `widget/{FinanceWidget,PaymentsWidget,HabitsWidget,WidgetNotAvailable}.kt`
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/widget/WidgetAppearanceTest.kt`

**Interfaces:**
- Consumes: `Skin`, `ThemeMode`, `tokensFor`, `BrandDark`, `BrandLight`.
- Produces:
  - `enum class WidgetKind(val preferenceKey: String, val skinKey: String, val modeKey: String, val label: String, val ownerOnly: Boolean)` with `FINANCE("finance_opacity","finance_skin","finance_mode","Dashboard financiero",true)`, `PAYMENTS("payments_opacity","payments_skin","payments_mode","Pagos próximos",true)`, `HABITS("habits_opacity","habits_skin","habits_mode","Hábitos de hoy",false)`.
  - `fun visibleWidgetKinds(isOwner: Boolean): List<WidgetKind>`
  - `WidgetAppearancePreferences.getSkin(context, kind): Skin`, `setSkin(...)`, `getMode(context, kind): ThemeMode`, `setMode(...)` (defaults `BRAND`, `DARK`; parse via `fromKey`).
  - `class WidgetColors(...)` in `WidgetTokens.kt` exposing Glance `ColorProvider`s for the same semantic names as `SkinTokens` (`bg`, `surface`, `text`, `textSecondary`, `accent`, `positive`, `negative`, `warning`, `depth`, `hairline`).
  - `fun widgetColors(skin: Skin, mode: ThemeMode, backgroundOpacity: Float): WidgetColors`: `SYSTEM` uses Glance day/night `ColorProvider(day = light token, night = dark token)`; `LIGHT`/`DARK` use the single variant. Opacity applies to `bg` only.
  - `WidgetAppearanceDialog(isOwner: Boolean, onDismiss: () -> Unit, onSaved: () -> Unit)`: one row per `visibleWidgetKinds(isOwner)` with opacity slider (existing `WidgetOpacitySlider`, moved along), skin selector (`Skin.SELECTABLE`), mode selector. Confirm button "Guardar" writes all three per kind then `refreshAll()`; success toast "Apariencia de widgets actualizada".
- Widget palette mapping (Brand Book): `#1A1A2E`/`#16213E`/`#0D1826`/`#1E1440` -> `bg`/`surface`; `#00D4AA` -> `accent`; `#FF6B6B`/`#FF5C7A` -> `negative`; `#4CAF50` -> `positive`; `#FFB347` -> `warning`; `#805AD5` -> `depth`; `#FFFFFF`/`#E8FFFF` -> `text`; `#AAAAAA`/`#8A94A8`/`#888888` -> `textSecondary`; `#666666`/`#555555` -> `textPassive` (add `textPassive` to `WidgetColors`).

- [ ] **Step 1: Write failing tests** `WidgetAppearanceTest.kt`:
  - `visibleWidgetKinds(false) == listOf(HABITS)`; `visibleWidgetKinds(true) == listOf(FINANCE, PAYMENTS, HABITS)`.
  - Each `WidgetKind`'s three keys are distinct across all kinds (no two kinds share a key).
- [ ] **Step 2: Run, expect FAIL:** `cd android && ./gradlew :app:testDebugUnitTest --tests '*WidgetAppearanceTest*'`
- [ ] **Step 3: Implement** preferences, `WidgetTokens.kt`, the moved dialog wired to the drawer's "Widgets" item, and the widget color replacement.
- [ ] **Step 4: Verify:** tests pass; `grep -n "Color(0x" android/app/src/main/java/com/thonyfd/financedashboard/widget/*.kt` returns nothing; `./gradlew :app:assembleDebug` passes. On device: each widget shows the Brand Book palette; setting Finance to "Claro" and Habits to "Oscuro" renders each accordingly after "Guardar"; a widget in "Sistema" flips with the phone night toggle without a refresh; a non-owner account sees only "Hábitos de hoy" in the dialog; the Finance top bar no longer shows the widgets button.
- [ ] **Step 5: Commit** `feat(android): per-widget skin and mode, brand book palette`

### Task 11: Final parity and regression pass

- [ ] **Step 1:** `npx vitest run` (root) and `cd web/dashboard && npm run build && npm run lint` pass; `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug` pass.
- [ ] **Step 2:** Parity check: web and app both offer "Apariencia" with "Brand" and "Modo: Sistema / Claro / Oscuro", default Brand + Oscuro, public screens Brand dark.
- [ ] **Step 3:** `git diff development --name-only | xargs perl -ne 'print "$ARGV:$.\n" if /\x{2014}/; close ARGV if eof' -CSD` returns nothing (no em dash in changed files).
- [ ] **Step 4:** Commit any fixes: `chore: skins phase 1 parity fixes`.
