// Streak, Ritmo, Última vez and "Faz tempo" (docs/spec/streak-e-dominio.md). All computed from
// the completions and the pauses; nothing here is stored (docs/ARQUITETURA.md).
import { addDays, daysBetween, type Day } from '../day';
import { isScheduledOn, type HabitShape } from './habit';

/** How many days back the Ritmo looks, today included. */
export const RHYTHM_DAYS = 30;
/** A free habit stopped for more than this many days (not counting days in pause) is "Faz tempo". */
export const LONG_AGO_DAYS = 10;

export type Consistency =
  /** Daily and weekday habits. */
  | { readonly kind: 'streak'; readonly streak: number }
  /** Free habits. `lastDoneDaysAgo` is null when never done. */
  | { readonly kind: 'rhythm'; readonly rhythm: number; readonly lastDoneDaysAgo: number | null; readonly longAgo: boolean };

export interface HabitHistory {
  readonly shape: HabitShape;
  /** Where the current size or rule started (`tier_started_on`): the streak window begins here. */
  readonly windowStart: Day;
  /** The streak carried over from before the window, when the régua changed (ADR-011). */
  readonly carry: number;
  /** The days the habit was done (goal reached or versão mínima). */
  readonly doneDays: ReadonlySet<Day>;
  /** Whether the habit was frozen on a day: paused (app or habit) or archived. */
  readonly isFrozen: (day: Day) => boolean;
}

/**
 * Scheduled days done in a row, back from `today`. Days not scheduled and frozen days neither
 * count nor break; a frozen day that was done anyway counts. Today, not done yet, does not break.
 * A missed day inside the window ends the count; reaching the window's start adds the carry.
 */
export function streakOn(history: HabitHistory, today: Day): number {
  let count = 0;
  for (let day = today; day >= history.windowStart; day = addDays(day, -1)) {
    const done = history.doneDays.has(day);
    if (done) count++;
    else if (day !== today && isScheduledOn(history.shape, day) && !history.isFrozen(day)) return count;
  }
  return count + history.carry;
}

/** Times done in the last 30 days, today included. */
export function rhythmOn(doneDays: ReadonlySet<Day>, today: Day): number {
  const first = addDays(today, -(RHYTHM_DAYS - 1));
  let count = 0;
  for (const day of doneDays) if (day >= first && day <= today) count++;
  return count;
}

export function lastDoneOn(doneDays: ReadonlySet<Day>, today: Day): Day | null {
  let last: Day | null = null;
  for (const day of doneDays) if (day <= today && (last === null || day > last)) last = day;
  return last;
}

/**
 * "Faz tempo": more than 10 days since it was last done (or since it started, when never done),
 * not counting days in pause. A habit frozen today is never "Faz tempo".
 */
export function isLongAgo(history: HabitHistory, today: Day): boolean {
  if (history.isFrozen(today)) return false;
  const since = lastDoneOn(history.doneDays, today) ?? history.windowStart;
  let stopped = 0;
  for (let day = addDays(since, 1); day <= today; day = addDays(day, 1)) {
    if (!history.isFrozen(day) && ++stopped > LONG_AGO_DAYS) return true;
  }
  return false;
}

export function consistencyOn(history: HabitHistory, today: Day): Consistency {
  if (history.shape.rule !== 'free') return { kind: 'streak', streak: streakOn(history, today) };
  const last = lastDoneOn(history.doneDays, today);
  return {
    kind: 'rhythm',
    rhythm: rhythmOn(history.doneDays, today),
    lastDoneDaysAgo: last === null ? null : daysBetween(last, today),
    longAgo: isLongAgo(history, today),
  };
}
