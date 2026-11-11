import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from '../../domain/themes';
import { AMEIXA } from './ameixa';
import { applyTheme, rememberTheme } from './apply-theme';
import type { IconDrawing, IconStyle, ThemedIconName, ThemeVisuals } from './types';

/**
 * The look of every theme id the server accepts (ADR-012). Keyed by ThemeId, so a theme added to
 * src/domain/themes.ts without visuals here is a compile error. Its tokens live in tokens.css.
 */
export const THEMES: Readonly<Record<ThemeId, ThemeVisuals>> = {
  ameixa: AMEIXA,
};

/** The registered themes, in the order of THEME_IDS (the default first): the Tema picker's list. */
export const THEME_LIST: readonly ThemeVisuals[] = THEME_IDS.map((id) => THEMES[id]);

export const DEFAULT_VISUALS = AMEIXA;

/** The theme's drawing of an icon, or the default theme's when it does not redraw it. */
export function themedIcon(theme: ThemeVisuals, name: ThemedIconName): { d: string; style: IconStyle } {
  const own: IconDrawing | undefined = theme.icons[name];
  if (own) return { d: own.d, style: own.style ?? theme.iconStyle };
  const fallback = DEFAULT_VISUALS.icons[name];
  return { d: fallback.d, style: fallback.style ?? DEFAULT_VISUALS.iconStyle };
}

/** The active theme's visuals. Without a provider (tests), the default theme. */
export const ThemeVisualsContext = createContext<ThemeVisuals>(DEFAULT_VISUALS);

export function useThemeVisuals(): ThemeVisuals {
  return useContext(ThemeVisualsContext);
}

interface ThemeControl {
  readonly theme: ThemeId;
  /** Shows a theme now: <html data-theme>, the favicon, the browser bar, the device's memory. */
  readonly show: (theme: ThemeId) => void;
}

const ThemeControlContext = createContext<ThemeControl>({ theme: DEFAULT_THEME, show: () => {} });

export function useThemeControl(): ThemeControl {
  return useContext(ThemeControlContext);
}

/**
 * Holds the theme on screen. `initial` is the one main.tsx already applied before the first render
 * (the device's last known theme); the member's stored theme replaces it once loaded.
 */
export function ThemeProvider({ initial, children }: { initial: ThemeId; children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(initial);

  useLayoutEffect(() => {
    applyTheme(theme, THEMES[theme].favicon);
    rememberTheme(theme);
  }, [theme]);

  const show = useCallback((next: ThemeId) => setTheme(next), []);
  const control = useMemo(() => ({ theme, show }), [theme, show]);

  return (
    <ThemeControlContext.Provider value={control}>
      <ThemeVisualsContext.Provider value={THEMES[theme]}>{children}</ThemeVisualsContext.Provider>
    </ThemeControlContext.Provider>
  );
}
