import { beforeEach, describe, expect, it } from 'vitest';
import type { HabitView, MarkResult, ProgressView, ResizeResult, ReviewResult, TrackView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const ADMIN = 'ana@example.com';
// Wednesday, 9:00 in São Paulo.
const WEDNESDAY = '2026-11-11T12:00:00Z';
const ana = 'h-ana';

let clock: ReturnType<typeof fixedClock>;
let service: GroupService;

beforeEach(() => {
  clock = fixedClock(WEDNESDAY);
  service = new GroupService(memorySql(), clock, sequentialIds());
  service.migrate();
  service.signIn({ sub: 's-ana', email: ADMIN, name: 'Ana', picture: null }, ana, [ADMIN]);
});

function ok<T>(result: { ok: boolean; value?: unknown; error?: string }): T {
  expect(result).toMatchObject({ ok: true });
  return result.value as T;
}

const onDay = (offset: number) => clock.set(new Date(Date.parse(WEDNESDAY) + offset * 86_400_000).toISOString());
const create = (name = 'Ler') => ok<HabitView>(service.command(ana, 'habit.create', { name, rule: 'daily', difficulty: 'easy' }));
const habit = (id: string) => ok<HabitView>(service.query(ana, 'habit', { habitId: id }));
const mark = (id: string) => ok<MarkResult>(service.command(ana, 'habit.mark', { habitId: id }));
const progress = () => ok<ProgressView>(service.query(ana, 'progress', {}));
const tracks = () => ok<TrackView[]>(service.query(ana, 'achievements', {}));
const resize = (id: string, difficulty: string) => ok<ResizeResult>(service.command(ana, 'habit.resize', { habitId: id, difficulty, dailyGoal: 1, weekdays: 0 }));

/** Marks the habit on days `from` to `to`; returns the last mark's result. */
function markDays(id: string, from: number, to: number): MarkResult {
  let last: MarkResult | undefined;
  for (let d = from; d <= to; d++) {
    onDay(d);
    last = mark(id);
  }
  return last!;
}

describe('domínio (spec/streak-e-dominio.md)', () => {
  it('gives the selo, the Prêmio de Domínio and the first Automatizados milestone on the 12th day', () => {
    const reading = create();
    expect(markDays(reading.id, 0, 10).celebrations).toEqual([]);
    expect(habit(reading.id)).toMatchObject({ automated: false, tierMastered: false, mastery: { done: 11, needed: 12 }, invitation: null });

    onDay(11);
    const result = service.command(ana, 'habit.mark', { habitId: reading.id });
    expect(result).toMatchObject({ changed: ['habits', 'progress', 'achievements'] });
    expect(ok<MarkResult>(result).celebrations).toEqual([
      { kind: 'mastered', habitId: reading.id, habitName: 'Ler', gold: 50, firstTime: true },
      { kind: 'achievement', track: 'automated', milestone: 1, gold: 50 },
    ]);
    expect(habit(reading.id)).toMatchObject({ automated: true, tierMastered: true, invitation: 'raise' });
    expect(progress().gold).toBe(12 * 5 + 50 + 50);
    expect(tracks()[0]).toEqual({
      track: 'automated',
      count: 1,
      reached: [{ milestone: 1, reachedOn: '2026-11-22', gold: 50 }],
      next: { milestone: 2, target: 3, gold: 100 },
    });
  });

  it('keeps the selo and the prizes when the completion that reached them is undone', () => {
    const reading = create();
    markDays(reading.id, 0, 11);
    service.command(ana, 'habit.unmark', { habitId: reading.id });
    expect(habit(reading.id)).toMatchObject({ automated: true, tierMastered: true });
    expect(progress().gold).toBe(11 * 5 + 50 + 50);
    expect(markDays(reading.id, 11, 11).celebrations).toEqual([]);
  });

  it('reaches mastery from Revisar ontem too', () => {
    const reading = create();
    markDays(reading.id, 0, 10);
    onDay(12);
    const review = ok<ReviewResult>(service.command(ana, 'day.reviewYesterday', { habitIds: [reading.id] }));
    expect(review.celebrations.map((c) => c.kind)).toEqual(['mastered', 'achievement']);
  });
});

describe('Estrelas de Coragem (spec/regua.md)', () => {
  it('gives a star raising a mastered patamar, and none returning to a patamar already had', () => {
    const reading = create();
    markDays(reading.id, 0, 11);
    const raised = resize(reading.id, 'medium');
    expect(raised).toMatchObject({ star: true, habit: { stars: 1, tierMastered: false, automated: true, invitation: null } });
    expect(raised.celebrations).toEqual([{ kind: 'achievement', track: 'courage', milestone: 1, gold: 50 }]);
    expect(markDays(reading.id, 12, 12).entry.xp).toBe(17);

    expect(resize(reading.id, 'easy')).toMatchObject({ star: false, habit: { stars: 1 } });
    markDays(reading.id, 13, 24);
    expect(resize(reading.id, 'medium').star).toBe(false);
    expect(tracks()[1]).toMatchObject({ count: 1 });
  });

  it('pays no second prize for a patamar mastered before', () => {
    const reading = create();
    markDays(reading.id, 0, 11);
    resize(reading.id, 'medium');
    resize(reading.id, 'easy');
    const gold = progress().gold;
    const celebrations = [];
    for (let d = 12; d <= 23; d++) celebrations.push(...markDays(reading.id, d, d).celebrations);
    expect(celebrations).toEqual([]);
    expect(habit(reading.id)).toMatchObject({ tierMastered: true, invitation: 'raise' });
    expect(progress().gold - gold).toBe(12 * 6);
  });

  it('gives no star raising before mastery', () => {
    const reading = create();
    expect(resize(reading.id, 'medium')).toMatchObject({ star: false, celebrations: [] });
  });

  it('keeps the counts and conquistas when a habit is deleted', () => {
    const reading = create();
    markDays(reading.id, 0, 11);
    resize(reading.id, 'medium');
    service.command(ana, 'habit.delete', { habitId: reading.id });
    expect(tracks().map((t) => [t.count, t.reached.length])).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });
});

describe('convites de régua (spec/regua.md)', () => {
  it('brings the raise invitation back 14 scheduled days after "Agora não"', () => {
    const reading = create();
    markDays(reading.id, 0, 11);
    expect(service.command(ana, 'habit.dismissInvitation', { habitId: reading.id, kind: 'raise' })).toMatchObject({ value: { invitation: null } });
    onDay(24);
    expect(habit(reading.id).invitation).toBeNull();
    onDay(25);
    expect(habit(reading.id).invitation).toBe('raise');
  });

  it('invites to adjust a habit that weighs, and waits 4 weeks after "Agora não"', () => {
    const reading = create();
    onDay(27);
    expect(habit(reading.id).invitation).toBeNull();
    onDay(28);
    expect(habit(reading.id).invitation).toBe('adjust');
    service.command(ana, 'habit.dismissInvitation', { habitId: reading.id, kind: 'adjust' });
    onDay(55);
    expect(habit(reading.id).invitation).toBeNull();
    onDay(56);
    expect(habit(reading.id).invitation).toBe('adjust');
  });

  it('refuses an unknown invitation and someone else’s habit', () => {
    const reading = create();
    expect(service.command(ana, 'habit.dismissInvitation', { habitId: reading.id, kind: 'other' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command(ana, 'habit.dismissInvitation', { habitId: 'nope', kind: 'raise' })).toEqual({ ok: false, error: 'not_found' });
  });
});
