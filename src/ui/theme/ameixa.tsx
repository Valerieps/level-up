import { strings } from '../../domain/strings';
import type { DefaultThemeVisuals } from './types';

/**
 * The plate, the orange disc and the check of public/icon.svg, painted with the theme's tokens
 * (`.logo-*` in global.css) so it follows the colors of tokens.css.
 */
function AmeixaLogo() {
  return (
    <svg className="logo" viewBox="0 0 64 64" role="img" aria-label={strings.appName}>
      <rect className="logo-plate" width="64" height="64" rx="14" />
      <circle className="logo-disc" cx="32" cy="32" r="18" />
      <path className="logo-mark" d="M23.5 32.5l6 6 11-12" fill="none" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ameixa (ADR-010), the default theme: Tabler-style outline icons, stroke 2, round ends. */
export const AMEIXA: DefaultThemeVisuals = {
  id: 'ameixa',
  name: strings.themes.ameixa,
  iconStyle: {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  icons: {
    today: { d: 'M20 6 9 17l-5-5' },
    shop: { d: 'M6 7h12l-1 13H7L6 7Zm3 0a3 3 0 0 1 6 0' },
    profile: { d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0' },
    check: { d: 'M20 6 9 17l-5-5' },
    plus: { d: 'M12 5v14M5 12h14' },
    star: { d: 'M12 17.75l-6.17 3.25 1.18-6.88-5-4.87 6.9-1L12 2l3.09 6.25 6.9 1-5 4.87 1.18 6.88Z' },
    automated: {
      d: 'M12 3l2.4 1.8 3-.1.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.1L12 21l-2.4-1.8-3 .1-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .1L12 3Zm-3 9 2 2 4-4',
    },
    // The gold coin, 8-bit: an 8x8 grid of square pixels in the current text color.
    coin: {
      d: 'M2 0h4v1H2zM1 1h1v1H1zM6 1h1v1H6zM0 2h1v4H0zM7 2h1v4H7zM3 2h2v4H3zM1 6h1v1H1zM6 6h1v1H6zM2 7h4v1H2z',
      style: { viewBox: '0 0 8 8', fill: 'currentColor', shapeRendering: 'crispEdges' },
    },
  },
  Logo: AmeixaLogo,
  favicon: '/icon.svg',
};
