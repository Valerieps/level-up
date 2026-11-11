import { strings } from '../../domain/strings';
import type { IconStyle, ThemeVisuals } from './types';

/*
 * Ocarina, after The Legend of Zelda: Ocarina of Time (spec/temas.md). Every drawing here is our
 * own: the game's look (the Rupee's cut, a chest, a knight's shield, a fairy's sparkle, the
 * ocarina), never its art, its logo or its crests. The selo Automatizado is a parody of the
 * Triforce: three diamonds where the game has three triangles.
 */

/** The ocarina (body, mouthpiece and holes), light on the forest plate, painted with the theme's tokens (`.logo-*`). */
const OCARINA_BODY =
  'M13 40c0-11 11-22 25-22 9 0 15 5 15 12 0 12-14 22-28 22-8 0-12-4-12-12ZM19 30l-8-7 5-5 9 7';

function OcarinaLogo() {
  return (
    <svg className="logo" viewBox="0 0 64 64" role="img" aria-label={strings.appName}>
      <rect className="logo-plate" width="64" height="64" rx="10" />
      <path className="logo-light" d={OCARINA_BODY} />
      <g className="logo-cut" fill="none" strokeWidth="3">
        <circle cx="31" cy="30" r="2" />
        <circle cx="39" cy="28" r="2" />
        <circle cx="45" cy="33" r="2" />
        <circle cx="27" cy="41" r="2" />
      </g>
    </svg>
  );
}

/** Angular outlines: stroke 2, square ends and mitered corners, cut like gems and stone. */
const ICON_STYLE: IconStyle = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
};

export const OCARINA: ThemeVisuals = {
  id: 'ocarina',
  name: strings.themes.ocarina,
  iconStyle: ICON_STYLE,
  icons: {
    // Hoje: a scroll, the day's quests.
    today: { d: 'M9 3h10a2 2 0 0 1 0 4h-2v12a2 2 0 0 1-2 2H5a2 2 0 0 1 0-4h2V5a2 2 0 0 1 2-2ZM7 17h8M10 10h4M10 13h4' },
    // Loja: a treasure chest, arched lid and latch.
    shop: { d: 'M4 11V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M3 11h18v9H3ZM10 10h4v4h-4ZM3 15h7M14 15h7' },
    // Perfil: a knight's shield with a plain cross, no crest.
    profile: { d: 'M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-3ZM12 7v10M8 11h8' },
    // Feito: a check drawn like a quill stroke.
    check: { d: 'M4 13c2 0 4 2 5 5 3-7 6-10 11-12' },
    // "+": a heraldic cross, its ends barred.
    plus: { d: 'M12 4v16M4 12h16M9 4h6M9 20h6M4 9v6M20 9v6' },
    // Estrela: a fairy's four-point sparkle.
    star: { d: 'M12 3c.8 5.2 3.8 8.2 9 9-5.2.8-8.2 3.8-9 9-.8-5.2-3.8-8.2-9-9 5.2-.8 8.2-3.8 9-9Z' },
    // Automatizado: the Triforce parody, three diamonds.
    automated: { d: 'M12 2l4 4.5-4 4.5-4-4.5ZM8 11l4 4.5L8 20l-4-4.5ZM16 11l4 4.5-4 4.5-4-4.5Z' },
    // Ouro: a Rupee, a long hexagonal gem with its facets, always green.
    coin: {
      d: 'M12 2l6 5v10l-6 5-6-5V7ZM12 6.5l2.5 2v7l-2.5 2-2.5-2v-7ZM12 2v4.5M12 17.5V22M18 7l-3.5 1.5M6 7l3.5 1.5M18 17l-3.5-1.5M6 17l3.5-1.5',
      style: { ...ICON_STYLE, strokeWidth: 1.5, strokeLinejoin: 'bevel', tone: 'currency' },
    },
  },
  Logo: OcarinaLogo,
  favicon: '/themes/ocarina/favicon.svg',
};
