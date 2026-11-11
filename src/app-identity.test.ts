import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME } from './domain/themes';
import { THEMES } from './ui/theme/themes';

/**
 * The app identity files (manifest, installed icons, theme-color, favicon) follow the DEFAULT
 * theme's palette in tokens.css. The installed icon never follows the member's theme (ADR-012);
 * the favicon and the browser bar do, at runtime.
 */

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
  theme_color: string;
  background_color: string;
  icons: { src: string; purpose: string }[];
};
const tokens = read('src/ui/theme/tokens.css');
// The default theme's block: it opens with ":root," and its own [data-theme] selector.
const defaultBlock = tokens.slice(tokens.indexOf(`[data-theme='${DEFAULT_THEME}'] {`));

function token(name: string) {
  return new RegExp(`--${name}: *(#[0-9a-f]{6})`).exec(defaultBlock)?.[1];
}

describe('app identity', () => {
  it('uses the brand and the background of the default theme in the manifest', () => {
    expect(manifest.theme_color).toBe(token('color-brand'));
    expect(manifest.background_color).toBe(token('color-bg'));
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
