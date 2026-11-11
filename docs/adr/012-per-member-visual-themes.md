# ADR-012: Per-member visual themes

**Status:** Accepted
**Date:** 2026-11-11
**Decision:** The app supports visual themes that each member picks for themselves in the Perfil.
Ameixa (ADR-010) is the first theme and the default. Game-inspired themes come later, one by one,
on this structure. Dark mode is dropped: each theme has one mode, and Ameixa stays the light look it
was.

The product rules are in `docs/spec/temas.md`; this ADR is how they are built.

*The model.* `src/domain/themes.ts` lists the theme ids (`THEME_IDS`, the default first) with
`DEFAULT_THEME` and `isThemeId`, free of framework imports, so the server validates against the same
list. `src/ui/theme/themes.tsx` maps every id to its visuals (`ThemeVisuals` in
`src/ui/theme/types.ts`): the pt-BR name (from `strings.themes`), the icon style, the themed icons it
redraws, its `Logo` component and its favicon path. The map is a `Record<ThemeId, ThemeVisuals>`, so
an id without visuals does not compile. No color sits in the registry: the browser bar reads the
theme's `--color-browser-bar` token at runtime, and the logo paints with the
theme's tokens.

*The contract: what a theme may vary.*
- Colors: every `--color-*` token and the three `--shadow-*`. `--color-danger*` stays a
  recognizable red in every theme, only re-tuned for contrast: it means "delete / action error",
  and the zero-punishment rule depends on it.
- Fonts: `--font-display`, `--font-sans`, `--font-mono`, `--font-weight-*`,
  `--letter-spacing-display`, `--line-height-*`.
- Shapes and motion: `--radius-*` (including `--radius-marker`, the habit marker, and
  `--radius-heat-cell`, a heatmap day: circle or square), `--border-width*`, the shadows' style,
  `--easing`, `--duration-*`, `--opacity-*`, and `color-scheme`.
- Icons: the themed ones (`THEMED_ICONS`: today, shop, profile, check, plus, star, automated, coin)
  and the theme's drawing style (viewBox, fill or stroke, width, caps, joins, `shape-rendering`).
- Logo: the in-app `Logo`, the favicon and the browser bar's color.

*Fixed in every theme:* the `--space-*` grid, the type scale (`--font-size-*`, nothing below 12px),
every `--size-*` (touch targets, layout), the focus ring's size, the screen structure, every text
(`strings.ts`, the glossary's terms), the functional icons (back, chevron, arrowUp, arrowDown, edit,
archive, pause, play, settings), `prefers-reduced-motion` and the rule of no continuous confetti.

*The CSS.* `src/ui/theme/tokens.css` stays the one file with literals. A `:root` block holds the
fixed tokens. Each theme is a block keyed by `[data-theme='<id>']` holding exactly the same set of
themed tokens. The default theme's selector is `:root, [data-theme='ameixa']` and it comes first, so
the page is never unstyled and a later theme block wins over it by source order (same
specificity). The bare attribute selector (not `:root[data-theme]`) also lets any element carry a
theme, whatever theme the page is in.
`tokens.test.ts` parses every block and fails when a theme misses or adds a token, redefines a fixed
one, sets no `color-scheme`, is not in `THEME_IDS`, or breaks a contrast pair; the literal, scale and
token-existence checks are unchanged. A fixture theme built inside the test proves the checks see a
new theme.

*Fonts.* Each theme's `@font-face` blocks sit in `tokens.css`, declarative: the browser downloads a
face only when an element uses it, so themes nobody picked cost nothing. Fonts are bundled in
`public/fonts`, with their license beside them; since the Ocarina theme a fan font with no license
text may be used too, with a `-NOTICE.txt` saying where it came from (`docs/spec/temas.md`). The CSP has no `font-src`, so `default-src 'self'` covers
them; `network-policy.ts` needs no change.

*Icons.* `src/ui/components/Icon.tsx` holds the functional icons, drawn in the default theme's style.
`Icon` and `CoinIcon` read the active theme from React context (`ThemeVisualsContext`); a themed
icon a theme does not redraw falls back to the default theme's drawing AND style, since a stroke
path drawn filled breaks. `IconName` is a union of literal names, so a typo is a compile error.

*Storage and privacy.* The theme is a member preference, private like their habits (ADR-008): a
`theme` column on `member_settings` (migration 8, default `'ameixa'`), read by the `theme` query and
written by `theme.set`, which rejects an id outside `THEME_IDS` as `invalid` and notifies only the
member's own apps (topic `theme`). A stored id the app no longer ships reads as the default.

*No flash.* The CSP forbids inline scripts (ADR-002), so no script in `index.html` can set the theme
before the first paint. Instead `main.tsx` reads the device's last theme from `localStorage`
(`levelup.theme`, every access in try/catch) and calls `applyTheme` before React's first render;
the stylesheet is already loaded by then, so the first rendered screen is in that theme. Once
signed in, the app loads the member's stored theme and switches to it if it differs; choosing in the
picker switches at once and puts the old theme back if the server refuses. Sign-out keeps the device's
last theme: the sign-in screen shows it (`docs/spec/temas.md`).

*The installed icon.* `public/icon.svg` and `public/icon-maskable.svg` stay the default theme's:
a home-screen icon is one per install, so it cannot follow the member's theme. The favicon (the
tab) and the `theme-color` meta (the browser bar) do follow it, set by `applyTheme` at runtime.

*The manifest per theme.* Changing the `theme-color` meta at runtime did not recolor the Android
status and navigation bars of the installed app: they follow the manifest's `theme_color`. So each
theme has its own static manifest, `public/manifests/<id>.webmanifest` (same `id`, `start_url`,
`scope` and icons; `theme_color` = the theme's `--color-browser-bar`, `background_color` = its
`--color-bg`), and `applyTheme` replaces the `<link rel="manifest">` (and the `<meta>`, since Chrome
rereads them when the element is replaced) with the theme's. Android picks up a changed manifest
when it next checks the installed app, so the bars may change on a later launch, not instantly.
`index.html` points at the default theme's manifest. `src/app-identity.test.ts` checks every
theme's manifest against its tokens, and the default theme against `index.html` and the icons.

**Why:** The owner wants game-inspired looks without touching the product: per-member like
everything else in the app, visuals only, and as close to the game as possible without copying its
art (how close is a product rule: `docs/spec/temas.md`). One set of token names with one block per theme keeps every component and test
unchanged and makes a theme a matter of values. Dropping dark mode halves the contrast work per
theme and matches the decision that each theme has one mode.
**Alternatives:** One CSS file per theme, loaded on demand: smaller first download but a flash and a
CSP-visible fetch on every switch, and the literal rule would span many files; one file is simpler
until the themes are many. A group-wide theme setting: rejected by the owner (the theme is
private). An inline script in `index.html` to set `data-theme` before paint: blocked by the CSP. A
`theme` field on `MeView`: it would reach the app sooner but mixes a preference into the identity
query; a separate query keeps the topic private and the contract explicit.
