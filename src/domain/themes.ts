// The visual themes a member may pick (ADR-012). Only the ids live here: the server validates a
// member's choice against them, and the app maps each id to its look in src/ui/theme/themes.ts.
// A theme changes only visuals, never words.

/** Every theme the app ships, the default first. */
export const THEME_IDS = ['ameixa', 'stardew', 'ocarina', 'uppertale', 'arcoiro'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** The look a member has until they pick another, and the fallback for an unknown id. */
export const DEFAULT_THEME: ThemeId = 'ameixa';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}
