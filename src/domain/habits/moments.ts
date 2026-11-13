// The short moments of the feedback layer (docs/spec/telas-e-feedback.md "Momentos novos"):
// primeiro passo, dia fechado, recompensa ao alcance and recorde de streak. Pure rules; the server
// stores only what "once" needs (the day of each, the habit's best streak).
import { addDays, type Day } from '../day';
import { streakOn, type HabitHistory } from './consistency';
import { isScheduledOn, type HabitShape } from './habit';

/** A streak record is only celebrated from this size on. */
export const STREAK_RECORD_MIN = 7;

/** Primeiro passo: the member's first completion ever, from Hoje or the review. Once in a life. */
export function isFirstStep(firstStepOn: Day | null): boolean {
  return firstStepOn === null;
}

/** A habit of Hoje as the dia fechado sees it. */
export interface DayItem {
  readonly shape: HabitShape;
  readonly paused: boolean;
  readonly done: boolean;
}

/**
 * Dia fechado: every habit scheduled today (daily and weekday ones, not paused) is done, and the
 * day was not closed before. Free habits do not count; a day with nothing scheduled never closes.
 * Only a completion of today closes it, never one from the review of yesterday.
 */
export function closesDay(items: readonly DayItem[], today: Day, closedOn: Day | null): boolean {
  if (closedOn === today) return false;
  const scheduled = items.filter((item) => !item.paused && isScheduledOn(item.shape, today));
  return scheduled.length > 0 && scheduled.every((item) => item.done);
}

export interface RewardCost {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
}

/**
 * Recompensa ao alcance: the reward a gold gain brought into reach (balance below its cost before,
 * at or above after). When several did, the most expensive; ties go to the first listed.
 */
export function rewardInReach<R extends RewardCost>(before: number, after: number, rewards: readonly R[]): R | null {
  let best: R | null = null;
  for (const reward of rewards) {
    if (before < reward.cost && reward.cost <= after && (best === null || reward.cost > best.cost)) best = reward;
  }
  return best;
}

/**
 * Whether the run that included `from` still goes on at `today`: every scheduled, not frozen day
 * strictly between them was done. Today, not done yet, breaks nothing.
 */
export function unbrokenSince(history: HabitHistory, from: Day, today: Day): boolean {
  for (let day = addDays(from, 1); day < today; day = addDays(day, 1)) {
    if (!history.doneDays.has(day) && isScheduledOn(history.shape, day) && !history.isFrozen(day)) return false;
  }
  return true;
}

/** The longest run in the window up to `today` (the carry counts as the start of the first run). */
export function bestStreakUntil(history: HabitHistory, today: Day): { streak: number; on: Day } {
  let run = history.carry;
  let best = { streak: run, on: history.windowStart };
  for (let day = history.windowStart; day <= today; day = addDays(day, 1)) {
    if (history.doneDays.has(day)) run++;
    else if (day !== today && isScheduledOn(history.shape, day) && !history.isFrozen(day)) run = 0;
    if (run > best.streak) best = { streak: run, on: day };
  }
  return best;
}

/** What the server keeps per habit for the recorde de streak. */
export interface StreakRecordState {
  /** The best streak the habit ever had; null until first measured. */
  readonly best: number | null;
  /** The day `best` was last raised. */
  readonly bestOn: Day | null;
  /** The last day a record was celebrated. */
  readonly recordOn: Day | null;
}

/**
 * Recorde de streak, after a completion of a daily or weekday habit: the streak passes the best
 * the habit ever had and is at least 7. Celebrated once per run: the following days of the same
 * run raise the best silently. The first measure (a habit from before the rule) reads the best
 * from the history and celebrates nothing.
 */
export function streakRecordAfter(history: HabitHistory, today: Day, state: StreakRecordState): { state: StreakRecordState; record: number | null } {
  const streak = streakOn(history, today);
  if (state.best === null || state.bestOn === null) {
    const best = bestStreakUntil(history, today);
    // A current run that holds the best at 7 or more passed the old best unseen: its record is spent.
    const holds = streak >= best.streak;
    const spent = holds && streak >= STREAK_RECORD_MIN;
    return {
      state: { best: Math.max(best.streak, streak), bestOn: holds ? today : best.on, recordOn: spent ? today : state.recordOn },
      record: null,
    };
  }
  if (streak <= state.best) return { state, record: null };
  const celebrated = state.recordOn !== null && state.recordOn <= today && unbrokenSince(history, state.recordOn, today);
  const record = streak >= STREAK_RECORD_MIN && !celebrated ? streak : null;
  return { state: { best: streak, bestOn: today, recordOn: record !== null ? today : state.recordOn }, record };
}
