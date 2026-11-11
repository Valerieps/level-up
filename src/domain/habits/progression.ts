// XP, gold and level (docs/spec/progressao.md). The app and the server compute the same numbers.
import type { Difficulty } from './habit';

export const DIFFICULTY_MULTIPLIER: Readonly<Record<Difficulty, number>> = {
  trivial: 0.5,
  easy: 1,
  medium: 1.5,
  hard: 2.5,
};

export const MAX_STARS = 5;
const BASE_XP = 10;
const STAR_BONUS = 0.1;
const GOLD_PER_XP = 0.5;

/** Nearest integer, 0.5 up; float noise (16.4999999) does not flip the result. */
function round(value: number): number {
  return Math.round(Math.round(value * 1e6) / 1e6);
}

/** XP for one completion: round(10 × difficulty × Bônus de Coragem), at least 1. */
/** The XP bonus the habit's Estrelas de Coragem give, in percent: 10 per star, up to 50. */
export function starBonusPercent(stars: number): number {
  return Math.round(STAR_BONUS * 100 * Math.min(Math.max(stars, 0), MAX_STARS));
}

export function xpFor(difficulty: Difficulty, stars = 0): number {
  const bonus = 1 + STAR_BONUS * Math.min(Math.max(stars, 0), MAX_STARS);
  return Math.max(1, round(BASE_XP * DIFFICULTY_MULTIPLIER[difficulty] * bonus));
}

const MINIMUM_SHARE = 0.25;

/** XP for the versão mínima: a quarter of the full completion's XP, rounded, at least 1. */
export function minimumXpFor(difficulty: Difficulty, stars = 0): number {
  return Math.max(1, round(xpFor(difficulty, stars) * MINIMUM_SHARE));
}

/** Gold comes from the XP already rounded, so what the screen shows adds up; at least 1. */
export function goldFor(xp: number): number {
  return Math.max(1, round(xp * GOLD_PER_XP));
}

/** XP needed to go from level N to N + 1: ⌊0.25 N² + 10 N + 100⌋. */
export function xpToNext(level: number): number {
  return Math.floor(0.25 * level * level + 10 * level + 100);
}

export interface LevelProgress {
  readonly level: number;
  /** XP earned inside the current level. */
  readonly xpInLevel: number;
  /** XP the current level needs in total. */
  readonly xpForNext: number;
}

/** The level for a lifetime XP total; what passes a level carries into the next one. */
export function levelOf(xpTotal: number): LevelProgress {
  let level = 1;
  let rest = Math.max(0, Math.floor(xpTotal));
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, xpInLevel: rest, xpForNext: xpToNext(level) };
}
