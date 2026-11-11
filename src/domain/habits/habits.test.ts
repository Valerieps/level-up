import { describe, expect, it } from 'vitest';
import { completeInReview, planReview, planToday, tap, NOT_STARTED } from './day-log';
import { countWeekdays, isScheduledOn, normalizeHabitName, shapeFor, WORK_WEEK, type HabitShape } from './habit';
import { goldFor, levelOf, starBonusPercent, xpFor, xpToNext } from './progression';
import { reguaOptions } from './regua';

const daily = (dailyGoal = 1): HabitShape & { stars: number } => ({ rule: 'daily', difficulty: 'easy', dailyGoal, weekdays: 0, stars: 0 });
const MONDAY = '2026-11-09';
const SUNDAY = '2026-11-15';

describe('XP and gold (spec/progressao.md)', () => {
  it.each([
    ['trivial', 0, 5, 3],
    ['easy', 0, 10, 5],
    ['medium', 0, 15, 8],
    ['hard', 0, 25, 13],
    ['trivial', 1, 6, 3],
    ['easy', 1, 11, 6],
    ['medium', 1, 17, 9],
    ['hard', 1, 28, 14],
    ['trivial', 5, 8, 4],
    ['easy', 5, 15, 8],
    ['medium', 5, 23, 12],
    ['hard', 5, 38, 19],
  ] as const)('%s with %i stars pays %i XP and %i gold', (difficulty, stars, xp, gold) => {
    expect(xpFor(difficulty, stars)).toBe(xp);
    expect(goldFor(xpFor(difficulty, stars))).toBe(gold);
  });

  it('caps the stars at 5 and pays at least 1', () => {
    expect(xpFor('easy', 9)).toBe(15);
    expect(goldFor(1)).toBe(1);
  });

  it('says the star bonus in percent, capped at 50', () => {
    expect(starBonusPercent(0)).toBe(0);
    expect(starBonusPercent(2)).toBe(20);
    expect(starBonusPercent(7)).toBe(50);
  });
});

describe('levels', () => {
  it('follows ⌊0.25 N² + 10 N + 100⌋', () => {
    expect([1, 2, 10, 20, 30].map(xpToNext)).toEqual([110, 121, 225, 400, 625]);
  });

  it('carries the extra XP into the next level', () => {
    expect(levelOf(0)).toEqual({ level: 1, xpInLevel: 0, xpForNext: 110 });
    expect(levelOf(115)).toEqual({ level: 2, xpInLevel: 5, xpForNext: 121 });
    expect(levelOf(231)).toEqual({ level: 3, xpInLevel: 0, xpForNext: 132 });
  });
});

describe('habits', () => {
  it('cleans names and refuses empty ones', () => {
    expect(normalizeHabitName('  Ler   30 minutos ')).toBe('Ler 30 minutos');
    expect(normalizeHabitName('   ')).toBeNull();
    expect(normalizeHabitName('x'.repeat(81))).toBeNull();
  });

  it('schedules weekday habits only on their days', () => {
    const gym = shapeFor('weekdays', 'easy', 1, WORK_WEEK)!;
    expect(isScheduledOn(gym, MONDAY)).toBe(true);
    expect(isScheduledOn(gym, SUNDAY)).toBe(false);
    expect(shapeFor('weekdays', 'easy', 1, 0)).toBeNull();
    expect(shapeFor('daily', 'easy', 0, 0)).toMatchObject({ dailyGoal: 1 });
  });
});

describe('tapping the marker (spec/registrar-o-dia.md)', () => {
  it('moves the counter and pays only when the goal is reached', () => {
    const water = daily(3);
    const one = tap(water, MONDAY)!;
    expect(one).toEqual({ count: 1, done: false, minimum: false, xp: 0, gold: 0 });
    const two = tap(water, MONDAY, one)!;
    expect(tap(water, MONDAY, two)).toEqual({ count: 3, done: true, minimum: false, xp: 10, gold: 5 });
  });

  it('refuses a second completion and a weekday habit off its days', () => {
    expect(tap(daily(), MONDAY, { count: 1, done: true, minimum: false, xp: 10, gold: 5 })).toBeNull();
    expect(tap({ ...shapeFor('weekdays', 'easy', 1, WORK_WEEK)!, stars: 0 }, SUNDAY)).toBeNull();
  });

  it('splits Hoje into its sections', () => {
    const items = [
      { habit: { ...daily(), id: 'a' }, entry: NOT_STARTED },
      { habit: { ...shapeFor('weekdays', 'easy', 1, WORK_WEEK)!, stars: 0, id: 'b' }, entry: NOT_STARTED },
      { habit: { ...shapeFor('free', 'easy', 1, 0)!, stars: 0, id: 'c' }, entry: NOT_STARTED },
      { habit: { ...daily(), id: 'd' }, entry: { count: 1, done: true, minimum: false, xp: 10, gold: 5 } },
    ];
    const plan = planToday(items, SUNDAY);
    expect(plan.scheduled.map((i) => i.habit.id)).toEqual(['a']);
    expect(plan.free.map((i) => i.habit.id)).toEqual(['c']);
    expect(plan.done.map((i) => i.habit.id)).toEqual(['d']);
    expect(plan.scheduledCount).toBe(2);
  });

  it('puts paused habits of the day at the end, as optional, out of the scheduled count', () => {
    const items = [
      { habit: { ...daily(), id: 'a', paused: true }, entry: NOT_STARTED },
      { habit: { ...daily(), id: 'b', paused: false }, entry: NOT_STARTED },
      { habit: { ...daily(), id: 'c', paused: true }, entry: { count: 1, done: true, minimum: false, xp: 10, gold: 5 } },
      { habit: { ...shapeFor('weekdays', 'easy', 1, WORK_WEEK)!, stars: 0, id: 'd', paused: true }, entry: NOT_STARTED },
    ];
    const plan = planToday(items, SUNDAY);
    expect(plan.scheduled.map((i) => i.habit.id)).toEqual(['b']);
    expect(plan.paused.map((i) => i.habit.id)).toEqual(['a']);
    expect(plan.done.map((i) => i.habit.id)).toEqual(['c']);
    expect(plan.scheduledCount).toBe(1);
  });

  it('raises the "Faz tempo" to the top of Hábitos livres, keeping the order within each group', () => {
    const free = (id: string, longAgo: boolean) => ({
      habit: { ...shapeFor('free', 'easy', 1, 0)!, stars: 0, id, consistency: { kind: 'rhythm' as const, rhythm: 0, lastDoneDaysAgo: null, longAgo } },
      entry: NOT_STARTED,
    });
    const plan = planToday([free('a', false), free('b', true), free('c', false), free('d', true)], SUNDAY);
    expect(plan.free.map((i) => i.habit.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});

describe('revisar ontem (spec/registrar-o-dia.md)', () => {
  it('lists what could have been done and was not, scheduled before free', () => {
    const items = [
      { habit: { ...shapeFor('free', 'easy', 1, 0)!, stars: 0, id: 'free' }, entry: NOT_STARTED },
      { habit: { ...daily(), id: 'a' }, entry: NOT_STARTED },
      { habit: { ...shapeFor('weekdays', 'easy', 1, WORK_WEEK)!, stars: 0, id: 'workday' }, entry: NOT_STARTED },
      { habit: { ...daily(3), id: 'counting' }, entry: { count: 2, done: false, minimum: false, xp: 0, gold: 0 } },
      { habit: { ...daily(), id: 'done' }, entry: { count: 1, done: true, minimum: false, xp: 10, gold: 5 } },
    ];
    expect(planReview(items, SUNDAY).map((i) => i.habit.id)).toEqual(['a', 'counting', 'free']);
    expect(planReview(items, MONDAY).map((i) => i.habit.id)).toEqual(['a', 'workday', 'counting', 'free']);
  });

  it('completes a counter at once, keeping a count above the goal', () => {
    expect(completeInReview(daily(8), { count: 3, done: false, minimum: false, xp: 0, gold: 0 })).toEqual({ count: 8, done: true, minimum: false, xp: 10, gold: 5 });
    expect(completeInReview(daily(2), { count: 5, done: false, minimum: false, xp: 0, gold: 0 })).toMatchObject({ count: 5, done: true });
  });
});

describe('régua (spec/regua.md)', () => {
  it('raises difficulty, goal and days', () => {
    const options = reguaOptions(shapeFor('weekdays', 'easy', 1, WORK_WEEK)!, 'raise');
    expect(options.map((o) => o.kind)).toEqual(['difficulty', 'addDay', 'addDay']);
    expect(options[0].size.difficulty).toBe('medium');
    expect(countWeekdays(options[1].size.weekdays)).toBe(6);
    expect(reguaOptions(daily(6), 'raise').map((o) => o.size.dailyGoal)).toEqual([6, 7]);
  });

  it('lowers without going under Trivial, a goal of 1 or a single day', () => {
    expect(reguaOptions({ ...daily(), difficulty: 'trivial' }, 'lower')).toEqual([]);
    expect(reguaOptions(shapeFor('weekdays', 'easy', 1, 0b10)!, 'lower').map((o) => o.kind)).toEqual(['difficulty']);
    expect(reguaOptions(shapeFor('free', 'hard', 1, 0)!, 'raise')).toEqual([]);
  });
});

describe('describing a habit', () => {
  it('says size and rule in plain words', async () => {
    const { describeHabit } = await import('./describe');
    expect(describeHabit(shapeFor('weekdays', 'easy', 1, 0b0101010)!)).toBe('Fácil · seg, qua, sex');
    expect(describeHabit(shapeFor('weekdays', 'medium', 1, WORK_WEEK)!)).toBe('Média · segunda a sexta');
    expect(describeHabit(daily(8))).toBe('Fácil · 8 por dia');
    expect(describeHabit(shapeFor('free', 'hard', 1, 0)!)).toBe('Difícil · livre');
  });
});
