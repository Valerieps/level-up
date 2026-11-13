// Domínio and the selo Automatizado (docs/spec/streak-e-dominio.md) and the Prêmio de Domínio
// (docs/spec/progressao.md). The window is computed from the completions and the pauses; only the
// moment of mastery is stored, because the selo and the prize are permanent.
import { addDays, type Day } from '../day';
import type { HabitHistory } from './consistency';
import { isScheduledOn } from './habit';
import { xpFor } from './progression';
import type { Difficulty } from './habit';

/** Daily and weekday habits: done in 12 of the last 14 scheduled occurrences. */
export const MASTERY_WINDOW = 14;
export const MASTERY_NEEDED = 12;
/** At most this many of the occurrences counted can be the versão mínima. */
export const MASTERY_MAX_MINIMUM = 2;
/** Free habits: 14 completions since the window started. */
export const FREE_MASTERY_NEEDED = 14;
/** The Prêmio de Domínio is this many times the XP of one completion at the mastered patamar. */
export const MASTERY_PRIZE_FACTOR = 5;

/** What the mastery window needs besides the streak's history: which days were the versão mínima. */
export interface MasteryHistory extends HabitHistory {
  readonly minimumDays: ReadonlySet<Day>;
}

export interface MasteryProgress {
  /** Occurrences (or completions, for free habits) that count towards mastery now. */
  readonly done: number;
  /** How many it takes. */
  readonly needed: number;
  /** Whether the window reaches mastery now. */
  readonly reached: boolean;
}

/**
 * The scheduled occurrences inside the window, newest first, at most `limit`: days of the current
 * patamar, not frozen (a frozen day that was done counts), today only once done.
 */
export function recentOccurrences(history: HabitHistory, today: Day, limit: number): Day[] {
  const days: Day[] = [];
  for (let day = today; day >= history.windowStart && days.length < limit; day = addDays(day, -1)) {
    if (!isScheduledOn(history.shape, day)) continue;
    const done = history.doneDays.has(day);
    if (!done && (day === today || history.isFrozen(day))) continue;
    days.push(day);
  }
  return days;
}

export function masteryOn(history: MasteryHistory, today: Day): MasteryProgress {
  if (history.shape.rule === 'free') {
    let done = 0;
    for (const day of history.doneDays) if (day >= history.windowStart && day <= today) done++;
    return { done, needed: FREE_MASTERY_NEEDED, reached: done >= FREE_MASTERY_NEEDED };
  }
  let done = 0;
  let minimums = 0;
  for (const day of recentOccurrences(history, today, MASTERY_WINDOW)) {
    if (!history.doneDays.has(day)) continue;
    if (!history.minimumDays.has(day)) done++;
    else if (minimums < MASTERY_MAX_MINIMUM) {
      minimums++;
      done++;
    }
  }
  return { done, needed: MASTERY_NEEDED, reached: done >= MASTERY_NEEDED };
}

/** The gold paid once per patamar on mastering it: 5 × the XP of one completion there. */
export function masteryPrize(difficulty: Difficulty, stars: number): number {
  return MASTERY_PRIZE_FACTOR * xpFor(difficulty, stars);
}

/**
 * "10 of 12 on the way to Automatizado" while the current patamar is not mastered; null once it is
 * (docs/spec/telas-e-feedback.md "Detalhe do hábito"). The count is the domain's own, so it never
 * passes the total.
 */
export function masteryPath(mastery: { readonly done: number; readonly needed: number }, tierMastered: boolean): { done: number; needed: number } | null {
  if (tierMastered) return null;
  return { done: Math.max(0, Math.min(mastery.done, mastery.needed)), needed: mastery.needed };
}
