# Skins Phase 2: Nothing Skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Nothing" a selectable skin (light and dark) on the web, the Android app and each widget kind: monochrome palette with red accent, dot-matrix display type (Doto placeholder) on titles and KPIs, dot pattern, flat surfaces.

**Architecture:** Builds on Phase 1 tokens. Web: Nothing token blocks in `tokens.css` keyed on `data-skin="nothing"`, new font tokens (`--f-display`, `--f-numeric`, `--f-label`) applied once in shared CSS, and a skin-scoped `skins/nothing.css` for effects. Android: `NothingDark`/`NothingLight` `SkinTokens`, per-skin fonts and shapes provided next to the tokens, a `dotGrid` modifier, and widget KPIs drawn as tinted bitmaps because Glance cannot use custom fonts.

**Tech Stack:** React 18 + Vite + plain CSS, Vitest; Kotlin, Compose Material3, Glance 1.1.1, JUnit 4.

**Spec:** `docs/superpowers/specs/2026-11-09-skins-design.md` (sections "Nothing skin", "Widgets and custom fonts", Phasing step 2). Phase 1 plan for context: `docs/superpowers/plans/2026-11-10-skins-phase-1-tokens.md`.

## Global Constraints

- Skin ids unchanged: `brand | nothing | glass`. After this phase `SELECTABLE` = `brand`, `nothing` (web `SELECTABLE_SKINS`, Android `Skin.SELECTABLE`). `glass` stays hidden.
- UI label for the skin: "Nothing" (exact). Other copy unchanged from Phase 1.
- Fonts (all SIL OFL 1.1, free licensed): display `Doto` (placeholder for the future custom font), labels and table numbers `Space Mono`, body `Inter`. Never ship NDot or any Nothing-owned asset.
- Dot display type only at display sizes: >= 20px (web) / >= 20sp (Android). Smaller numbers use `Space Mono`.
- Brand skin must not change at all in this phase (both variants): every new token's Brand value equals what Brand renders today.
- Contrast (both Nothing variants, same rules as Phase 1): text vs bg/surface >= 4.5; secondary text vs bg >= 4.5; passive text vs bg >= 3; accent/positive/negative/warning vs bg >= 3; on-accent vs accent >= 4.5; positive and negative as text vs bg >= 4.5; on-accent vs negative >= 4.5.
- Public surfaces stay Brand dark. No em dash characters. Android/web parity.
- Gradle wrapper is not tracked: from `android/` run `JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home ~/.gradle/wrapper/dists/gradle-8.9-bin/*/gradle-8.9/bin/gradle <tasks>`. Worktrees need `web/dashboard/index.html` and `android/local.properties` copied from the main checkout.

## Nothing palette (both platforms use these exact values)

| Token (web / Android) | Dark | Light |
|---|---|---|
| `--c-bg` / `bg` | `#000000` | `#F2F2F2` |
| `--c-surface-2` / `surfaceLow` | `#0A0A0A` | `#EAEAEA` |
| `--c-surface` / `surface` | `#111111` | `#FFFFFF` |
| `--c-surface-raised` / `surfaceRaised` | `#1A1A1A` | `#E0E0E0` |
| `--c-hairline` / `hairline` | `#2A2A2A` | `#CCCCCC` |
| `--c-text` / `text` | `#FFFFFF` | `#000000` |
| `--c-text-2` / `textSecondary` | `#B3B3B3` | `#4D4D4D` |
| `--c-text-3` / `textPassive` | `#808080` | `#6E6E6E` |
| `--c-muted` | `#808080` | `#6E6E6E` |
| `--c-primary` / `accent` | `#FFFFFF` | `#000000` |
| `--c-on-accent` / `onAccent` | `#000000` | `#FFFFFF` |
| `--c-green` / `positive` | `#FFFFFF` | `#000000` |
| `--c-negative` / `negative` (Nothing red) | `#D71921` | `#C8102E` |
| `--c-warning` / `warning` | `#E0B040` | `#8A6100` |
| `--c-violet` / `depth` | `#808080` | `#6E6E6E` |
| `--c-glow` | `#FFFFFF` | `#000000` |
| `--c-white` | `#FFFFFF` | `#FFFFFF` |
| `--c-scrim` | `#000000` | `#000000` |
| `--c-border` | `color-mix(in srgb, #FFFFFF 14%, transparent)` | `color-mix(in srgb, #000000 14%, transparent)` |
| `--c-border-violet` | `color-mix(in srgb, #808080 20%, transparent)` | `color-mix(in srgb, #6E6E6E 20%, transparent)` |
| chart 1..8 | `#FFFFFF #D71921 #A6A6A6 #6E6E6E #E0B040 #FF6A70 #4D4D4D #CFCFCF` | `#000000 #C8102E #6E6E6E #A6A6A6 #8A6100 #E0404A #333333 #8C8C8C` |

Monochrome on purpose: primary actions are white-on-black (black-on-white in light); red marks expenses, errors and the accent dot. Income is the text color (amounts keep their `+` sign). Tests are the authority: if an assertion fails, change the value minimally and update both platforms.

Nothing radii: `--r-sm 4px`, `--r-md 8px`, `--r-lg 12px`, `--r-xl 16px` (Android shapes 4/8/12/16/20 dp).

## Review Focus

1. Switching Nothing back to Brand must leave no trace (fonts, radii, dot pattern, flat surfaces). Web: every Nothing rule is scoped under `:root[data-skin="nothing"]`; manual check in Task 3. Android: test `fontsFor(BRAND)` equals today's families in Task 5.
2. A stored `"nothing"` is now accepted while `"glass"` is still rejected. Test in Task 1 (web) and Task 4 (Android).
3. Fonts failing to load (offline, blocked Google Fonts) must fall back to readable families, not invisible text. Web stacks end in `monospace` / `sans-serif` and the Google URL keeps `display=swap`; check in Task 2.
4. Widget KPI bitmaps in `Sistema` mode must follow the phone's night mode (bitmap drawn white and tinted with the day/night `ColorProvider`). Manual check in Task 6.
5. Doto at small sizes is unreadable: only `--f-display` / `display` font uses it, and it is applied only to elements >= 20px/sp. Reviewer checks every `--f-display` use in Task 2 and every `fonts.display` use in Task 5.

---

## Web

### Task 1: Nothing tokens and selectable skin

**Files:**
- Modify: `web/dashboard/src/theme/tokens.css` (add font tokens to Brand blocks; add two Nothing blocks)
- Modify: `web/dashboard/src/theme/tokens.test.ts`
- Modify: `web/dashboard/src/theme/appearance.ts` (`SELECTABLE_SKINS = ['brand', 'nothing']`)
- Modify: `web/dashboard/src/theme/appearance.test.ts`
- Modify: `web/dashboard/src/components/AppearanceSettings.tsx` (swatch entry)

**Interfaces:**
- Produces CSS tokens:
  - New in both Brand blocks (values that reproduce today exactly): `--f-display: 'Space Grotesk', -apple-system, sans-serif`, `--f-numeric: 'Space Grotesk', -apple-system, sans-serif`, `--f-label: 'Manrope', -apple-system, sans-serif`.
  - `:root[data-skin="nothing"]` = Nothing dark; `:root[data-skin="nothing"][data-variant="light"]` = Nothing light. Values from the palette table. Fonts in Nothing (both variants): `--f-heading: 'Space Mono', ui-monospace, monospace`, `--f-display: 'Doto', 'Space Mono', ui-monospace, monospace`, `--f-numeric: 'Space Mono', ui-monospace, monospace`, `--f-label: 'Space Mono', ui-monospace, monospace`, `--f-body: 'Inter', -apple-system, sans-serif`. Radii from "Nothing radii".
  - Selector specificity: the Nothing light block must beat `:root[data-variant="light"]` (it does, two attributes vs one); keep it after the Brand light block.
- Swatch: `nothing: { label: 'Nothing', bg: '#000000', surface: '#111111', accent: '#D71921' }`.

- [ ] **Step 1: Write failing tests.** In `tokens.test.ts`, run the existing per-variant contrast and parity assertions also for the two Nothing blocks, plus the new Global Constraints pairs (`--c-green` and `--c-negative` text vs `--c-bg` >= 4.5, `--c-on-accent` vs `--c-negative` >= 4.5) for all four blocks. Parity: every name in the Brand dark block exists in each Nothing block. In `appearance.test.ts`: stored `'{"skin":"nothing","mode":"light"}'` round-trips; `'{"skin":"glass","mode":"dark"}'` still gives `brand`; `SELECTABLE_SKINS` deep-equals `['brand','nothing']`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run web/dashboard/src/theme`
- [ ] **Step 3: Implement** tokens, selectable list, swatch.
- [ ] **Step 4: Run, expect PASS**; `cd web/dashboard && npm run build` passes.
- [ ] **Step 5: Commit** `feat(web): nothing skin tokens and selectable option`

### Task 2: Typography roles

**Files:**
- Modify: `web/dashboard/src/index.css` (Google Fonts URL; `h1, h2` use `--f-display`)
- Modify: `web/dashboard/src/App.css` and page CSS / TSX where KPI values and amounts are styled

**Interfaces:**
- Consumes: `--f-display`, `--f-numeric`, `--f-label` from Task 1.
- Google Fonts import adds `Doto:wght@400;700`, `Space+Mono:wght@400;700`, `Inter:wght@400;500;600;700` to the existing family list, keeping `&display=swap`.
- Role rules (the whole contract of this task):
  - `--f-display`: `h1`, `h2`, and KPI value elements rendered at >= 20px: `.stat-card .value`, `.timeline-progress-value`, summary total figures (`.summary-card.total-spent` value, `.summary-row.total` figure). If an element is below 20px in some breakpoint, use `--f-numeric` for that breakpoint.
  - `--f-numeric`: money/number cells below 20px: `.amount`, `.income-amount`, table amount columns. Keep `font-variant-numeric: tabular-nums`.
  - `--f-label`: small caption labels (`.stat-card` label/title element, `.menu-section-label`).
- Brand renders identically because the Brand values of these tokens equal today's families.

- [ ] **Step 1: Implement** the import and role rules.
- [ ] **Step 2: Verify:** `npm run build` passes; `npx vitest run web/dashboard/src/theme` passes; `grep -rn "f-display" web/dashboard/src` lists only `h1`, `h2` and >= 20px KPI selectors (list them with their font sizes in the report).
- [ ] **Step 3: Commit** `feat(web): display, numeric and label font roles`

### Task 3: Nothing effects (dot pattern, flat surfaces, labels)

**Files:**
- Create: `web/dashboard/src/theme/skins/nothing.css` (imported from `index.css` right after `tokens.css`)

**Interfaces:**
- Every selector starts with `:root[data-skin="nothing"]`.
- Rules:
  - Dot pattern on `.stat-card` and the main page background container: `background-image: radial-gradient(color-mix(in srgb, var(--c-text) 12%, transparent) 1px, transparent 1px)`, `background-size: 12px 12px`, behind content.
  - Flat: `box-shadow: none` and no gradient backgrounds on `.stat-card`, cards, menu drawer, modals (`background-image` only the dot pattern where specified).
  - Labels: `--f-label` elements `text-transform: uppercase; letter-spacing: 0.08em`.
  - Section dividers (`hr`, card header borders) become `border-style: dotted`.
  - Accent dot: `.stat-card` gets a 6px `var(--c-negative)` circle in its top-right corner via `::after` (decorative, `pointer-events: none`).
- Recharts styling stays token-driven (no dotted fills this phase).

- [ ] **Step 1: Implement** `nothing.css`.
- [ ] **Step 2: Verify:** build passes; `grep -c '^:root\[data-skin="nothing"\]' web/dashboard/src/theme/skins/nothing.css` equals the number of rule blocks (every rule scoped). Owner visual check (no sign-in for subagents): Nothing dark and light on Overview, Transactions, Habits; switch back to Brand shows no dots, shadows return.
- [ ] **Step 3: Commit** `feat(web): nothing skin effects`

---

## Android

### Task 4: Nothing palettes and selectable skin

**Files:**
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/theme/Skin.kt`
- Modify: `android/app/src/test/java/com/thonyfd/financedashboard/ui/theme/SkinTest.kt`

**Interfaces:**
- Produces: `val NothingDark: SkinTokens`, `val NothingLight: SkinTokens` (palette table; `chart` = chart 1..8; `isDark` true/false). `Skin.SELECTABLE = listOf(BRAND, NOTHING)`. `tokensFor(NOTHING, dark)` returns them; GLASS still falls back to Brand (keep the comment, now naming only GLASS).

- [ ] **Step 1: Write failing tests:** `Skin.fromKey("nothing") == NOTHING`; `fromKey("glass") == BRAND`; `tokensFor(NOTHING, true) == NothingDark`, `(NOTHING, false) == NothingLight`; run the existing contrast assertions for both Nothing token sets plus `positive`/`negative` vs `bg` >= 4.5 and `onAccent` vs `negative` >= 4.5.
- [ ] **Step 2: Run, expect FAIL:** `<gradle> :app:testDebugUnitTest --tests '*SkinTest*'`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS**, plus `:app:assembleDebug`.
- [ ] **Step 5: Commit** `feat(android): nothing skin palettes`

### Task 5: Fonts, shapes and dot pattern per skin

**Files:**
- Create: `android/app/src/main/res/font/doto.ttf`, `space_mono_regular.ttf`, `space_mono_bold.ttf`, `inter.ttf` (from `github.com/google/fonts` `ofl/doto/Doto[ROND,wght].ttf`, `ofl/spacemono/SpaceMono-Regular.ttf`, `ofl/spacemono/SpaceMono-Bold.ttf`, `ofl/inter/Inter[opsz,wght].ttf`)
- Create: `design/fonts/README.md` (each font, source URL, license SIL OFL 1.1, and: "Doto is a placeholder for our own dot-matrix font. Inspired by the dot-matrix aesthetic of Nothing's design language; not affiliated.") and `design/fonts/OFL-<font>.txt` copied from each font's repo folder
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/ui/theme/SkinStyle.kt`
- Modify: `ui/theme/Theme.kt`, and every file using `DisplayFamily` or `MoneyStyle`: `ui/{MainActivity,AppComponents,HabitsScreen,MonthlyControlScreen,CategoryDetailScreen,TimelineScreen}.kt`
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/ui/theme/SkinStyleTest.kt`

**Interfaces:**
- Produces in `SkinStyle.kt`:
  - `data class SkinFonts(val display: FontFamily, val heading: FontFamily, val body: FontFamily, val numeric: FontFamily, val label: FontFamily)`
  - `fun fontsFor(skin: Skin): SkinFonts`: BRAND = (`DisplayFamily`, `DisplayFamily`, `BodyFamily`, `DisplayFamily`, `BodyFamily`), i.e. today's; NOTHING = (Doto, Space Mono, Inter, Space Mono, Space Mono); GLASS = BRAND.
  - `fun shapesFor(skin: Skin): Shapes` (BRAND = today's `AppShapes`; NOTHING = 4/8/12/16/20 dp).
  - `fun typographyFor(fonts: SkinFonts): Typography`: same weights and letter spacing as today's `AppTypography`. Families by role: `display*` use `fonts.display`; `headline*` and `titleLarge` use `fonts.heading`; `titleMedium` through `bodySmall` use `fonts.body`; `label*` use `fonts.label`, and when `fonts.label != fonts.body` add `letterSpacing = 1.2.sp`. With Brand fonts this reproduces today's `AppTypography` exactly (heading = display = Space Grotesk, label = body = Manrope). Doto only reaches `display*` (>= 36sp).
  - `fun Modifier.dotGrid(color: Color, spacing: Dp = 12.dp, radius: Dp = 1.dp): Modifier` (drawBehind grid of circles).
  - `data class SkinEffects(val dotPattern: Boolean, val flat: Boolean)`; `fun effectsFor(skin: Skin): SkinEffects` (NOTHING = true/true).
- `Theme.kt`: `LocalSkin = staticCompositionLocalOf { Skin.BRAND }`; `AppTheme.fonts: SkinFonts`, `AppTheme.effects: SkinEffects`, `AppTheme.moneyStyle: TextStyle` (numeric family, `tnum`, same letter spacing as `MoneyStyle`) as `@Composable @ReadOnlyComposable` getters; `FinanceDashboardTheme(tokens: SkinTokens = BrandDark, skin: Skin = Skin.BRAND, content)` uses `typographyFor(fontsFor(skin))` and `shapesFor(skin)`; `AppearanceTheme` passes the stored skin. Remove top-level `MoneyStyle`; keep `DisplayFamily`/`BodyFamily` only inside the theme package.
- Call sites: `MoneyStyle` becomes `AppTheme.moneyStyle`; `DisplayFamily` becomes `AppTheme.fonts.display` only where the text is >= 20sp, otherwise `AppTheme.fonts.numeric` (Brand result identical since both are Space Grotesk). `GroupedPanel`/KPI cards in `AppComponents.kt` apply `Modifier.dotGrid(AppTheme.colors.text.copy(alpha = 0.12f))` when `AppTheme.effects.dotPattern`, and drop elevation/shadow when `flat`.

- [ ] **Step 1: Write failing tests** `SkinStyleTest.kt`: `fontsFor(Skin.BRAND) == SkinFonts(DisplayFamily, DisplayFamily, BodyFamily, DisplayFamily, BodyFamily)`; `fontsFor(Skin.GLASS) == fontsFor(Skin.BRAND)`; `fontsFor(Skin.NOTHING).body != fontsFor(Skin.NOTHING).display`; `effectsFor(Skin.BRAND) == SkinEffects(false, false)`, `effectsFor(Skin.NOTHING) == SkinEffects(true, true)`; for `typographyFor(fontsFor(Skin.NOTHING))`, every style with `fontSize < 20.sp` has `fontFamily != fontsFor(Skin.NOTHING).display`. (If `FontFamily` built from resources cannot be constructed in plain JUnit, keep resource-free sentinels: make `fontsFor` take a `FontSet` parameter defaulting to the real families, and pass fake `FontFamily.Monospace`/`Serif`/`SansSerif` in tests.)
- [ ] **Step 2: Run, expect FAIL:** `<gradle> :app:testDebugUnitTest --tests '*SkinStyleTest*'`
- [ ] **Step 3: Add fonts and licenses, implement `SkinStyle.kt`, wire `Theme.kt`, migrate call sites.**
- [ ] **Step 4: Verify:** tests pass; `grep -rn "MoneyStyle\|DisplayFamily" android/app/src/main/java --include=*.kt` hits only `ui/theme/`; `:app:assembleDebug` passes. Owner device check: Nothing dark/light on each tab, dot grid on panels, switch back to Brand looks exactly as before.
- [ ] **Step 5: Commit** `feat(android): per-skin fonts, shapes and dot pattern`

### Task 6: Widgets in Nothing

**Files:**
- Create: `android/app/src/main/java/com/thonyfd/financedashboard/widget/DotText.kt`
- Modify: `widget/{FinanceWidget,PaymentsWidget,HabitsWidget,WidgetNotAvailable,WidgetTokens}.kt`
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/widget/DotTextTest.kt`

**Interfaces:**
- Consumes: `Skin`, `tokensFor`, `WidgetColors`, `WidgetAppearancePreferences.getSkin`.
- Produces:
  - `WidgetColors` gains `val skin: Skin`.
  - `fun dotTextSizePx(textSizeSp: Float, density: Float, fontScale: Float): Float` (pure).
  - `fun renderDotText(context: Context, text: String, textSizeSp: Float): Bitmap`: draws `text` in white with the Doto `Typeface` (`ResourcesCompat.getFont(context, R.font.doto)`), bitmap sized to the measured text bounds, `ARGB_8888`.
  - `@Composable fun WidgetKpiText(text: String, sizeSp: Float, color: ColorProvider, contentDescription: String)`: for NOTHING shows `Image(ImageProvider(renderDotText(...)), contentDescription, colorFilter = ColorFilter.tint(color))`; otherwise a normal Glance `Text` with the same size and color (today's look).
- Use `WidgetKpiText` for the KPIs at >= 20sp: Finance main total (`FinanceWidget.kt` ~line 305, 20sp) and Habits count (`HabitsWidget.kt` ~line 163, 28sp). Every other widget `Text` in Nothing uses `FontFamily.Monospace`; Brand keeps today's family. `contentDescription` is the plain text value.

- [ ] **Step 1: Write failing test** `DotTextTest.kt`: `dotTextSizePx(20f, 2f, 1f) == 40f`; `dotTextSizePx(28f, 3f, 1.3f) == 28f * 3f * 1.3f`.
- [ ] **Step 2: Run, expect FAIL:** `<gradle> :app:testDebugUnitTest --tests '*DotTextTest*'`
- [ ] **Step 3: Implement** `DotText.kt` and wire the widgets.
- [ ] **Step 4: Verify:** tests and `:app:assembleDebug` pass. Owner device check: each widget in Nothing dark, light and Sistema (KPI bitmap tint flips with night mode), TalkBack reads the KPI value, Brand widgets unchanged.
- [ ] **Step 5: Commit** `feat(android): nothing skin on widgets with dot kpis`

### Task 7: Parity pass

- [ ] **Step 1:** `npx vitest run` (root), `cd web/dashboard && npm run build`, `<gradle> :app:testDebugUnitTest :app:assembleDebug` all pass.
- [ ] **Step 2:** Web and app both list "Brand" and "Nothing" in Apariencia; each widget dialog row lists both; "Glass" appears nowhere.
- [ ] **Step 3:** `git diff <base> --name-only | xargs perl -CSD -ne 'print "$ARGV:$.\n" if /\x{2014}/; close ARGV if eof'` reports no em dash on added lines.
- [ ] **Step 4:** Commit fixes if any: `chore: skins phase 2 parity fixes`.
