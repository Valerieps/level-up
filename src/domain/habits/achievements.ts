// Conquistas (docs/spec/conquistas.md): the Automatizados and Coragem tracks, their milestones and
// prizes. Both counts only grow, so a milestone once reached stays reached.

export type Track = 'automated' | 'courage';

export const TRACKS: readonly Track[] = ['automated', 'courage'];

export interface Milestone {
  /** 1 to 6. */
  readonly milestone: number;
  /** Habits automated (Automatizados) or stars (Coragem) it takes. */
  readonly target: number;
  readonly gold: number;
}

const GOLD = [50, 100, 150, 250, 400, 600];
const TARGETS: Readonly<Record<Track, readonly number[]>> = {
  automated: [1, 3, 5, 10, 20, 35],
  courage: [1, 5, 10, 20, 35, 50],
};

export const MILESTONES: Readonly<Record<Track, readonly Milestone[]>> = {
  automated: TARGETS.automated.map((target, i) => ({ milestone: i + 1, target, gold: GOLD[i] })),
  courage: TARGETS.courage.map((target, i) => ({ milestone: i + 1, target, gold: GOLD[i] })),
};

/** The milestones a count has reached, in order. */
export function reachedMilestones(track: Track, count: number): Milestone[] {
  return MILESTONES[track].filter((m) => count >= m.target);
}

/** The next milestone to reach, or null when the track is complete. */
export function nextMilestone(track: Track, count: number): Milestone | null {
  return MILESTONES[track].find((m) => count < m.target) ?? null;
}
