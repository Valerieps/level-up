// What a habit is (docs/spec/habitos.md): its time rule, size and when it shows up in Hoje.
import type { Day } from '../day';

export type Rule = 'daily' | 'weekdays' | 'free';
export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard';
export type HabitState = 'active' | 'archived';

export const RULES: readonly Rule[] = ['daily', 'weekdays', 'free'];
export const DIFFICULTIES: readonly Difficulty[] = ['trivial', 'easy', 'medium', 'hard'];

export const NAME_MAX_LENGTH = 80;
export const MAX_DAILY_GOAL = 99;

/**
 * Days of the week as a bit mask: bit 0 is Sunday … bit 6 is Saturday, like Date.getUTCDay().
 * ALL_WEEKDAYS is every day; WORK_WEEK is Monday to Friday.
 */
export const ALL_WEEKDAYS = 0b1111111;
export const WORK_WEEK = 0b0111110;
/** The order the screens list the days in: Monday first. */
export const WEEK_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

/** The size of a habit: the patamar (docs/GLOSSARIO.md). */
export interface HabitSize {
  readonly difficulty: Difficulty;
  /** Times per day; above 1 only for daily habits. */
  readonly dailyGoal: number;
  /** Weekday mask; only for weekday habits, 0 otherwise. */
  readonly weekdays: number;
}

export interface HabitShape extends HabitSize {
  readonly rule: Rule;
}

export function isRule(value: unknown): value is Rule {
  return RULES.includes(value as Rule);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

/** The name as stored: trimmed, inner spaces collapsed; null when empty or too long. */
export function normalizeHabitName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const clean = name.trim().replace(/\s+/g, ' ');
  return clean.length > 0 && clean.length <= NAME_MAX_LENGTH ? clean : null;
}

export function isValidDailyGoal(goal: unknown): goal is number {
  return Number.isInteger(goal) && (goal as number) >= 1 && (goal as number) <= MAX_DAILY_GOAL;
}

export function isValidWeekdays(mask: unknown): mask is number {
  return Number.isInteger(mask) && (mask as number) >= 1 && (mask as number) <= ALL_WEEKDAYS;
}

export function hasWeekday(mask: number, weekday: number): boolean {
  return (mask & (1 << weekday)) !== 0;
}

export function toggleWeekday(mask: number, weekday: number): number {
  return mask ^ (1 << weekday);
}

export function countWeekdays(mask: number): number {
  let count = 0;
  for (let day = 0; day < 7; day++) if (hasWeekday(mask, day)) count++;
  return count;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(day: Day): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

/**
 * The size a habit gets under `rule`: a daily habit keeps its goal (1 when it had none), a weekday
 * habit needs days, a free one has neither. Null when the rule needs days that are missing.
 */
export function shapeFor(rule: Rule, difficulty: Difficulty, dailyGoal: number, weekdays: number): HabitShape | null {
  if (rule === 'daily') return { rule, difficulty, dailyGoal: isValidDailyGoal(dailyGoal) ? dailyGoal : 1, weekdays: 0 };
  if (rule === 'weekdays') return isValidWeekdays(weekdays) ? { rule, difficulty, dailyGoal: 1, weekdays } : null;
  return { rule, difficulty, dailyGoal: 1, weekdays: 0 };
}

/** Whether the habit belongs to the Hoje section on `day`. Free habits never do: they have their own. */
export function isScheduledOn(habit: HabitShape, day: Day): boolean {
  if (habit.rule === 'daily') return true;
  if (habit.rule === 'weekdays') return hasWeekday(habit.weekdays, weekdayOf(day));
  return false;
}

/** Whether the habit can be marked on `day` at all. */
export function canBeDoneOn(habit: HabitShape, day: Day): boolean {
  return habit.rule === 'free' || isScheduledOn(habit, day);
}
