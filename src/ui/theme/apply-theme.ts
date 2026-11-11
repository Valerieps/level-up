// Putting a theme on the page (ADR-012). No inline script: the CSP blocks it (ADR-002), so main.tsx
// calls `applyTheme(rememberedTheme())` before React's first render, and the member's stored theme
// replaces it once the server answers.
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../../domain/themes';

/** The last theme this device showed, so the next start opens in it. */
export const THEME_KEY = 'levelup.theme';

/** The parts of `document` a theme touches; tests pass a fake. */
export interface ThemeDocument {
  readonly documentElement: HTMLElement;
  querySelector(selector: string): Element | null;
}

/**
 * Sets `data-theme` on <html> (the token block of tokens.css), the tab's favicon and the browser
 * bar's color, which comes from the theme's `--color-browser-bar` token, never from a literal. The
 * web app manifest is one for every theme (ADR-012): Android fixes the installed app's bars from it.
 */
export function applyTheme(
  theme: ThemeId,
  favicon: string,
  doc: ThemeDocument = document,
  readToken: (name: string) => string = (name) => getComputedStyle(doc.documentElement).getPropertyValue(name),
): void {
  doc.documentElement.dataset.theme = theme;
  doc.querySelector('link[rel="icon"]')?.setAttribute('href', favicon);
  const bar = readToken('--color-browser-bar').trim();
  if (bar) replaceWithAttribute(doc.querySelector('meta[name="theme-color"]'), 'content', bar);
}

/** Android Chrome reliably re-reads a <meta theme-color> only when the element is replaced. */
function replaceWithAttribute(element: Element | null, name: string, value: string): void {
  if (!element) return;
  const fresh = element.cloneNode(false) as Element;
  fresh.setAttribute(name, value);
  element.replaceWith(fresh);
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function localStore(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The device's last theme, or the default when there is none, it is unknown or storage is off. */
export function rememberedTheme(store: Store | null = localStore()): ThemeId {
  try {
    const value = store?.getItem(THEME_KEY);
    return isThemeId(value) ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function rememberTheme(theme: ThemeId, store: Store | null = localStore()): void {
  try {
    store?.setItem(THEME_KEY, theme);
  } catch {
    // Private mode: the next start shows the default until the server answers.
  }
}
