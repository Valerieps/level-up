import { describe, expect, it } from 'vitest';
import { daysBetween } from '../day';
import { habitCellFraction, habitCellLevel, heatmapMonths, heatmapRange, heatmapWeeks, overallLevel } from './heatmap';

describe('heatmap (spec/heatmap.md)', () => {
  it('covers the last 12 months, today included', () => {
    const range = heatmapRange('2026-11-11');
    expect(range).toEqual({ from: '2025-11-12', to: '2026-11-11' });
    expect(daysBetween(range.from, range.to)).toBe(364);
  });

  it('fills a done day, the versão mínima included, and a partial goal by its fraction', () => {
    expect(habitCellFraction({ count: 1, done: true, minimum: false }, 1)).toBe(1);
    expect(habitCellFraction({ count: 0, done: true, minimum: true }, 3)).toBe(1);
    expect(habitCellFraction({ count: 1, done: false, minimum: false }, 3)).toBeCloseTo(1 / 3);
    expect(habitCellFraction({ count: 5, done: false, minimum: false }, 3)).toBeLessThan(1);
    expect(habitCellFraction({ count: 0, done: false, minimum: false }, 3)).toBe(0);
  });

  it('bands the overall count: 1, 2–3, 4–5, 6 or more', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(overallLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('tones a habit cell: full, versão mínima lighter, partial goal weak', () => {
    expect(habitCellLevel(1, false)).toBe(4);
    expect(habitCellLevel(1, true)).toBe(3);
    expect(habitCellLevel(2 / 3, false)).toBe(2);
    expect(habitCellLevel(1 / 3, false)).toBe(1);
    expect(habitCellLevel(0, false)).toBe(0);
  });

  it('lays the days out in weeks from Sunday, blank outside the range', () => {
    // 2026-11-11 is a Wednesday.
    const weeks = heatmapWeeks('2026-11-04', '2026-11-11');
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toEqual([null, null, null, '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
    expect(weeks[1]).toEqual(['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', null, null, null]);
    const year = heatmapWeeks(heatmapRange('2026-11-11').from, '2026-11-11');
    expect(year.flat().filter(Boolean)).toHaveLength(365);
  });

  it('labels the first column and each month start, never two labels too close', () => {
    const range = heatmapRange('2026-11-11');
    const months = heatmapMonths(heatmapWeeks(range.from, range.to));
    expect(months[0]?.column).toBe(0);
    expect(months.every((m, i) => i === 0 || m.column - months[i - 1]!.column >= 3)).toBe(true);
    expect(months.map((m) => m.day.slice(5, 7))).toContain('06');
  });
});
