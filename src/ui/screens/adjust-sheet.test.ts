import { describe, expect, it } from 'vitest';
import { adjustOptions, isValidAdjustedDays, splitOptions } from './adjust-sheet';

const MON_WED_FRI = 0b0101010;
const reading = { rule: 'weekdays', difficulty: 'medium', dailyGoal: 1, weekdays: MON_WED_FRI, paused: false } as const;

describe('Ajustar a régua (spec/regua.md)', () => {
  it('offers only what applies to the habit', () => {
    expect(adjustOptions(reading)).toEqual(['lower', 'minimum', 'days', 'free', 'pause']);
    expect(adjustOptions({ ...reading, rule: 'daily', difficulty: 'trivial', weekdays: 0 })).toEqual(['minimum', 'free', 'pause']);
    expect(adjustOptions({ ...reading, paused: true })).not.toContain('pause');
  });

  it('puts the useful options first for each answer, and keeps every option in sight', () => {
    const all = adjustOptions(reading);
    expect(splitOptions(all, 'big')).toEqual({ useful: ['lower', 'minimum'], others: ['days', 'free', 'pause'] });
    expect(splitOptions(all, 'days').useful).toEqual(['days', 'free']);
    expect(splitOptions(all, 'busy').useful).toEqual(['minimum', 'pause']);
    expect(splitOptions(all, 'unsure')).toEqual({ useful: [], others: all });
    expect(splitOptions(all, null)).toEqual({ useful: [], others: all });
  });

  it('changes the days to the same total or fewer, never more', () => {
    expect(isValidAdjustedDays(MON_WED_FRI, 0b1010100)).toBe(true);
    expect(isValidAdjustedDays(MON_WED_FRI, 0b0000010)).toBe(true);
    expect(isValidAdjustedDays(MON_WED_FRI, MON_WED_FRI)).toBe(false);
    expect(isValidAdjustedDays(MON_WED_FRI, 0b0101011)).toBe(false);
    expect(isValidAdjustedDays(MON_WED_FRI, 0)).toBe(false);
  });
});
