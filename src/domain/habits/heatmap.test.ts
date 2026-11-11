import { describe, expect, it } from 'vitest';
import { daysBetween } from '../day';
import { habitCellFraction, heatmapRange, overallLevel } from './heatmap';

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
});
