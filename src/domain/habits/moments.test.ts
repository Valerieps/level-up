import { describe, expect, it } from 'vitest';
import { addDays, type Day } from '../day';
import type { HabitHistory } from './consistency';
import type { HabitShape } from './habit';
import { bestStreakUntil, closesDay, isFirstStep, rewardInReach, streakRecordAfter, unbrokenSince, type StreakRecordState } from './moments';

// 2026-11-09 is a Monday.
const MON = '2026-11-09';
const day = (offset: number) => addDays(MON, offset);
const daily: HabitShape = { rule: 'daily', difficulty: 'easy', dailyGoal: 1, weekdays: 0 };
const MON_WED_FRI = 0b0101010;
const gym: HabitShape = { rule: 'weekdays', difficulty: 'easy', dailyGoal: 1, weekdays: MON_WED_FRI };
const free: HabitShape = { rule: 'free', difficulty: 'easy', dailyGoal: 1, weekdays: 0 };

function history(done: number[], extra: Partial<HabitHistory> = {}): HabitHistory {
  return { shape: daily, windowStart: day(-60), carry: 0, doneDays: new Set(done.map(day)), isFrozen: () => false, ...extra };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('primeiro passo', () => {
  it('happens only while no first step is stored', () => {
    expect(isFirstStep(null)).toBe(true);
    expect(isFirstStep(MON)).toBe(false);
  });
});

describe('dia fechado', () => {
  it('closes when every scheduled habit of today is done', () => {
    const items = [
      { shape: daily, paused: false, done: true },
      { shape: gym, paused: false, done: true },
    ];
    expect(closesDay(items, MON, null)).toBe(true);
  });

  it('waits for a scheduled habit still open', () => {
    expect(closesDay([{ shape: daily, paused: false, done: true }, { shape: daily, paused: false, done: false }], MON, null)).toBe(false);
  });

  it('leaves out paused habits, free habits and habits not scheduled today', () => {
    const items = [
      { shape: daily, paused: false, done: true },
      { shape: daily, paused: true, done: false },
      { shape: free, paused: false, done: false },
      // Tuesday: the gym is not scheduled.
      { shape: gym, paused: false, done: false },
    ];
    expect(closesDay(items, day(1), null)).toBe(true);
  });

  it('never closes a day with nothing scheduled', () => {
    expect(closesDay([{ shape: free, paused: false, done: true }], MON, null)).toBe(false);
    expect(closesDay([{ shape: daily, paused: true, done: true }], MON, null)).toBe(false);
  });

  it('closes once a day', () => {
    const items = [{ shape: daily, paused: false, done: true }];
    expect(closesDay(items, MON, MON)).toBe(false);
    expect(closesDay(items, day(1), MON)).toBe(true);
  });
});

describe('recompensa ao alcance', () => {
  const rewards = [
    { id: 'a', name: 'Café', cost: 30 },
    { id: 'b', name: 'Sobremesa', cost: 50 },
    { id: 'c', name: 'Cinema', cost: 200 },
  ];

  it('names the reward the gain brought into reach', () => {
    expect(rewardInReach(45, 52, rewards)?.name).toBe('Sobremesa');
  });

  it('picks the most expensive when several come into reach at once', () => {
    expect(rewardInReach(10, 60, rewards)?.name).toBe('Sobremesa');
  });

  it('counts reaching the cost exactly, and nothing already in reach', () => {
    expect(rewardInReach(49, 50, rewards)?.name).toBe('Sobremesa');
    expect(rewardInReach(50, 60, rewards)).toBeNull();
    expect(rewardInReach(60, 60, rewards)).toBeNull();
  });
});

describe('recorde de streak', () => {
  const fresh: StreakRecordState = { best: null, bestOn: null, recordOn: null };

  /** Marks the days in order, as the server would after each completion. */
  function run(done: number[], start: StreakRecordState = fresh, extra: Partial<HabitHistory> = {}): { records: [Day, number][]; state: StreakRecordState } {
    let state = start;
    const records: [Day, number][] = [];
    const doneSoFar: number[] = [];
    for (const d of done) {
      doneSoFar.push(d);
      const result = streakRecordAfter(history(doneSoFar, extra), day(d), state);
      state = result.state;
      if (result.record !== null) records.push([day(d), result.record]);
    }
    return { records, state };
  }

  it('celebrates a first run once, on the day it reaches 7', () => {
    expect(run(range(0, 10)).records).toEqual([[day(6), 7]]);
  });

  it('celebrates a later run on the day it passes the best', () => {
    // 8 in a row, a missed day, then 10 in a row: passes 8 on its 9th day.
    expect(run([...range(0, 7), ...range(9, 18)]).records).toEqual([
      [day(6), 7],
      [day(17), 9],
    ]);
  });

  it('stays quiet for a run that does not pass the best', () => {
    expect(run([...range(0, 9), ...range(11, 15)]).records).toEqual([[day(6), 7]]);
  });

  it('stays quiet under 7', () => {
    expect(run([...range(0, 2), ...range(4, 8)]).records).toEqual([]);
  });

  it('does not repeat when the same day is marked again', () => {
    const { state } = run(range(0, 6));
    expect(streakRecordAfter(history(range(0, 6)), day(6), state).record).toBeNull();
  });

  it('measures a habit from before the rule silently, from its history', () => {
    // 12 in a row, a miss, 5 so far: the best is 12, the next record needs 13.
    const done = [...range(0, 11), ...range(13, 17)];
    const first = streakRecordAfter(history(done), day(17), fresh);
    expect(first).toEqual({ state: { best: 12, bestOn: day(11), recordOn: null }, record: null });
  });

  it('counts a long current run met for the first time as already celebrated', () => {
    const first = streakRecordAfter(history(range(0, 9)), day(9), fresh);
    expect(first.record).toBeNull();
    expect(streakRecordAfter(history(range(0, 10)), day(10), first.state).record).toBeNull();
  });

  it('sees a run go on across days not scheduled and frozen days', () => {
    const paused = (d: Day) => d === day(2);
    expect(unbrokenSince(history([0, 1, 3], { isFrozen: paused }), day(0), day(4))).toBe(true);
    expect(unbrokenSince(history([0, 1, 3]), day(0), day(4))).toBe(false);
    expect(unbrokenSince(history([0, 2], { shape: gym }), day(0), day(4))).toBe(true);
  });

  it('starts the best from the carry of a régua change', () => {
    expect(bestStreakUntil(history([0, 1], { windowStart: day(0), carry: 10 }), day(1))).toEqual({ streak: 12, on: day(1) });
  });
});
