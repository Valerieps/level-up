import { describe, expect, it } from 'vitest';
import { addDays } from '../day';
import { MILESTONES, nextMilestone, reachedMilestones } from './achievements';
import type { HabitShape } from './habit';
import { invitationOn, type InvitationInput } from './invitations';
import { masteryOn, masteryPrize, type MasteryHistory } from './mastery';
import { earnsStar, tierKey, type StarState } from './regua';

// 2026-11-09 is a Monday.
const MON = '2026-11-09';
const day = (offset: number) => addDays(MON, offset);
const MON_WED_FRI = 0b0101010;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const daily: HabitShape = { rule: 'daily', difficulty: 'easy', dailyGoal: 1, weekdays: 0 };
const gym: HabitShape = { rule: 'weekdays', difficulty: 'easy', dailyGoal: 1, weekdays: MON_WED_FRI };
const free: HabitShape = { rule: 'free', difficulty: 'easy', dailyGoal: 1, weekdays: 0 };

function history(shape: HabitShape, done: number[], extra: Partial<MasteryHistory> = {}): MasteryHistory {
  return {
    shape,
    windowStart: day(-60),
    carry: 0,
    doneDays: new Set(done.map(day)),
    minimumDays: new Set(),
    isFrozen: () => false,
    ...extra,
  };
}

describe('domínio', () => {
  it('needs 12 of the last 14 scheduled occurrences', () => {
    expect(masteryOn(history(daily, range(-13, 0).filter((d) => d !== -5 && d !== -9)), day(0))).toEqual({ done: 12, needed: 12, reached: true });
    expect(masteryOn(history(daily, range(-13, 0).filter((d) => ![-2, -5, -9].includes(d))), day(0)).reached).toBe(false);
  });

  it('leaves today out until it is done', () => {
    // Done the 12 days before today: today, not done yet, does not push an old day out.
    expect(masteryOn(history(daily, range(-12, -1)), day(0))).toMatchObject({ done: 12, reached: true });
  });

  it('counts only scheduled days of weekday habits', () => {
    // Mon/Wed/Fri over the last 5 weeks: 14 occurrences, all done but two.
    const scheduled = range(-32, 0).filter((d) => [0, 2, 4].includes(((d % 7) + 7) % 7));
    const done = scheduled.slice(-14).filter((_, i) => i !== 3 && i !== 7);
    expect(masteryOn(history(gym, done), day(0))).toMatchObject({ done: 12, reached: true });
  });

  it('takes at most 2 versões mínimas', () => {
    const done = range(-13, 0);
    const minimumDays = new Set([day(-1), day(-2), day(-3)]);
    expect(masteryOn(history(daily, done, { minimumDays }), day(0))).toMatchObject({ done: 13, reached: true });
    const fewer = range(-13, 0).filter((d) => d !== -10 && d !== -11);
    expect(masteryOn(history(daily, fewer, { minimumDays }), day(0))).toMatchObject({ done: 11, reached: false });
  });

  it('skips paused days and counts only the current patamar', () => {
    const isFrozen = (d: string) => d >= day(-10) && d <= day(-6);
    const done = range(-18, 0).filter((d) => d < -10 || d > -6);
    expect(masteryOn(history(daily, done, { isFrozen }), day(0))).toMatchObject({ done: 14, reached: true });
    expect(masteryOn(history(daily, range(-20, 0), { windowStart: day(-5) }), day(0))).toMatchObject({ done: 6, reached: false });
  });

  it('needs 14 completions of a free habit since the patamar started', () => {
    expect(masteryOn(history(free, range(-13, 0)), day(0))).toEqual({ done: 14, needed: 14, reached: true });
    expect(masteryOn(history(free, range(-13, 0), { windowStart: day(-12) }), day(0))).toMatchObject({ done: 13, reached: false });
  });

  it('pays 5 times the XP of one completion as the Prêmio de Domínio', () => {
    expect(masteryPrize('easy', 0)).toBe(50);
    expect(masteryPrize('medium', 1)).toBe(85);
  });
});

describe('Estrelas de Coragem', () => {
  const easyDaily: StarState = { ...daily, stars: 0, tierMastered: true, tiers: [tierKey('daily', daily)] };

  it('keys a patamar by difficulty, goal and how many days', () => {
    expect(tierKey('weekdays', gym)).toBe(tierKey('weekdays', { ...gym, weekdays: 0b1010100 }));
    expect(tierKey('weekdays', gym)).not.toBe(tierKey('weekdays', { ...gym, weekdays: 0b1010101 }));
    expect(tierKey('daily', daily)).toBe('easy:1:7');
  });

  it('earns a star raising a mastered patamar to a new one', () => {
    expect(earnsStar(easyDaily, { ...daily, difficulty: 'medium' })).toBe(true);
    expect(earnsStar(easyDaily, { ...daily, dailyGoal: 2 })).toBe(true);
  });

  it('earns none before mastery, on a patamar already had, lowering, or at 5 stars', () => {
    expect(earnsStar({ ...easyDaily, tierMastered: false }, { ...daily, difficulty: 'medium' })).toBe(false);
    expect(earnsStar({ ...easyDaily, tiers: [...easyDaily.tiers, 'medium:1:7'] }, { ...daily, difficulty: 'medium' })).toBe(false);
    expect(earnsStar(easyDaily, { ...daily, difficulty: 'trivial' })).toBe(false);
    expect(earnsStar(easyDaily, { ...daily, difficulty: 'hard' })).toBe(false);
    expect(earnsStar({ ...easyDaily, stars: 5 }, { ...daily, difficulty: 'medium' })).toBe(false);
  });
});

describe('conquistas', () => {
  it('lists the milestones reached and the next one', () => {
    expect(reachedMilestones('automated', 4).map((m) => m.milestone)).toEqual([1, 2]);
    expect(nextMilestone('courage', 5)).toEqual({ milestone: 3, target: 10, gold: 150 });
    expect(nextMilestone('automated', 35)).toBeNull();
    expect(MILESTONES.courage.map((m) => m.gold)).toEqual([50, 100, 150, 250, 400, 600]);
  });
});

describe('convites de régua', () => {
  function input(extra: Partial<InvitationInput> = {}, done: number[] = range(-40, 0)): InvitationInput {
    return {
      history: history(daily, done),
      createdOn: day(-60),
      tierMastered: false,
      canRaise: true,
      isPausedOn: () => false,
      dismissedOn: {},
      ...extra,
    };
  }

  it('invites to raise a mastered patamar, until dismissed for 14 more scheduled days', () => {
    expect(invitationOn(input({ tierMastered: true }), day(0))).toBe('raise');
    expect(invitationOn(input({ tierMastered: true, canRaise: false }), day(0))).toBeNull();
    expect(invitationOn(input({ tierMastered: true, dismissedOn: { raise: day(-13) } }), day(0))).toBeNull();
    expect(invitationOn(input({ tierMastered: true, dismissedOn: { raise: day(-14) } }), day(0))).toBe('raise');
  });

  it('forgets a raise dismissed on an earlier patamar', () => {
    const fresh = { ...input().history, windowStart: day(-3) };
    expect(invitationOn(input({ tierMastered: true, history: fresh, dismissedOn: { raise: day(-5) } }), day(0))).toBe('raise');
  });

  it('invites to adjust a habit done in fewer than half of the last 8 occurrences', () => {
    expect(invitationOn(input({}, [-1, -3, -5]), day(0))).toBe('adjust');
    expect(invitationOn(input({}, [-1, -3, -5, -7]), day(0))).toBeNull();
  });

  it('never invites to adjust a young, free, paused or recently dismissed habit', () => {
    const weighs = [-1];
    expect(invitationOn(input({ createdOn: day(-27) }, weighs), day(0))).toBeNull();
    expect(invitationOn(input({ history: history(free, weighs) }, weighs), day(0))).toBeNull();
    expect(invitationOn(input({ isPausedOn: (d) => d === day(-7) }, weighs), day(0))).toBeNull();
    expect(invitationOn(input({ isPausedOn: (d) => d === day(-8) }, weighs), day(0))).toBe('adjust');
    expect(invitationOn(input({ dismissedOn: { adjust: day(-27) } }, weighs), day(0))).toBeNull();
    expect(invitationOn(input({ dismissedOn: { adjust: day(-28) } }, weighs), day(0))).toBe('adjust');
  });

  it('waits for 8 occurrences of the current patamar', () => {
    const fresh = { ...history(daily, []), windowStart: day(-6) };
    expect(invitationOn(input({ history: fresh }), day(0))).toBeNull();
  });
});
