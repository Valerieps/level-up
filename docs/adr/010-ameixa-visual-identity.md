# ADR-010: Ameixa visual identity

**Status:** Accepted, updated by ADR-012
**Date:** 2026-11-11
**Decision:** The app uses the Ameixa identity the owner designed before the bootstrap (design
system and screen drafts in `docs/rascunhos/`). Its values go into `src/ui/theme/tokens.css` under
the template's token names, plus new tokens for what the template had no name for: the plum top
(`--color-top*`, `--color-level`, `--color-coin`), the reward family (`--color-gold*`,
`--color-star`), "Faz tempo" (`--color-faz*`), the soft state backgrounds, the toast, the heatmap
(`--color-heat-0` to `-4`), the shadows, `--radius-lg`/`-xl`, `--space-5`, `--font-display`,
`--font-mono` and the motion durations. The brand (`--color-brand`) is Ameixa's orange `primary`;
the manifest, the theme-color and the icons follow it. The icon is the habit marker: an orange
circle with a check on plum.

Two Ameixa values change to keep the template's rules (`docs/UI.md`):
- Body and habit-name text are 16px instead of 15px, and metadata 14px instead of 13px, because
  `tokens.test.ts` requires body text of at least 16px and a scale step of at least 1.125.
- Sora, Inter and JetBrains Mono are not loaded from Google Fonts, because the app loads nothing
  from a CDN (`docs/SEGURANCA.md`). They are bundled in `public/fonts/` as variable latin-subset woff2 files
  (one file per family, so no more than that), declared by `@font-face` in `tokens.css`; the
  token stacks name them first and fall back to the system fonts.

**Why:** The identity was already designed and approved; the tokens are the one place the template
lets it live, and the tests keep contrast at AA in both themes (every Ameixa text pair passes;
the pairs are listed in `tokens.test.ts`).
**Update (2026-11-11):** Ameixa becomes the first and default theme of the per-member themes of
ADR-012. Its dark mode is dropped: each theme has one mode, and Ameixa keeps only the light values
above. The tests now keep contrast at AA in every theme.
**Alternatives:** Keep Ameixa's own token names (`--ink`, `--canvas`): it would break the template's
components and tests, which the visual-identity skill forbids.
