import { strings } from '../../domain/strings';
import type { IconStyle, ThemeVisuals } from './types';

/*
 * Arco Iro: a unicorn with too much personality, a rainbow taken almost as a joke (spec/temas.md).
 * Not a game: every drawing is our own. The habit marker is a unicorn head drawn by tokens.css
 * (--clip-marker) that fills with rainbow, so the check draws nothing: the filled head is the sign.
 */

/** The mane's strands, back to front, each in one rainbow color (`.logo-band-*`). */
const MANE = [
  'M50 26C36 44 40 70 26 92',
  'M46 28C32 47 35 72 23 93',
  'M42 30C28 50 30 74 20 94',
  'M38 32C24 53 25 76 17 95',
  'M34 34C20 56 20 78 14 96',
];

const HEAD = 'M44 42C44 26 64 20 76 30C88 40 102 58 104 72C106 86 94 92 84 88C76 85 68 88 60 94C50 100 38 92 38 80Z';

/** The unicorn in sunglasses on the ink plate, painted with the theme's tokens (`.logo-*`). */
function ArcoIroLogo() {
  return (
    <svg className="logo" viewBox="0 0 120 120" role="img" aria-label={strings.appName}>
      <rect className="logo-plate" width="120" height="120" rx="26" />
      <g fill="none" strokeWidth="8" strokeLinecap="round">
        {MANE.map((d, i) => (
          <path key={d} className={`logo-band-${i + 1}`} d={d} />
        ))}
      </g>
      <path className="logo-horn logo-cut" d="M62 32 76 4l-4 32Z" strokeWidth="3" strokeLinejoin="round" />
      <path className="logo-light logo-cut" d={HEAD} strokeWidth="3" strokeLinejoin="round" />
      <path className="logo-light logo-cut" d="M50 34l4-16 8 12" strokeWidth="3" strokeLinejoin="round" />
      <path className="logo-ink" d="M58 46h34v3h-2v4a7 7 0 0 1-7 7H67a7 7 0 0 1-7-7v-4h-2Z" />
      <circle className="logo-ink" cx="96" cy="76" r="2.5" />
      <path className="logo-cut" d="M80 84q8 4 14-2" fill="none" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Round, chunky outlines: stroke 2, round ends and corners. */
const ICON_STYLE: IconStyle = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const ARCOIRO: ThemeVisuals = {
  id: 'arcoiro',
  name: strings.themes.arcoiro,
  iconStyle: ICON_STYLE,
  icons: {
    // Hoje: a rainbow, three arches over the horizon.
    today: { d: 'M2 19a10 10 0 0 1 20 0M6 19a6 6 0 0 1 12 0M10 19a2 2 0 0 1 4 0' },
    // Loja: an ice cream cone.
    shop: { d: 'M7 10a5 5 0 0 1 10 0M6 10h12l-6 11ZM9 14h6' },
    // Perfil: a unicorn head in profile, the marker's shape.
    profile: {
      d: 'M6 22.5C3.8 18 3.8 11.3 6.8 8.3L8.3 3l2.2 3.8 1.5-.4 6-5.6-3.7 7.5c3 2.2 6 5.2 7.5 8.2.7 2.3-.8 4.5-3 3.8l-4.5-.8c-1.5.8-2.3 2.3-3 3ZM14.3 12h.01',
    },
    // Feito: nothing; the marker's head fills with rainbow instead.
    check: { d: '' },
    // Estrela: a four-point sparkle.
    star: { d: 'M12 3c.8 5.2 3.8 8.2 9 9-5.2.8-8.2 3.8-9 9-.8-5.2-3.8-8.2-9-9 5.2-.8 8.2-3.8 9-9Z' },
    // Automatizado: a unicorn horn, its spiral.
    automated: { d: 'M12 2 7 21h10ZM8.6 15.6l6.6-2M9.7 11.2l4.4-1.4M10.9 6.8l2-.7' },
  },
  Logo: ArcoIroLogo,
  favicon: '/themes/arcoiro/favicon.svg',
};
