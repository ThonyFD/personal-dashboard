# Skins: Brand Book, Nothing and Glass across web, app and widgets

## Intent

The owner wants every surface of the ecosystem (web dashboard, Android app, and each Android widget) to offer a choice of visual skin. Today everything follows `design/BRAND_BOOK.md`: dark, futuristic, cyan/lime/violet on navy. That look stays as the default. Two new skins join it:

- **Nothing:** minimalist, fully inspired by the nothing.tech design system. Monochrome, red accent, the characteristic dot pattern, and a dot-matrix display typeface.
- **Glass:** inspired by Apple's Liquid Glass (iOS 26, WWDC25). Floating translucent controls over content, refraction, specular highlights, concentric rounded corners.

Each skin has a light and a dark variant.

## Goals

1. Three skins: `brand` (default), `nothing`, `glass`. Each with `light` and `dark` variants.
2. Each surface chooses its own skin independently:
   - Web dashboard (per browser).
   - Android app (per device).
   - Each widget kind separately: Finance ("Dashboard financiero"), Payments ("Pagos próximos"), Habits ("Hábitos de hoy").
3. Switching a skin restyles the whole surface at once: colors, typography, shapes, surfaces, and skin-specific effects.
4. A custom dot-matrix typeface, drawn from scratch by us and inspired by Nothing's NDot, licensed SIL OFL 1.1 and committed to the repo. Used only for titles, numbers and KPIs.
5. Glass does whatever is technically feasible on each platform, degrading gracefully where it is not.

## Non-goals

- Syncing the skin choice across devices or through the account. The choice is local.
- User-defined or custom skins, theme editors, or more than three skins.
- Using the dot typeface for body text.
- Per-page or per-screen skin choice inside a surface.
- Redesigning layouts, navigation or information architecture. Skins change appearance, not structure (Glass floating the navigation layer is the one allowed exception, see below).

## Anti-goals

- **Shipping Nothing's NDot font files**, or any glyph traced or extracted from them, in the repo, the web bundle or the APK. NDot is "All Rights Reserved" by Nothing Technology. The repo is public.
- Copying Nothing or Apple trademarks, logos or wordmarks.
- The Brand Book skin on the web and the app looking different from today after the refactor (dark variant must be visually equivalent to the current UI; see "Refactor needed first"). Widgets are the exception: they get redesigned to the Brand Book palette on purpose.
- Unreadable text: any skin/variant combination failing WCAG AA contrast (4.5:1 body, 3:1 large text and KPIs). Glass over busy content is the main risk.
- A finance number becoming visible to a non-owner through any new code path (the owner-only rules from `2026-11-02-multi-user-design.md` still apply).

## Constraints

- Repo is **public**. No third-party proprietary fonts or assets.
- Android/web parity is required: what lands in the app lands in the web too.
- No em dash characters anywhere (code, comments, docs, UI copy).
- UI copy in Spanish.
- Android `minSdk = 26`. Real blur (`RenderEffect` / `Modifier.blur`) exists only on API 31+.
- Widgets use Glance `1.1.1`. Glance text supports only system font families; custom TTF fonts cannot be applied to widget `Text`. Glance has no blur.
- Web: `backdrop-filter` is broadly supported; SVG displacement-map refraction via `backdrop-filter: url(#...)` works reliably only in Chromium.

## Decisions made with the owner

- Brand Book look stays, as the third option and the default.
- Each surface chooses independently; each widget kind has its own skin, like the existing per-widget opacity.
- Nothing must have a dot-matrix font, the characteristic dot pattern, and Nothing's colors.
- Instead of NDot, we build our own dot-matrix font inspired by it. Only for titles, numbers and KPIs.
- Glass: do what is technically feasible per platform; simpler on widgets and non-Chromium browsers is acceptable.
- Every skin, Brand Book included, has light and dark variants.
- Mode (light/dark) is a user setting per surface: "Sistema / Claro / Oscuro", default **Oscuro**, so nothing changes until the user picks otherwise.
- Widgets in the Brand skin move to the official Brand Book palette (cyan, lime, coral on `#081022`), replacing today's ad-hoc widget palette (`#1A1A2E`, `#00D4AA`, `#4CAF50`, etc.). This visible widget redesign is accepted.

## Calls made by the designer (not discussed with the owner)

- Web fidelity for Brand dark is "visually equivalent", not pixel-exact: near-identical shades (the web has about 213 distinct color values) may merge into one token. Verified with manual before/after screenshots of every page.
- The widget appearance dialog moves from the Finance top bar to the ☰ drawer so every account can reach it. Finance and Payments widget controls show only to the owner; Habits controls show to everyone.
- Skins apply only to signed-in surfaces. Public `HomePage`, `Login`, `PrivacyPolicy`, `TermsOfService` on web and `LoginScreen` on Android always render in Brand dark.
- Widget skin and mode changes apply on "Guardar", like opacity today. App and web pickers apply instantly.
- Each widget kind stores its own skin and its own mode, next to its opacity.
- "Nothing" and "Glass" used as plain descriptive labels in the UI.

## Current state (from the code)

- **Web** (`web/dashboard`, React 18 + Vite, plain CSS): tokens exist in `src/index.css` `:root` (`--c-*`, `--f-*`, `--r-*`), but pages hardcode many colors: roughly 37 to 50 hex literals per page in `Budgets`, `Charts`, `Recurring`, `Reports`, `CashFlow`, `Transactions`, `Exports`, `Goals`, about 68 in `App.css`, plus page CSS files (`Habits.css`, `MonthlyControl.css`, `Mood.css`, `Timeline.css`) and component CSS. Recharts colors are passed as props in TSX. Fonts load from Google Fonts in `index.css`. The menu drawer in `App.tsx` holds account info, section switcher, links and sign-out.
- **Android app** (Compose + Material3): `ui/theme/Theme.kt` defines `AppColors`, `DisplayFamily` (Space Grotesk), `BodyFamily` (Manrope), `MoneyStyle`, typography, shapes and a single `DarkColorScheme`. About 11 files reference `AppColors.*` directly. `TimelineColors.kt` has its own colors. The ☰ drawer is `ui/AppMenu.kt`. `MainActivity.kt` (around line 284) has the widget appearance UI with one opacity slider per widget.
- **Widgets** (Glance): `FinanceWidget.kt`, `PaymentsWidget.kt`, `HabitsWidget.kt`, `WidgetNotAvailable.kt` hardcode colors (for example `Color(0xFF1A1A2E)` backgrounds). `WidgetAppearancePreferences.kt` stores opacity per `WidgetKind` in SharedPreferences `widget_appearance` and has `refreshAll()`.

## Design

### Skin model

- A skin is identified by `brand | nothing | glass`. The active variant is `light | dark`.
- **Variant comes from a mode setting** per surface: `system | light | dark`, default `dark`. `system` resolves via `prefers-color-scheme` on web, `isSystemInDarkTheme()` in the app, and system night mode for widgets.
- Every skin provides the same set of semantic tokens, so components never reference a skin directly. Minimum token set (names are illustrative, the builder may refine):
  - Surfaces: `bg`, `surface`, `surface-raised`, `overlay`, `hairline`.
  - Text: `text`, `text-secondary`, `text-passive`, `on-accent`.
  - Semantic: `accent` (identity/primary action), `positive` (progress, income), `negative` (expenses, errors), `warning` (pending), `depth` (secondary accent).
  - Chart series: an ordered categorical palette per skin and variant.
  - Typography: `font-display`, `font-body`, `font-numeric` (tabular figures).
  - Shape: radius scale `sm/md/lg/xl`.
  - Effects: per-skin flags/values (glass blur radius, highlight, dot pattern on/off).
- Semantics are preserved across skins: `negative` is always the expense color, `positive` always income/progress, so meaning never changes when the look does.

### Brand Book skin

- **Dark:** today's tokens (`AppColors`, `index.css :root`). After refactor the web and app must look visually the same as now. Widgets adopt this palette (redesign accepted by the owner).
- **Light:** new, derived from the Brand Book: light ice/white backgrounds, navy `#081022` as primary text, cyan `#00D9FF` stays identity but darkened where needed to meet contrast on light backgrounds; lime only for progress, violet sparingly. Same fonts (Space Grotesk, Manrope). *(Our call: the Brand Book only defines dark; the light palette is a derivation and the builder must verify contrast.)*

### Nothing skin

Reference: nothing.tech, Nothing OS.

- **Palette:** monochrome. Dark: near-black background, white text, greys for secondary. Light: off-white/light grey background, black text. Single accent: Nothing red (approx. `#D71921`; builder verifies a value that passes contrast in both variants). `positive` and `negative` stay distinguishable without adding color noise: suggested `negative` = red, `positive` = the text color with a distinct marker or a muted tone (builder's call, must stay readable in charts).
- **Typography:** display/titles/numbers/KPIs in our dot font (see below; Doto from Google Fonts as placeholder until ready). Body in a clean neutral sans, preferably monospace-leaning to fit the aesthetic. *(Our call: suggested `Space Mono` or `IBM Plex Mono` for labels and a neutral sans such as `Inter` for longer body text; both OFL. Builder may pick, must be free licensed.)*
- **Dot pattern:** dot-grid backgrounds or dividers used sparingly (for example behind KPI cards or as section separators), dotted progress bars and dotted chart fills where the chart library allows.
- **Shape and surfaces:** flat, no shadows, no gradients, thin outlines, generous whitespace. Rounded corners moderate. Uppercase small labels with letter spacing.

### Glass skin

Reference: Apple Liquid Glass. What defines it (from research), and how it maps:

1. Floating control layer over content: navigation (web header/menu, Android top bar and tabs) floats as translucent capsules; content scrolls beneath it. This is the one allowed structural change: nav becomes floating/overlaid rather than a solid bar.
2. Refraction (lensing at the glass edges), not just blur.
3. Specular highlights on edges (a bright rim, subtle gradient sheen).
4. Adaptive material: tint and text contrast adjust to light/dark.
5. Morphing: menus and sheets expand from their trigger with a fluid scale/radius animation.
6. Concentric, generous rounded corners.
7. Restraint: glass on the navigation/control layer and overlays (menus, dialogs, sheets), not on every card. Cards use a lighter frosted treatment or solid translucent surface.

Content behind glass needs something to refract: Glass uses a soft colorful background (gradient or blurred abstract shapes) per variant, so the effect reads.

**Per platform:**

| Effect | Web Chromium | Web Safari/Firefox | Android app API 31+ | Android app API 26-30 | Widgets |
|---|---|---|---|---|---|
| Blur | `backdrop-filter` | `backdrop-filter` | yes (`RenderEffect`/blur on background layer) | no, translucent tinted surface | no |
| Refraction | SVG displacement filter | no | optional (AGSL `RuntimeShader` on API 33+ if feasible) | no | no |
| Specular rim/highlight | yes | yes | yes | yes | yes, via drawable/gradient or bitmap |
| Floating nav | yes | yes | yes | yes | n/a |
| Morph animations | yes, respects `prefers-reduced-motion` | yes | yes | yes | no |

Widgets in Glass: translucent tinted background over the wallpaper (the existing per-widget opacity slider still applies), bright rim highlight, large concentric radius.

### Custom dot-matrix font (sub-project)

- Drawn from scratch on a dot grid (5x7 for caps/digits, with room for descenders and accents). We do **not** open, trace or measure NDot files. Distinct choices of our own (dot size, spacing, some letterforms) so it is inspired, not a clone.
- Character set: `A-Z`, `a-z`, `0-9`, `á é í ó ú ü ñ Á É Í Ó Ú Ü Ñ`, and `$ % . , - + / : ( ) ¿ ? ¡ !` plus space. Tabular (fixed-width) digits.
- Built by a script in the repo (Python + `fontTools`): glyph grids defined as text data, each "on" cell rendered as a circle, output `.ttf` and `.woff2`. Regenerable.
- License: SIL OFL 1.1, file committed alongside. Name must not include "Nothing" or "NDot". *(Name is the owner's or builder's call.)*
- Credit line in the font's README: inspired by the dot-matrix aesthetic of Nothing's design language; not affiliated.
- Until the font is ready, `Doto` (Google Fonts, OFL) is the placeholder. Swapping should be a one-line change per platform.

### Widgets and custom fonts

Glance cannot use custom fonts in `Text`. For the Nothing skin, KPI numbers and titles in widgets are rendered to a `Bitmap` with the dot font (`Typeface` from resources, drawn on `Canvas`) and shown as `Image`. Other widget text uses a system family (`FontFamily.Monospace` for Nothing). Bitmaps must be sized for the widget density and have a content description for accessibility.

### Where the user picks

- **Web:** a "Apariencia" section in the menu drawer (`App.tsx`), with three skin options (Brand, Nothing, Glass), each showing a small preview swatch, plus "Modo: Sistema / Claro / Oscuro". Applies instantly. Stored in `localStorage` (read inside try/catch; fallback `brand` + `dark`). Applied as `data-skin` and `data-mode` on `<html>` for signed-in routes only; public routes force Brand dark. Must be set before first paint (inline script in `index.html`) to avoid a flash of the wrong skin.
- **Android app:** an "Apariencia" entry in the ☰ drawer (`AppMenu.kt`), same skin options and mode control, applies instantly. Stored in SharedPreferences (or DataStore, builder's call), read by `FinanceDashboardTheme`. `LoginScreen` stays Brand dark.
- **Widgets:** the widget appearance dialog moves from the Finance top bar into the ☰ drawer ("Widgets"). Per widget kind: opacity slider (existing), skin selector, mode selector. Finance and Payments rows visible only to the owner. Stored in `WidgetAppearancePreferences` per `WidgetKind` (new keys per kind, defaults `brand` + `dark`), applied on "Guardar" via `refreshAll()`.
- Copy: "Apariencia", "Brand", "Nothing", "Glass". *(Our call: using "Nothing" and "Glass" as plain descriptive labels; if the owner prefers to avoid the brand word, rename to e.g. "Minimal" / "Cristal".)*

### Refactor needed first

- **Web:** move every hardcoded color in pages, CSS files and Recharts props to semantic tokens (CSS custom properties). Charts read series colors from tokens (via `getComputedStyle` or a small hook that re-reads on skin change). Skins are defined as token overrides under `[data-skin="..."]` plus `@media (prefers-color-scheme: light)`. Skin-specific effects (dot pattern, glass) live in skin-scoped CSS.
- **Android app:** `AppColors` becomes skin-aware: a `SkinTokens` data class with one instance per skin and variant, provided through a `CompositionLocal` alongside `MaterialTheme`. Call sites move from `AppColors.X` to the semantic token. `TimelineColors.kt` folds into tokens. Typography and shapes become per skin.
- **Widgets:** replace hardcoded `Color(...)` with tokens resolved from the widget's own skin and system night mode.

## Phasing (our proposal)

1. **Tokens and skin mechanism.** Refactor web, app and widgets to semantic tokens; add skin/mode storage and pickers with only `brand` (dark + new light); move widget dialog to the drawer. Ship: Brand dark on web and app looks unchanged; widgets move to the Brand Book palette.
2. **Nothing skin** on all surfaces, with Doto placeholder.
3. **Glass skin** on all surfaces, with per-platform capability fallbacks.
4. **Custom font** (can run in parallel with 2 and 3), then swap Doto out.

Each phase lands on web and Android together (parity).

## Success criteria

- Picking a skin on any surface restyles that surface completely and instantly, and only that surface.
- Each widget can have a different skin from the others and from the app.
- Light and dark variants of all three skins pass WCAG AA contrast for text and KPIs.
- With default settings (Brand + Oscuro), web and app are visually unchanged from today (before/after screenshots per page); widgets show the Brand Book palette.
- A non-owner account can set skin, mode and opacity for the Habits widget.
- No NDot files or derived glyphs anywhere in the repo or builds.
- Nothing reads as Nothing at a glance: dot type on KPIs, monochrome + red, dot pattern.
- Glass reads as Glass at a glance: floating translucent navigation over content, rim highlights, rounded concentric shapes, with graceful fallback where blur/refraction are unavailable.

## Left to the builder

- Exact token names and full palettes per skin and variant (within the rules above, contrast-verified).
- Body fonts for Nothing (must be free licensed).
- Storage mechanism on Android (SharedPreferences or DataStore).
- Whether to attempt AGSL refraction on Android 13+.
- Font name and exact glyph designs.
- Animation timings.
