import { strings } from '../../domain/strings';
import { pixels } from './pixel-art';
import type { ThemeVisuals } from './types';

// Uppertale: a parody of the indie RPG, never copied from it. Every icon is original pixel art, one
// color (the current text color), on a 10x10 grid shown at --size-icon (2 screen pixels per pixel);
// the coin, shown at --size-icon-small, on an 8x8 grid. The soul (a heart) is the habit marker,
// drawn by tokens.css (--clip-marker), so the check draws nothing: the filled heart is the sign.

const SMALL = { viewBox: '0 0 8 8', fill: 'currentColor', shapeRendering: 'crispEdges' } as const;

/** A soul: a white pixel heart on the black screen. */
function UppertaleLogo() {
  return (
    <svg className="logo" viewBox="0 0 16 16" shapeRendering="crispEdges" role="img" aria-label={strings.appName}>
      <path className="logo-plate" d="M0 0h16v16H0z" />
      <path
        className="logo-pixels"
        d={pixels([
          '................',
          '................',
          '...####..####...',
          '...####..####...',
          '.##############.',
          '.##############.',
          '.##############.',
          '.##############.',
          '...##########...',
          '...##########...',
          '.....######.....',
          '.....######.....',
          '.......##.......',
          '.......##.......',
        ])}
      />
    </svg>
  );
}

export const UPPERTALE: ThemeVisuals = {
  id: 'uppertale',
  name: strings.themes.uppertale,
  iconStyle: { viewBox: '0 0 10 10', fill: 'currentColor', shapeRendering: 'crispEdges' },
  icons: {
    // A dialog box: "* ..." on the day's first line.
    today: {
      d: pixels([
        '..........',
        '##########',
        '#........#',
        '#.#.#.##.#',
        '#..#.....#',
        '#.#.#.##.#',
        '#........#',
        '##########',
        '..........',
        '..........',
      ]),
    },
    // A sack of items, tied at the top, a gem cut out of it.
    shop: {
      d: pixels([
        '..#....#..',
        '...####...',
        '...####...',
        '..######..',
        '.########.',
        '####..####',
        '###.##.###',
        '####..####',
        '##########',
        '.########.',
      ]),
    },
    // Anyone: a head and shoulders, no face.
    profile: {
      d: pixels([
        '...####...',
        '..######..',
        '..######..',
        '..######..',
        '...####...',
        '..........',
        '..######..',
        '.########.',
        '##########',
        '##########',
      ]),
    },
    plus: {
      d: pixels([
        '....##....',
        '....##....',
        '....##....',
        '....##....',
        '##########',
        '##########',
        '....##....',
        '....##....',
        '....##....',
        '....##....',
      ]),
    },
    // A save point's twinkle.
    star: {
      d: pixels([
        '....##....',
        '....##....',
        '...####...',
        '..######..',
        '##########',
        '##########',
        '..######..',
        '...####...',
        '....##....',
        '....##....',
      ]),
    },
    // A soul full of determination: a heart with a shine and a sparkle in each corner.
    automated: {
      d: pixels([
        '#........#',
        '..##..##..',
        '.##.#####.',
        '.#.######.',
        '.########.',
        '..######..',
        '...####...',
        '....##....',
        '..........',
        '#........#',
      ]),
    },
    check: { d: '' },
    // A gold coin with a "G" cut out of it.
    coin: {
      d: pixels(['..####..', '.######.', '##....##', '##.#####', '##.#..##', '##....##', '.######.', '..####..']),
      style: SMALL,
    },
  },
  Logo: UppertaleLogo,
  favicon: '/themes/uppertale/icon.svg',
};
