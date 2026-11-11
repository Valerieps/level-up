// Marking a habit on a day (docs/spec/registrar-o-dia.md) and what Hoje shows. The app runs the
// same step the server runs, so the screen answers at once (optimistic) and agrees afterwards.
import type { Day } from '../day';
import { canBeDoneOn, isScheduledOn, type HabitShape } from './habit';
import { goldFor, xpFor } from './progression';

/** A habit's record for one day. */
export interface DayEntry {
  readonly count: number;
  readonly done: boolean;
  readonly xp: number;
  readonly gold: number;
}

export const NOT_STARTED: DayEntry = { count: 0, done: false, xp: 0, gold: 0 };

/**
 * One tap on the marker. Below the goal it only moves the counter; reaching the goal completes the
 * day and earns XP and gold. Null when the habit cannot take another tap on that day.
 */
export function tap(habit: HabitShape & { readonly stars: number }, day: Day, entry: DayEntry = NOT_STARTED): DayEntry | null {
  if (entry.done || !canBeDoneOn(habit, day)) return null;
  const count = entry.count + 1;
  return count >= habit.dailyGoal ? complete(habit, count) : { ...entry, count };
}

/** The day completed at the habit's current size. */
export function complete(habit: { readonly difficulty: HabitShape['difficulty']; readonly stars: number }, count: number): DayEntry {
  const xp = xpFor(habit.difficulty, habit.stars);
  return { count, done: true, xp, gold: goldFor(xp) };
}

export interface TodayHabit<H> {
  readonly habit: H;
  readonly entry: DayEntry;
}

export interface TodayPlan<H> {
  /** Daily and weekday habits of the day still to do, in the member's order. */
  readonly scheduled: TodayHabit<H>[];
  /** Free habits not done today. */
  readonly free: TodayHabit<H>[];
  /** What was done today, in the member's order. */
  readonly done: TodayHabit<H>[];
  /** How many habits the day has scheduled, done or not. */
  readonly scheduledCount: number;
}

/** Splits the active habits into the sections of Hoje. */
export function planToday<H extends HabitShape>(items: readonly TodayHabit<H>[], day: Day): TodayPlan<H> {
  const scheduled: TodayHabit<H>[] = [];
  const free: TodayHabit<H>[] = [];
  const done: TodayHabit<H>[] = [];
  let scheduledCount = 0;
  for (const item of items) {
    const isScheduled = isScheduledOn(item.habit, day);
    if (isScheduled) scheduledCount++;
    if (item.entry.done) done.push(item);
    else if (isScheduled) scheduled.push(item);
    else if (item.habit.rule === 'free') free.push(item);
  }
  return { scheduled, free, done, scheduledCount };
}

/**
 * Revisar ontem (docs/spec/registrar-o-dia.md): the habits that could have been done on `day` and
 * were not, scheduled first and then free, each in the member's order.
 */
export function planReview<H extends HabitShape>(items: readonly TodayHabit<H>[], day: Day): TodayHabit<H>[] {
  const open = items.filter((item) => !item.entry.done && canBeDoneOn(item.habit, day));
  return [...open.filter((item) => item.habit.rule !== 'free'), ...open.filter((item) => item.habit.rule === 'free')];
}

/** A habit marked in the review: the whole day at once, whatever its counter had. */
export function completeInReview(habit: Pick<HabitShape, 'difficulty' | 'dailyGoal'> & { readonly stars: number }, entry: DayEntry): DayEntry {
  return complete(habit, Math.max(entry.count, habit.dailyGoal));
}
