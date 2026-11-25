# Skins Phase 3: Glass Skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Glass" a selectable skin (light and dark) on the web, the Android app and each widget kind: translucent surfaces over a soft colorful backdrop, floating capsule navigation, rim and specular highlights, concentric large radii, blur and refraction where the platform allows, morphing menus.

**Architecture:** Builds on Phases 1 and 2. Web: Glass token blocks in `tokens.css` keyed on `data-skin="glass"` (surfaces are `rgba`), a skin-scoped `skins/glass.css` for the backdrop, blur, rim, floating nav and drawer morph, and an SVG displacement filter enabled only where `backdrop-filter: url()` works (Chromium). Android: `GlassDark`/`GlassLight` `SkinTokens` plus a `GlassStyle` (rim, highlight, backdrop colors) provided next to them, a `skinBackground` modifier, a floating capsule bottom bar with a sliding indicator. Widgets: translucent tinted root (existing opacity slider), rim drawable overlay, large radius.

**Tech Stack:** React 18 + Vite + plain CSS, Vitest; Kotlin, Compose Material3 (BOM 2024.12.01), Glance 1.1.1, JUnit 4.

**Spec:** `docs/superpowers/specs/2026-11-09-skins-design.md` (section "Glass skin", per-platform table, Phasing step 3). Phase 2 plan for patterns: `docs/superpowers/plans/2026-11-12-skins-phase-2-nothing.md`.

## Global Constraints

- After this phase `SELECTABLE` = `brand`, `nothing`, `glass` (web `SELECTABLE_SKINS`, Android `Skin.SELECTABLE`). Unknown keys still fall back to `brand`.
- UI label: "Glass" (exact). Other copy unchanged.
- Glass fonts (all roles: heading, display, numeric, label, body): `Inter` (already bundled and loaded in Phase 2, SIL OFL 1.1). Web stack `'Inter', -apple-system, sans-serif`. No Apple fonts, icons or wordmarks.
- Brand and Nothing must not change at all (both variants). Every Glass rule is scoped under `:root[data-skin="glass"]` (web) or behind `AppTheme.effects.glass` / `skin == Skin.GLASS` (Android).
- Contrast, Glass both variants: same Phase 2 assertions against `bg`, plus, because surfaces are translucent, every text assertion also holds against `surface` composited over each backdrop color (`backdrop1..3`) and over `bg`. Tests are the authority: if one fails, change the value minimally and update both platforms.
- Motion respects `prefers-reduced-motion` (web) and is purely decorative (Android): no information conveyed only by animation.
- Public surfaces stay Brand dark. No em dash characters. Android/web parity.
- Gradle wrapper is not tracked: from `android/` run `JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home ~/.gradle/wrapper/dists/gradle-8.9-bin/*/gradle-8.9/bin/gradle <tasks>`. Worktrees need `web/dashboard/index.html` and `android/local.properties` copied from the main checkout.

## Rulings made while planning (owner may override)

- **No real backdrop blur on Android this phase.** Compose has no backdrop blur; it needs a library (Haze) whose current releases target newer Compose than our BOM, and our screens pad content above the bars, so nothing scrolls beneath them. Behind the bars there is only the soft backdrop, which is already smooth, so translucent tint over it reads the same. Cost if wrong: add Haze later behind `AppTheme.effects.glass`, no token changes.
- **No AGSL refraction on Android** (spec leaves it to the builder). Refraction is web Chromium only.
- **Content does not scroll beneath the Android top bar.** Bars float visually (margins, capsule, translucency) without restructuring screens (spec non-goal: no layout redesign).

## Glass palette (both platforms use these exact values)

| Token (web / Android) | Dark | Light |
|---|---|---|
| `--c-bg` / `bg` | `#0A0E1A` | `#EEF2F8` |
| `--c-surface-2` / `surfaceLow` | `#121829` | `#E4E9F2` |
| `--c-surface` / `surface` | `rgba(255, 255, 255, 0.08)` | `rgba(255, 255, 255, 0.62)` |
| `--c-surface-raised` / `surfaceRaised` | `rgba(255, 255, 255, 0.14)` | `rgba(255, 255, 255, 0.80)` |
| `--c-hairline` / `hairline` | `rgba(255, 255, 255, 0.16)` | `#D5DCE8` |
| `--c-text` / `text` | `#FFFFFF` | `#0A0E1A` |
| `--c-text-2` / `textSecondary` | `#C7CBD6` | `#3C4352` |
| `--c-text-3` / `textPassive` | `#8E94A3` | `#5F6677` |
| `--c-muted` | `#8E94A3` | `#5F6677` |
| `--c-primary` / `accent` | `#5AA2FF` | `#0062D6` |
| `--c-on-accent` / `onAccent` | `#0A0E1A` | `#FFFFFF` |
| `--c-green` / `positive` | `#30D158` | `#157A33` |
| `--c-negative` / `negative` | `#FF6961` | `#C62828` |
| `--c-warning` / `warning` | `#FFD60A` | `#8F5A00` |
| `--c-violet` / `depth` | `#BF5AF2` | `#8A3FC7` |
| `--c-glow` | `#FFFFFF` | `#0A0E1A` |
| `--c-white` | `#FFFFFF` | `#FFFFFF` |
| `--c-scrim` | `#000000` | `#000000` |
| `--c-border` | `color-mix(in srgb, #FFFFFF 16%, transparent)` | `color-mix(in srgb, #0A0E1A 10%, transparent)` |
| `--c-border-violet` | `color-mix(in srgb, #BF5AF2 20%, transparent)` | `color-mix(in srgb, #8A3FC7 20%, transparent)` |
| chart 1..8 | `#5AA2FF #30D158 #BF5AF2 #FF6961 #FFD60A #64D2FF #8E94A3 #FF9F0A` | `#0062D6 #157A33 #8A3FC7 #C62828 #8F5A00 #00799E #5F6677 #B35C00` |
| Glass-only `--c-backdrop-1..3` / `GlassStyle.backdrop` | `#1B2A5E #3A1F5C #0D4A4E` | `#C9D8FF #E5D2FF #C8EEE8` |
| Glass-only `--c-glass-rim` / `GlassStyle.rim` | `rgba(255, 255, 255, 0.28)` | `rgba(255, 255, 255, 0.90)` |
| Glass-only `--c-glass-highlight` / `GlassStyle.highlight` | `rgba(255, 255, 255, 0.18)` | `rgba(255, 255, 255, 0.70)` |
| Glass-only `--c-surface-solid` (no `backdrop-filter` fallback) | `#1A2136` | `#F8FAFD` |

Backdrop colors are the effective colors seen behind glass (already muted), drawn as three large soft radial blobs over `bg`. Glass radii: `--r-sm 10px`, `--r-md 16px`, `--r-lg 22px`, `--r-xl 28px` (Android shapes 10/16/22/28/36 dp). Capsule = fully rounded (`999px` / `CircleShape`).

## Review Focus

1. Text on a translucent card over the brightest backdrop blob stays readable. Composite contrast tests in Task 1 (web) and Task 4 (Android).
2. Browsers without `backdrop-filter` (old Firefox ESR, some Android WebViews) must not show text on near-invisible surfaces: `@supports not (backdrop-filter: blur(1px)) and not (-webkit-backdrop-filter: blur(1px))` swaps surfaces to `--c-surface-solid`. Check in Task 2.
3. Refraction must never activate in Safari or Firefox (it would drop the blur entirely). `supportsRefraction` unit tests in Task 3.
4. Switching Glass back to Brand or Nothing leaves no trace: no backdrop, nav back to full-width bar, drawer slides from the right again. Web manual check Task 2; Android test `effectsFor` / `shapesFor` in Task 5.
5. The floating drawer must stay usable on small phones (360x640) and with long menus: `max-height: calc(100dvh - 24px)` with `overflow-y: auto`. Check in Task 2.

---

## Web

### Task 1: Glass tokens and selectable skin

**Files:**
- Modify: `web/dashboard/src/theme/tokens.css` (two Glass blocks after the Nothing blocks)
- Modify: `web/dashboard/src/theme/contrast.ts` (add `compositeOver`)
- Modify: `web/dashboard/src/theme/tokens.test.ts`, `web/dashboard/src/theme/appearance.test.ts`
- Modify: `web/dashboard/src/theme/appearance.ts` (`SELECTABLE_SKINS = ['brand', 'nothing', 'glass']`)
- Modify: `web/dashboard/src/components/AppearanceSettings.tsx` (swatch)

**Interfaces:**
- Produces: `:root[data-skin="glass"]` (dark) and `:root[data-skin="glass"][data-variant="light"]` with the palette table values, Glass-only tokens, Inter for all five `--f-*` tokens, Glass radii.
- Produces: `export function compositeOver(color: string, base: string): string` in `contrast.ts`: returns opaque `#RRGGBB` of `color` (hex or rgba) composited over opaque `base`. Reuse the existing `parseColor`.
- Swatch: `glass: { label: 'Glass', bg: '#1B2A5E', surface: 'rgba(255, 255, 255, 0.18)', accent: '#5AA2FF' }`.

- [ ] **Step 1: Write failing tests.** Add both Glass blocks to the `variants` list (all existing assertions apply). `contrastRatio` requires an opaque second argument, so the shared `c(fg, bg)` helper must first resolve an `rgba` background with `compositeOver(t[bg], t['--c-bg'])`. New `describe.each` over the two Glass blocks: for each base in `[--c-bg, --c-backdrop-1, --c-backdrop-2, --c-backdrop-3]`, with `s = compositeOver(t['--c-surface'], t[base])`: `contrastRatio(t['--c-text'], s) >= 4.5`, `contrastRatio(t['--c-text-2'], s) >= 4.5`, `contrastRatio(t['--c-text-3'], s) >= 3`, `contrastRatio(t['--c-negative'], s) >= 3`, `contrastRatio(t['--c-green'], s) >= 3`. Parity: every Brand dark token exists in both Glass blocks. `compositeOver('rgba(255, 255, 255, 0.5)', '#000000')` equals `'#808080'` (rounding: `Math.round`). In `appearance.test.ts`: `'{"skin":"glass","mode":"light"}'` round-trips; `'{"skin":"chrome","mode":"dark"}'` gives `brand`; `SELECTABLE_SKINS` deep-equals `['brand','nothing','glass']`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run web/dashboard/src/theme`
- [ ] **Step 3: Implement** tokens, `compositeOver`, selectable list, swatch.
- [ ] **Step 4: Run, expect PASS**; `cd web/dashboard && npm run build` passes.
- [ ] **Step 5: Commit** `feat(web): glass skin tokens and selectable option`

### Task 2: Glass effects (backdrop, blur, rim, floating nav, drawer morph)

**Files:**
- Create: `web/dashboard/src/theme/skins/glass.css` (imported from `index.css` right after `skins/nothing.css`)

**Interfaces:**
- Consumes: Task 1 tokens. Every selector starts with `:root[data-skin="glass"]`.
- Rules (the whole contract of this task):
  - Backdrop: `.app::before` fixed full-viewport layer, `z-index: -1`, `pointer-events: none`, background = three radial gradients (`--c-backdrop-1` at 15% 10%, `--c-backdrop-2` at 85% 30%, `--c-backdrop-3` at 40% 90%, each `circle` fading to transparent at ~45%) over `var(--c-bg)`. `.app` gets `position: relative; isolation: isolate`.
  - Floating nav: `.nav` becomes a capsule: `top: 12px; margin: 12px auto 0; width: calc(100% - 24px); max-width: 1176px; border-radius: 999px; border: 1px solid var(--c-glass-rim); background: var(--c-surface); backdrop-filter: blur(24px) saturate(180%)` (and `-webkit-` prefix), `box-shadow: inset 0 1px 0 var(--c-glass-highlight), 0 8px 32px color-mix(in srgb, var(--c-scrim) 25%, transparent)`. Keeps `position: sticky`.
  - Frosted cards (lighter): `.card, .stat-card, .summary-card` and the `.skin-flat-card` hook: `background: var(--c-surface); backdrop-filter: blur(12px)`, `border: 1px solid var(--c-glass-rim)`, `box-shadow: inset 0 1px 0 var(--c-glass-highlight)`; gradients removed (use the same selector list as `nothing.css` "flat surfaces", plus `!important` only on the `skin-flat-*` hooks, as in Nothing).
  - Overlays (strong glass): `.menu-drawer`, `.signout-dialog`, `.timeline-modal`, `.skin-flat-card` modal panels: `blur(30px) saturate(180%)`, rim, radius `var(--r-xl)`.
  - Drawer morph: `.menu-drawer` becomes a floating panel `top: 12px; right: 12px; height: auto; max-height: calc(100dvh - 24px); overflow-y: auto; border-radius: var(--r-xl); transform-origin: top right`. Closed: `transform: scale(0.85); opacity: 0; visibility: hidden; pointer-events: none`. `.open`: `scale(1); opacity: 1; visibility: visible; pointer-events: auto`. `transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease, visibility 0s linear 320ms` (visibility delay only when closing). Override `right: -300px` from `App.css`. Under `@media (prefers-reduced-motion: reduce)`: no transform, opacity only, 120ms.
  - Fallback: `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` sets `--c-surface` and `--c-surface-raised` to `var(--c-surface-solid)` on `:root[data-skin="glass"]`.
  - Buttons: primary buttons (`.btn-primary` or the existing primary class) get `border-radius: 999px`.

- [ ] **Step 1: Implement** `glass.css`.
- [ ] **Step 2: Verify:** build passes; `npx vitest run web/dashboard/src/theme` passes; every rule block in `glass.css` starts with `:root[data-skin="glass"]` (inside `@media`/`@supports` too). Owner visual check: Glass dark and light on Overview, Transactions, Habits, drawer open/close, 360px width; switch to Brand and Nothing shows no trace.
- [ ] **Step 3: Commit** `feat(web): glass skin effects and floating nav`

### Task 3: Refraction in Chromium

**Files:**
- Create: `web/dashboard/src/theme/refraction.ts`, `web/dashboard/src/theme/refraction.test.ts`
- Create: `web/dashboard/src/components/GlassFilters.tsx`
- Modify: `web/dashboard/src/App.tsx` (render `<GlassFilters />` once inside the provider), `web/dashboard/src/theme/AppearanceContext.tsx` (set `data-refraction` on `<html>`), `skins/glass.css`

**Interfaces:**
- Produces: `export function supportsRefraction(supports: (prop: string, value: string) => boolean, userAgent: string): boolean`: true only when `supports('backdrop-filter', 'url(#glass-refract)')` and `userAgent` contains `Chrome/` and not `Firefox/`. iOS Chrome (`CriOS`) is WebKit: false.
- `GlassFilters`: renders only when the effective skin is `glass` and refraction is supported; a hidden `<svg width="0" height="0" aria-hidden="true" style="position:absolute">` with `<filter id="glass-refract">` = `feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7"` into `feDisplacementMap in="SourceGraphic" scale="18" xChannelSelector="R" yChannelSelector="G"`.
- `<html data-refraction="on">` when supported and skin is glass, removed otherwise.
- CSS: `:root[data-skin="glass"][data-refraction="on"] .nav, ... .menu-drawer { backdrop-filter: url(#glass-refract) blur(24px) saturate(180%); }` (nav and drawer only, restraint).

- [ ] **Step 1: Write failing tests** `refraction.test.ts`: Chrome desktop UA + supports true gives true; Safari macOS UA gives false even if supports true; Firefox UA gives false; `CriOS` UA gives false; Chrome UA + supports false gives false.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run web/dashboard/src/theme/refraction.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS**; build passes. Owner check in Chrome: nav and drawer edges bend content beneath; Safari shows plain blur.
- [ ] **Step 5: Commit** `feat(web): glass refraction in chromium`

---

## Android

### Task 4: Glass palettes, GlassStyle and selectable skin

**Files:**
- Modify: `android/app/src/main/java/com/thonyfd/financedashboard/ui/theme/Skin.kt`
- Modify: `android/app/src/test/java/com/thonyfd/financedashboard/ui/theme/SkinTest.kt`
- Modify: `ui/AppearanceDialog.kt`, `ui/WidgetAppearanceDialog.kt` (`label()` gets `Skin.GLASS -> "Glass"`)

**Interfaces:**
- Produces: `val GlassDark: SkinTokens`, `val GlassLight: SkinTokens` (palette table, `rgba` as `Color(0x14FFFFFF)` style ARGB). `Skin.SELECTABLE = listOf(BRAND, NOTHING, GLASS)`; `tokensFor(GLASS, dark)` returns them. Update the `Skin` KDoc (all three selectable).
- Produces: `data class GlassStyle(val backdrop: List<Color>, val rim: Color, val highlight: Color)`; `val GlassStyleDark`, `val GlassStyleLight`; `fun glassStyleFor(dark: Boolean): GlassStyle`.
- Produces: `fun compositeOver(fg: Color, bg: Color): Color` (opaque result, alpha blend per channel).

- [ ] **Step 1: Write failing tests:** `Skin.fromKey("glass") == GLASS`; `fromKey("chrome") == BRAND`; `tokensFor(GLASS, true) == GlassDark`, `(GLASS, false) == GlassLight`; existing contrast assertions for both Glass sets (any translucent background is first resolved with `compositeOver(it, bg)`, since `contrastRatio` ignores alpha); for each base in `bg` + `glassStyleFor(dark).backdrop`, `s = compositeOver(surface, base)`: `text` vs `s` >= 4.5, `textSecondary` >= 4.5, `textPassive` >= 3, `negative` and `positive` >= 3; `compositeOver(Color(0x80FFFFFF), Color.Black)` is within 1/255 of `Color(0xFF808080)` per channel.
- [ ] **Step 2: Run, expect FAIL:** `<gradle> :app:testDebugUnitTest --tests '*SkinTest*'`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS**, plus `:app:assembleDebug`.
- [ ] **Step 5: Commit** `feat(android): glass skin palettes`

### Task 5: Glass in the app (backdrop, floating bars, rim, shapes, fonts)

**Files:**
- Modify: `ui/theme/SkinStyle.kt`, `ui/theme/Theme.kt`
- Modify: `ui/MainActivity.kt` (Scaffold, `AppNavigationBar`, Dashboard `TopAppBar` colors), `ui/AppComponents.kt` (`GroupedPanel`, `panelSegment`, `appTopBarColors`), `ui/AppMenu.kt` (drawer sheet), `ui/CategoryDetailScreen.kt`, `ui/MonthlyControlScreen.kt` (Scaffold containers)
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/ui/theme/SkinStyleTest.kt`

**Interfaces:**
- Consumes: Task 4 `GlassStyle`, `glassStyleFor`.
- Produces in `SkinStyle.kt`:
  - `SkinEffects` gains `val glass: Boolean` (BRAND, NOTHING = false; GLASS = true). Existing call sites updated.
  - `fontsFor(GLASS)` = Inter for all five roles (`R.font.inter`, the Phase 2 file). Keep the test-sentinel `FontSet` approach from Phase 2.
  - `shapesFor(GLASS)` = 10/16/22/28/36 dp.
- Produces in `Theme.kt`: `LocalGlassStyle` and `AppTheme.glass: GlassStyle?` (null unless skin is GLASS), provided by `FinanceDashboardTheme` from `glassStyleFor(tokens.isDark)`.
- Produces in `AppComponents.kt`: `@Composable fun Modifier.skinBackground(): Modifier`: `background(AppTheme.colors.bg)` and, in Glass, three `Brush.radialGradient` blobs from `AppTheme.glass.backdrop` (centers at 15%/10%, 85%/30%, 40%/90% of size, radius 60% of the larger side) drawn behind content.
- Behavior in Glass (all other skins unchanged):
  - Scaffolds (`MainActivity`, `CategoryDetailScreen`, `MonthlyControlScreen`): `containerColor = Color.Transparent` with `Modifier.skinBackground()`; other skins keep `containerColor = AppTheme.colors.bg` (or use `skinBackground()` everywhere, which is identical for them).
  - `appTopBarColors()` and the Dashboard `TopAppBar`: `containerColor = Color.Transparent` in Glass.
  - `AppNavigationBar`: floating capsule `Row` with `padding(horizontal = 16.dp, vertical = 12.dp)` plus `navigationBarsPadding()`, `CircleShape`, `background(AppTheme.colors.surfaceRaised)`, `border(1.dp, glass.rim, CircleShape)`, a top highlight line (`drawBehind`, 1dp `glass.highlight`), no divider. Selected tab has an accent-tinted pill (`accent.copy(alpha = 0.18f)`) whose x offset animates with `animateDpAsState(spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessMediumLow))` between tabs (the morph). Each item keeps icon, label, `selected` semantics (`Modifier.selectable(role = Role.Tab)`) and a 48dp minimum touch target.
  - `GroupedPanel` / `panelSegment`: `surface` background (translucent), border `glass.rim` instead of `hairline`, 1dp top highlight.
  - Drawer sheet (`AppMenu.kt`): `drawerContainerColor = AppTheme.colors.surfaceLow.copy(alpha = 0.92f)`, `drawerShape = RoundedCornerShape(topEnd = 28.dp, bottomEnd = 28.dp)`, rim border.

- [ ] **Step 1: Write failing tests** `SkinStyleTest.kt`: `effectsFor(Skin.GLASS) == SkinEffects(dotPattern = false, flat = false, glass = true)`; `effectsFor(BRAND).glass == false`, `effectsFor(NOTHING).glass == false`; `fontsFor(GLASS)` has the same family in all five roles and it differs from `fontsFor(BRAND).display`; `shapesFor(BRAND)` unchanged (equals the Phase 2 Brand shapes) and `shapesFor(GLASS).large == RoundedCornerShape(28.dp)`.
- [ ] **Step 2: Run, expect FAIL:** `<gradle> :app:testDebugUnitTest --tests '*SkinStyleTest*'`
- [ ] **Step 3: Implement** and migrate call sites.
- [ ] **Step 4: Verify:** tests pass; `:app:assembleDebug` passes. Owner device check: Glass dark/light on each tab, capsule bar indicator slides, TalkBack announces tabs and selection, Brand and Nothing look exactly as before.
- [ ] **Step 5: Commit** `feat(android): glass skin in the app with floating nav`

### Task 6: Widgets in Glass

**Files:**
- Create: `android/app/src/main/res/drawable/widget_glass_rim_light.xml`, `widget_glass_rim_dark.xml`, `drawable/widget_glass_rim.xml` and `drawable-night/widget_glass_rim.xml` (system mode picks via the `-night` qualifier)
- Modify: `widget/WidgetTokens.kt`, `widget/{FinanceWidget,PaymentsWidget,HabitsWidget,WidgetNotAvailable}.kt`
- Test: `android/app/src/test/java/com/thonyfd/financedashboard/widget/WidgetTokensTest.kt`

**Interfaces:**
- Rim drawable: `layer-list` of a `shape` rectangle with `corners android:radius="28dp"`, a 1dp stroke in the variant's rim color (light `#E6FFFFFF`, dark `#47FFFFFF`), and a top-to-center `gradient` highlight (light `#B3FFFFFF` to `#00FFFFFF`, dark `#2EFFFFFF` to `#00FFFFFF`) on a top-inset item; transparent fill otherwise. `widget_glass_rim.xml` = light content, `drawable-night/widget_glass_rim.xml` = dark content.
- `WidgetColors` gains:
  - `val outerRadius: Dp` (GLASS 28dp, else 0dp meaning "no root radius", today's look), `val cardRadius: Dp` (GLASS 16dp, else 8dp), `val chipRadius: Dp` (GLASS 10dp, else 6dp). Pure function `fun widgetRadii(skin: Skin): Triple<Dp, Dp, Dp>` used by the constructor so it is unit-testable.
  - `@DrawableRes val rimRes: Int?` (null unless GLASS; SYSTEM gives `R.drawable.widget_glass_rim`, LIGHT `widget_glass_rim_light`, DARK `widget_glass_rim_dark`).
- Each widget root: when `rimRes != null`, wrap the existing root `Column` in a `Box` whose modifier carries `background(bg)` and `cornerRadius(outerRadius)`, with an `Image(ImageProvider(rimRes), contentDescription = null, contentScale = ContentScale.FillBounds, modifier = fillMaxSize())` as the first child, then the content. Brand and Nothing keep today's root unchanged. Replace literal `cornerRadius(8.dp)` with `cardRadius` and `cornerRadius(6.dp)` with `chipRadius` in all four widget files.
- Glass widget text uses Glance default family (no change to `WidgetText` beyond Nothing). KPIs render as normal `Text` (`WidgetKpiText` already does this for non-Nothing skins).

- [ ] **Step 1: Write failing test** `WidgetTokensTest.kt`: `widgetRadii(Skin.BRAND) == Triple(0.dp, 8.dp, 6.dp)`, `widgetRadii(Skin.NOTHING) == Triple(0.dp, 8.dp, 6.dp)`, `widgetRadii(Skin.GLASS) == Triple(28.dp, 16.dp, 10.dp)`.
- [ ] **Step 2: Run, expect FAIL:** `<gradle> :app:testDebugUnitTest --tests '*WidgetTokensTest*'`
- [ ] **Step 3: Implement** drawables, `WidgetColors` fields, widget roots and radii.
- [ ] **Step 4: Verify:** tests and `:app:assembleDebug` pass; `grep -n "cornerRadius([0-9]" android/app/src/main/java/com/thonyfd/financedashboard/widget/*.kt` returns nothing. Owner device check: each widget in Glass dark, light and Sistema (rim flips with night mode), opacity slider still changes the tint, Brand and Nothing widgets unchanged.
- [ ] **Step 5: Commit** `feat(android): glass skin on widgets`

### Task 7: Parity pass

- [ ] **Step 1:** `npx vitest run` (root), `cd web/dashboard && npm run build`, `<gradle> :app:testDebugUnitTest :app:assembleDebug` all pass.
- [ ] **Step 2:** Web and app both list "Brand", "Nothing" and "Glass" in Apariencia; each widget dialog row lists all three.
- [ ] **Step 3:** `git diff <base> --name-only | xargs perl -CSD -ne 'print "$ARGV:$.\n" if /\x{2014}/; close ARGV if eof'` reports no em dash.
- [ ] **Step 4:** Update the spec's per-platform table footnote with the Android rulings above (no backdrop blur, no AGSL) so the spec matches what shipped.
- [ ] **Step 5:** Commit fixes if any: `chore: skins phase 3 parity fixes`.
