// The heatmaps (docs/spec/heatmap.md): what was done, day by day, over the last 12 months. They
// show only what was done; a day without a completion has no cell at all, so it can never look
// like a failure.
import { addDays, type Day } from '../day';

/** Days a heatmap covers, today included: one cell per day for the last 12 months. */
export const HEATMAP_DAYS = 365;

/** The first and last day a heatmap shows. */
export function heatmapRange(today: Day): { readonly from: Day; readonly to: Day } {
  return { from: addDays(today, -(HEATMAP_DAYS - 1)), to: today };
}

/** What a day's completion row says, for one habit. */
export interface DayRecord {
  readonly count: number;
  readonly done: boolean;
  readonly minimum: boolean;
}

/**
 * How full a habit's cell is, from 0 to 1. A done day is full; a day where a goal was only partly
 * reached is the fraction of the habit's current goal (always below 1); nothing marked is 0.
 */
export function habitCellFraction(record: DayRecord, dailyGoal: number): number {
  if (record.done) return 1;
  if (record.count <= 0) return 0;
  return Math.min(record.count / Math.max(1, dailyGoal), 0.99);
}

/** Intensity steps of the overall heatmap; 0 is the neutral day. */
export type OverallLevel = 0 | 1 | 2 | 3 | 4;

/** Fixed bands, so one great day never fades the others: 1, 2–3, 4–5, 6 or more completions. */
export function overallLevel(completions: number): OverallLevel {
  if (completions <= 0) return 0;
  if (completions === 1) return 1;
  if (completions <= 3) return 2;
  if (completions <= 5) return 3;
  return 4;
}

/**
 * A habit's cell tone (`OverallLevel` steps): a full day is the strongest; the versão mínima a
 * lighter tone that still reads as done; a partly reached goal a weak tone, by its fraction.
 */
export function habitCellLevel(fraction: number, minimum: boolean): OverallLevel {
  if (fraction <= 0) return 0;
  if (fraction >= 1) return minimum ? 3 : 4;
  return fraction < 0.5 ? 1 : 2;
}

/** The weekday of a day, 0 for Sunday. */
export function weekdayOf(day: Day): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

/** One column of the heatmap: a week from Sunday, null outside the range. */
export type HeatmapWeek = readonly (Day | null)[];

/**
 * The heatmap's columns, oldest first: one week per column, Sunday on top, so the first and last
 * columns may be partly empty.
 */
export function heatmapWeeks(from: Day, to: Day): HeatmapWeek[] {
  const weeks: HeatmapWeek[] = [];
  let start = addDays(from, -weekdayOf(from));
  while (start <= to) {
    const week: (Day | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      week.push(day >= from && day <= to ? day : null);
    }
    weeks.push(week);
    start = addDays(start, 7);
  }
  return weeks;
}

/**
 * Where each month's label goes: the column holding the month's first day, plus the first column.
 * A label too close to the next one (under 3 columns) is dropped so they never overlap.
 */
export function heatmapMonths(weeks: readonly HeatmapWeek[]): { readonly column: number; readonly day: Day }[] {
  const months: { column: number; day: Day }[] = [];
  weeks.forEach((week, column) => {
    const first = week.find((day): day is Day => day !== null);
    if (!first) return;
    const startsMonth = column === 0 || week.some((day) => day !== null && day.endsWith('-01'));
    if (!startsMonth) return;
    const day = week.find((d): d is Day => d !== null && d.endsWith('-01')) ?? first;
    months.push({ column, day });
  });
  return months.filter((month, i) => {
    const next = months[i + 1];
    return !next || next.column - month.column >= 3;
  });
}
