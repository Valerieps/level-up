import type { ComponentType } from 'react';

/**
 * Icons a theme may redraw (ADR-012): the tab bar's, the marker's check, the "+", the star, the selo
 * Automatizado and the coin. Every other icon is functional (src/ui/components/Icon.tsx) and looks
 * the same in every theme.
 */
export const THEMED_ICONS = ['today', 'shop', 'profile', 'check', 'plus', 'star', 'automated', 'coin'] as const;

export type ThemedIconName = (typeof THEMED_ICONS)[number];

/** How a theme draws its icons: the SVG attributes every one of its paths gets. */
export interface IconStyle {
  readonly viewBox: string;
  /** Outline icons: 'none' plus a stroke; filled or pixel icons: 'currentColor' and no stroke. */
  readonly fill: 'none' | 'currentColor';
  readonly stroke?: 'currentColor';
  readonly strokeWidth?: number;
  readonly strokeLinecap?: 'round' | 'square' | 'butt';
  readonly strokeLinejoin?: 'round' | 'miter' | 'bevel';
  /** 'crispEdges' for pixel art. */
  readonly shapeRendering?: 'auto' | 'crispEdges' | 'geometricPrecision';
}

/** One icon: its path, and its own style when it differs from the theme's (the 8-bit coin). */
export interface IconDrawing {
  readonly d: string;
  readonly style?: IconStyle;
}

/**
 * What the app needs to show a theme, besides its tokens in tokens.css (`[data-theme='<id>']`).
 * Colors never appear here: the browser bar reads `--color-browser-bar`, the swatch and the logo
 * paint with the theme's tokens.
 */
export interface ThemeVisuals {
  readonly id: string;
  /** Shown in the Tema picker (pt-BR, from strings.ts). */
  readonly name: string;
  readonly iconStyle: IconStyle;
  /** The icons this theme redraws; the rest fall back to the default theme's drawing and style. */
  readonly icons: Partial<Record<ThemedIconName, IconDrawing>>;
  /** The in-app logo, painted with the theme's tokens. */
  readonly Logo: ComponentType;
  /** The tab's icon, under public/. The installed app's icon (manifest) never changes. */
  readonly favicon: string;
}

/** The default theme draws every themed icon, so any other can fall back to it. */
export interface DefaultThemeVisuals extends ThemeVisuals {
  readonly icons: Record<ThemedIconName, IconDrawing>;
}
