import { strings } from '../../domain/strings';
import { pixels } from './pixel-art';
import type { ThemeVisuals } from './types';

// Stardew Valley: inspired by the cozy farm game, never copied from it. Every icon is original pixel
// art, one color (the current text color), on a 10x10 grid shown at --size-icon (2 screen pixels
// per pixel); the check and the coin, shown at --size-icon-small, on an 8x8 grid.

const SMALL = { viewBox: '0 0 8 8', fill: 'currentColor', shapeRendering: 'crispEdges' } as const;

/** A wooden sign on two posts with a pixel arrow up, in the theme's wood and parchment. */
function StardewLogo() {
  return (
    <svg className="logo" viewBox="0 0 16 16" shapeRendering="crispEdges" role="img" aria-label={strings.appName}>
      <path className="logo-plate" d="M0 2h16v10H0zM3 12h2v3H3zM11 12h2v3h-2z" />
      <path
        className="logo-pixels"
        d={pixels([
          '................',
          '................',
          '................',
          '.......##.......',
          '......####......',
          '.....######.....',
          '....########....',
          '......####......',
          '......####......',
          '......####......',
          '......####......',
        ])}
      />
    </svg>
  );
}

export const STARDEW: ThemeVisuals = {
  id: 'stardew',
  name: strings.themes.stardew,
  iconStyle: { viewBox: '0 0 10 10', fill: 'currentColor', shapeRendering: 'crispEdges' },
  icons: {
    // The sun rising behind a fence.
    today: {
      d: pixels([
        '#...##...#',
        '.#......#.',
        '...####...',
        '..######..',
        '.########.',
        '..........',
        '#..#..#..#',
        '##########',
        '#..#..#..#',
        '#..#..#..#',
      ]),
    },
    // A market stall: scalloped awning, goods on the counter.
    shop: {
      d: pixels([
        '.########.',
        '##########',
        '#.#.##.#.#',
        '.#......#.',
        '.#......#.',
        '.#.#..#.#.',
        '##########',
        '.#......#.',
        '.#......#.',
        '.##....##.',
      ]),
    },
    // A straw hat with its band.
    profile: {
      d: pixels([
        '..........',
        '..........',
        '...####...',
        '..######..',
        '..######..',
        '..#....#..',
        '##########',
        '.########.',
        '..........',
        '..........',
      ]),
    },
    // A wooden sign with a "+" cut through it.
    plus: {
      d: pixels([
        '.########.',
        '####..####',
        '####..####',
        '#........#',
        '#........#',
        '####..####',
        '####..####',
        '.########.',
        '...#..#...',
        '...#..#...',
      ]),
    },
    star: {
      d: pixels([
        '....##....',
        '....##....',
        '...####...',
        '##########',
        '.########.',
        '..######..',
        '..######..',
        '.###..###.',
        '.##....##.',
        '.#......#.',
      ]),
    },
    // A fair's prize rosette, with its two ribbons.
    automated: {
      d: pixels([
        '..######..',
        '.##....##.',
        '##.####.##',
        '#.######.#',
        '#.######.#',
        '##.####.##',
        '.##....##.',
        '..######..',
        '..##..##..',
        '.##....##.',
      ]),
    },
    check: {
      d: pixels(['........', '.......#', '......##', '#....##.', '##..##..', '.####...', '..##....', '........']),
      style: SMALL,
    },
    // A gold coin with a highlight, no relief: relief turns to mush at the small icon size.
    coin: {
      d: pixels(['..####..', '.#.####.', '#.######', '#.######', '########', '########', '.######.', '..####..']),
      style: SMALL,
    },
  },
  Logo: StardewLogo,
  favicon: '/themes/stardew/icon.svg',
};
