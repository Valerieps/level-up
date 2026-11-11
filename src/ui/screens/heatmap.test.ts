import { describe, expect, it } from 'vitest';
import { habitCells, overallCells } from './heatmap';

describe('heatmap cells (spec/heatmap.md)', () => {
  it('tones a habit day by what was done and outlines a milestone day', () => {
    const cells = habitCells({
      from: '2026-11-01',
      to: '2026-11-11',
      days: [
        { day: '2026-11-02', fraction: 1, minimum: false, markers: [] },
        { day: '2026-11-03', fraction: 1, minimum: true, markers: [] },
        { day: '2026-11-04', fraction: 1 / 3, minimum: false, markers: [] },
        { day: '2026-11-05', fraction: 0, minimum: false, markers: ['raised'] },
      ],
    });
    expect(cells.get('2026-11-02')).toEqual({ level: 4, marked: false, text: 'feito' });
    expect(cells.get('2026-11-03')?.level).toBe(3);
    expect(cells.get('2026-11-04')).toEqual({ level: 1, marked: false, text: '33% da meta' });
    expect(cells.get('2026-11-05')).toEqual({ level: 0, marked: true, text: 'subiu a régua' });
    expect(cells.has('2026-11-06')).toBe(false);
  });

  it('counts the completions of an overall day', () => {
    const cells = overallCells({ from: '2026-11-01', to: '2026-11-11', days: [{ day: '2026-11-02', completions: 4, level: 3 }] });
    expect(cells.get('2026-11-02')).toEqual({ level: 3, marked: false, text: '4 conclusões' });
  });
});
