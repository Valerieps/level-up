// Marking a habit on a day (docs/spec/registrar-o-dia.md) and what Hoje shows. The app runs the
// same step the server runs, so the screen answers at once (optimistic) and agrees afterwards.
import type { Day } from '../day';
import type { Consistency } from './consistency';
import { canBeDoneOn, isScheduledOn, type HabitShape } from './habit';
import { goldFor, minimumXpFor, xpFor } from './progression';

/** A habit's record for one day. */
export interface DayEntry {
  readonly count: number;
  readonly done: boolean;
  /** The day was done with the versão mínima (docs/spec/registrar-o-dia.md). */
  readonly minimum: boolean;
  readonly xp: number;
  readonly gold: number;
}

export const NOT_STARTED: DayEntry = { count: 0, done: false, minimum: false, xp: 0, gold: 0 };

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
  return { count, done: true, minimum: false, xp, gold: goldFor(xp) };
}

/**
 * The versão mínima: completes the day at once, whatever the counter says, for a quarter of the
 * XP. Null when the habit has no versão mínima (free habits never do) or the day cannot take it.
 */
export function markMinimum(
  habit: HabitShape & { readonly stars: number; readonly minimum: string | null },
  day: Day,
  entry: DayEntry = NOT_STARTED,
): DayEntry | null {
  if (entry.done || habit.minimum === null || habit.rule === 'free' || !canBeDoneOn(habit, day)) return null;
  const xp = minimumXpFor(habit.difficulty, habit.stars);
  return { count: entry.count, done: true, minimum: true, xp, gold: goldFor(xp) };
}

export interface TodayHabit<H> {
  readonly habit: H;
  readonly entry: DayEntry;
}

/** What Hoje needs beyond the shape: a running pause and, for free habits, "Faz tempo". */
export interface TodayHabitShape extends HabitShape {
  readonly paused?: boolean;
  readonly consistency?: Consistency;
}

export interface TodayPlan<H> {
  /** Daily and weekday habits of the day still to do, not paused, in the member's order. */
  readonly scheduled: TodayHabit<H>[];
  /** Habits of the day in a running pause, still to do: at the end of Hoje, as optional. */
  readonly paused: TodayHabit<H>[];
  /** Free habits not done today: the "Faz tempo" first, then the rest in the member's order. */
  readonly free: TodayHabit<H>[];
  /** What was done today, in the member's order. */
  readonly done: TodayHabit<H>[];
  /** How many habits the day has scheduled and not paused, done or not. */
  readonly scheduledCount: number;
}

const isLongAgo = (habit: TodayHabitShape) => habit.consistency?.kind === 'rhythm' && habit.consistency.longAgo;

/** Splits the active habits into the sections of Hoje (docs/spec/telas-e-feedback.md "Hoje"). */
export function planToday<H extends TodayHabitShape>(items: readonly TodayHabit<H>[], day: Day): TodayPlan<H> {
  const scheduled: TodayHabit<H>[] = [];
  const paused: TodayHabit<H>[] = [];
  const free: TodayHabit<H>[] = [];
  const done: TodayHabit<H>[] = [];
  let scheduledCount = 0;
  for (const item of items) {
    const isScheduled = isScheduledOn(item.habit, day);
    const isPaused = item.habit.paused === true;
    if (isScheduled && !isPaused) scheduledCount++;
    if (item.entry.done) done.push(item);
    else if (isScheduled) (isPaused ? paused : scheduled).push(item);
    else if (item.habit.rule === 'free') free.push(item);
  }
  // A stable sort: the "Faz tempo" rise to the top, each group keeps the member's order.
  free.sort((a, b) => Number(isLongAgo(b.habit)) - Number(isLongAgo(a.habit)));
  return { scheduled, paused, free, done, scheduledCount };
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
