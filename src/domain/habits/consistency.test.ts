import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isDay } from '../day';
import { consistencyOn, isLongAgo, rhythmOn, streakOn, type HabitHistory } from './consistency';
import { markMinimum, NOT_STARTED, tap } from './day-log';
import { normalizeMinimum, type HabitShape } from './habit';
import { covers, isActive, isFrozenOn, isValidReturnDate, type PausePeriod } from './pause';
import { minimumXpFor } from './progression';

// 2026-11-09 is a Monday.
const MON = '2026-11-09';
const day = (offset: number) => addDays(MON, offset);
const MON_WED_FRI = 0b0101010;

const daily: HabitShape = { rule: 'daily', difficulty: 'easy', dailyGoal: 1, weekdays: 0 };
const gym: HabitShape = { rule: 'weekdays', difficulty: 'easy', dailyGoal: 1, weekdays: MON_WED_FRI };
const free: HabitShape = { rule: 'free', difficulty: 'easy', dailyGoal: 1, weekdays: 0 };

function history(shape: HabitShape, done: number[], extra: Partial<HabitHistory> = {}): HabitHistory {
  return { shape, windowStart: day(-60), carry: 0, doneDays: new Set(done.map(day)), isFrozen: () => false, ...extra };
}

describe('days', () => {
  it('checks and counts calendar days', () => {
    expect(isDay('2026-02-28')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('2026-2-1')).toBe(false);
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
  });
});

describe('versão mínima (spec/progressao.md, registrar-o-dia.md)', () => {
  it('pays a quarter of the XP, rounded, with gold from it', () => {
    expect(minimumXpFor('easy')).toBe(3);
    expect(minimumXpFor('trivial')).toBe(1);
    expect(minimumXpFor('hard', 5)).toBe(10);
  });

  it('completes the day at once, whatever the counter says', () => {
    const water = { ...daily, dailyGoal: 8, stars: 0, minimum: '1 copo' };
    const started = tap(water, MON, NOT_STARTED)!;
    expect(markMinimum(water, MON, started)).toEqual({ count: 1, done: true, minimum: true, xp: 3, gold: 2 });
  });

  it('does not exist for free habits, habits without one, or a day already done', () => {
    expect(markMinimum({ ...free, stars: 0, minimum: 'x' }, MON)).toBeNull();
    expect(markMinimum({ ...daily, stars: 0, minimum: null }, MON)).toBeNull();
    const reading = { ...daily, stars: 0, minimum: '1 página' };
    expect(markMinimum(reading, MON, markMinimum(reading, MON)!)).toBeNull();
    expect(markMinimum({ ...gym, stars: 0, minimum: 'x' }, day(1))).toBeNull();
  });

  it('cleans the text like the name; empty means none', () => {
    expect(normalizeMinimum('  Ler  1 página ')).toBe('Ler 1 página');
    expect(normalizeMinimum('  ')).toBeNull();
    expect(normalizeMinimum(null)).toBeNull();
    expect(normalizeMinimum('x'.repeat(81))).toBeUndefined();
    expect(normalizeMinimum(3)).toBeUndefined();
  });
});

describe('streak', () => {
  it('counts only scheduled days: gym Mon/Wed/Fri done Mon, Wed, Fri and Mon is 4', () => {
    expect(streakOn(history(gym, [0, 2, 4, 7]), day(7))).toBe(4);
  });

  it('is not broken by today still open', () => {
    expect(streakOn(history(daily, [0, 1, 2]), day(3))).toBe(3);
  });

  it('a missed scheduled day ends it', () => {
    expect(streakOn(history(daily, [0, 1, 3]), day(4))).toBe(1);
    expect(streakOn(history(daily, [0, 1, 3]), day(5))).toBe(0);
  });

  it('frozen days neither count nor break; done anyway, they count', () => {
    const frozen = new Set([day(2), day(3)]);
    const isFrozen = (d: string) => frozen.has(d);
    expect(streakOn(history(daily, [0, 1, 4], { isFrozen }), day(4))).toBe(3);
    expect(streakOn(history(daily, [0, 1, 3, 4], { isFrozen }), day(4))).toBe(4);
  });

  it('adds the carry only when the window is reached unbroken', () => {
    expect(streakOn(history(daily, [5, 6], { windowStart: day(5), carry: 7 }), day(6))).toBe(9);
    expect(streakOn(history(daily, [6], { windowStart: day(5), carry: 7 }), day(6))).toBe(1);
    expect(streakOn(history(daily, [], { windowStart: day(6), carry: 7 }), day(6))).toBe(7);
  });
});

describe('Ritmo, Última vez and "Faz tempo"', () => {
  it('counts the last 30 days, today included', () => {
    expect(rhythmOn(new Set([day(-30), day(-29), day(0)]), day(0))).toBe(2);
  });

  it('says how long ago, or null when never done', () => {
    expect(consistencyOn(history(free, [-3, -10]), day(0))).toEqual({ kind: 'rhythm', rhythm: 2, lastDoneDaysAgo: 3, longAgo: false });
    expect(consistencyOn(history(free, []), day(0))).toMatchObject({ lastDoneDaysAgo: null });
  });

  it('is "Faz tempo" after more than 10 days, not counting days in pause', () => {
    expect(isLongAgo(history(free, [-10]), day(0))).toBe(false);
    expect(isLongAgo(history(free, [-11]), day(0))).toBe(true);
    const isFrozen = (d: string) => d === day(-5);
    expect(isLongAgo(history(free, [-11], { isFrozen }), day(0))).toBe(false);
    expect(isLongAgo(history(free, [-30], { isFrozen: (d) => d === day(0) }), day(0))).toBe(false);
  });

  it('counts a never-done habit from where it started', () => {
    expect(isLongAgo(history(free, [], { windowStart: day(-11) }), day(0))).toBe(true);
    expect(isLongAgo(history(free, [], { windowStart: day(-2) }), day(0))).toBe(false);
  });
});

describe('pauses (spec/modo-pausa.md)', () => {
  const pause = (p: Partial<PausePeriod>): PausePeriod => ({ habitId: null, kind: 'pause', fromDay: day(0), untilDay: null, endedOn: null, ...p });

  it('covers from the day of pausing up to the day before the return date', () => {
    const p = pause({ untilDay: day(3) });
    expect([-1, 0, 2, 3].map((o) => covers(p, day(o)))).toEqual([false, true, true, false]);
  });

  it('still covers the day of "Voltar"', () => {
    const p = pause({ endedOn: day(2) });
    expect([2, 3].map((o) => covers(p, day(o)))).toEqual([true, false]);
    expect(isActive(p, day(2))).toBe(false);
    expect(isActive(pause({}), day(9))).toBe(true);
    expect(isActive(pause({ untilDay: day(3) }), day(3))).toBe(false);
  });

  it('freezes every habit for an app pause, one habit for its own', () => {
    const periods = [pause({ habitId: 'a', fromDay: day(0) }), pause({ fromDay: day(5) })];
    expect(isFrozenOn(periods, 'a', day(1))).toBe(true);
    expect(isFrozenOn(periods, 'b', day(1))).toBe(false);
    expect(isFrozenOn(periods, 'b', day(5))).toBe(true);
  });

  it('accepts a return date after today, or none', () => {
    expect(isValidReturnDate(null, day(0))).toBe(true);
    expect(isValidReturnDate(day(1), day(0))).toBe(true);
    expect(isValidReturnDate(day(0), day(0))).toBe(false);
    expect(isValidReturnDate('amanhã', day(0))).toBe(false);
  });
});
