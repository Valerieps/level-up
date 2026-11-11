import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from './domain/themes';
import { manifestPath } from './ui/theme/apply-theme';
import { THEMES } from './ui/theme/themes';

/**
 * The app identity files (installed icons, index.html's theme-color and favicon) follow the DEFAULT
 * theme's palette in tokens.css. The installed icon never follows the member's theme (ADR-012);
 * the favicon, the browser bar and the manifest (its colors) do, at runtime.
 */

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
interface Manifest {
  id: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; purpose: string }[];
}
const manifestOf = (theme: string) => JSON.parse(read(`public${manifestPath(theme as ThemeId)}`)) as Manifest;
const manifest = manifestOf(DEFAULT_THEME);
const tokens = read('src/ui/theme/tokens.css');
// The default theme's block: it opens with ":root," and its own [data-theme] selector.
const defaultBlock = tokens.slice(tokens.indexOf(`[data-theme='${DEFAULT_THEME}'] {`));

function token(name: string, block = defaultBlock) {
  return new RegExp(`--${name}: *(#[0-9a-f]{6})`).exec(block)?.[1];
}

describe('app identity', () => {
  it("gives every theme a manifest with the theme's browser bar and background (ADR-012)", () => {
    for (const id of THEME_IDS) {
      const block = tokens.slice(tokens.indexOf(`[data-theme='${id}'] {`));
      const m = manifestOf(id);
      expect(m.theme_color, id).toBe(token('color-browser-bar', block));
      expect(m.background_color, id).toBe(token('color-bg', block));
      expect(m.id, id).toBe(manifest.id);
    }
    expect(read('index.html')).toContain(`<link rel="manifest" href="${manifestPath(DEFAULT_THEME)}" />`);
  });

  it("has one theme-color, the default theme's browser bar, and no dark variant", () => {
    const html = read('index.html');
    expect(html).toContain(`<meta name="theme-color" content="${token('color-browser-bar')}" />`);
    expect(html).not.toContain('prefers-color-scheme');
    expect(tokens).not.toContain('prefers-color-scheme');
  });

  it("starts with the default theme's favicon, a file in public/", () => {
    const favicon = THEMES[DEFAULT_THEME].favicon;
    expect(read('index.html')).toContain(`<link rel="icon" type="image/svg+xml" href="${favicon}" />`);
    for (const theme of Object.values(THEMES)) expect(read(`public${theme.favicon}`)).toContain('<svg');
  });

  it('has an icon for any purpose and a maskable one, both in public/', () => {
    for (const purpose of ['any', 'maskable']) {
      const icon = manifest.icons.find((i) => i.purpose === purpose);
      expect(icon).toBeDefined();
      expect(read(`public/${icon!.src}`)).toContain(token('color-brand'));
    }
  });
});
