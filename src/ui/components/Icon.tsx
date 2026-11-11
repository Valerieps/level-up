import { DEFAULT_VISUALS, themedIcon, useThemeVisuals } from '../theme/themes';
import type { IconStyle, ThemedIconName } from '../theme/types';

// The app's icons, in the current text color. The size comes from the `.icon` class (--size-icon);
// they are decorative, so the text next to them names the action. Two kinds (ADR-012):
// - functional icons (below) are the same in every theme, drawn in the default theme's style;
// - themed icons (src/ui/theme/types.ts) come from the active theme, falling back to the default.

/** Functional icons: navigation and actions, recognizable in every theme. */
const FUNCTIONAL = {
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  back: 'M15 18l-6-6 6-6',
  chevron: 'M6 9l6 6 6-6',
  pause: 'M9 5v14M15 5v14',
  play: 'M7 5v14l12-7L7 5Z',
  arrowUp: 'M12 19V5m-6 6 6-6 6 6',
  arrowDown: 'M12 5v14m6-6-6 6-6-6',
  edit: 'M4 20h4L18.5 9.5a2.828 2.828 0 1 0-4-4L4 16v4M13.5 6.5l4 4',
  archive: 'M3 4h18v4H3zM5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4',
} as const;

export type FunctionalIconName = keyof typeof FUNCTIONAL;

/** Every name `Icon` takes; a typo is a compile error. The coin has its own `CoinIcon`. */
export type IconName = FunctionalIconName | Exclude<ThemedIconName, 'coin'>;

function isFunctional(name: IconName): name is FunctionalIconName {
  return Object.hasOwn(FUNCTIONAL, name);
}

function Svg({ d, style }: { d: string; style: IconStyle }) {
  return (
    <svg
      className="icon"
      viewBox={style.viewBox}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      strokeLinecap={style.strokeLinecap}
      strokeLinejoin={style.strokeLinejoin}
      shapeRendering={style.shapeRendering}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

/** The gold coin of the active theme (8-bit in Ameixa). */
export function CoinIcon() {
  const theme = useThemeVisuals();
  return <Svg {...themedIcon(theme, 'coin')} />;
}

export function Icon({ name }: { name: IconName }) {
  const theme = useThemeVisuals();
  if (isFunctional(name)) return <Svg d={FUNCTIONAL[name]} style={DEFAULT_VISUALS.iconStyle} />;
  return <Svg {...themedIcon(theme, name)} />;
}
