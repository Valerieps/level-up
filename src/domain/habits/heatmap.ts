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
