import { beforeEach, describe, expect, it } from 'vitest';
import type { HabitView, NewHabitInput, ProgressView, TodayView } from '../../src/application/api-contract';
import { WORK_WEEK } from '../../src/domain/habits/habit';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const ADMIN = 'ana@example.com';
// Wednesday, 9:00 in São Paulo.
const WEDNESDAY = '2026-11-11T12:00:00Z';

let clock: ReturnType<typeof fixedClock>;
let service: GroupService;
const ana = 'h-ana';

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

function create(input: Partial<NewHabitInput> = {}, session = ana): HabitView {
  return ok(service.command(session, 'habit.create', { name: 'Ler', rule: 'daily', difficulty: 'easy', ...input }));
}

const today = (session = ana) => ok<TodayView>(service.query(session, 'today', {}));
const progress = (session = ana) => ok<ProgressView>(service.query(session, 'progress', {}));
const mark = (habitId: string) => service.command(ana, 'habit.mark', { habitId });

describe('creating and editing habits', () => {
  it('creates habits in order and lists them in Hoje', () => {
    create({ name: '  Beber água ', dailyGoal: 8 });
    create({ name: 'Academia', rule: 'weekdays', weekdays: WORK_WEEK });
    expect(today().habits.map((h) => [h.habit.name, h.habit.dailyGoal, h.habit.weekdays])).toEqual([
      ['Beber água', 8, 0],
      ['Academia', 1, WORK_WEEK],
    ]);
  });

  it('refuses a missing name, an unknown rule and weekday habits without days', () => {
    for (const input of [{ name: ' ' }, { rule: 'monthly' }, { rule: 'weekdays', weekdays: 0 }, { dailyGoal: 0 }]) {
      expect(service.command(ana, 'habit.create', { name: 'Ler', rule: 'daily', difficulty: 'easy', ...input })).toEqual({ ok: false, error: 'invalid' });
    }
  });

  it('changes the rule in the edit, taking the days chosen there', () => {
    const habit = create({ dailyGoal: 3 });
    const edited = ok<HabitView>(service.command(ana, 'habit.update', { habitId: habit.id, name: 'Ler mais', rule: 'weekdays', weekdays: 0b10 }));
    expect(edited).toMatchObject({ name: 'Ler mais', rule: 'weekdays', weekdays: 0b10, dailyGoal: 1, difficulty: 'easy' });
    expect(service.command(ana, 'habit.update', { habitId: habit.id, name: 'Ler', rule: 'daily' })).toMatchObject({ value: { dailyGoal: 1 } });
  });

  it('keeps each member’s habits private', () => {
    const habit = create();
    service.command(ana, 'invite.create', { email: 'bia@example.com' });
    service.signIn({ sub: 's-bia', email: 'bia@example.com', name: 'Bia', picture: null }, 'h-bia', []);
    expect(today('h-bia').habits).toEqual([]);
    expect(service.query('h-bia', 'habit', { habitId: habit.id })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command('h-bia', 'habit.mark', { habitId: habit.id })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command('h-bia', 'habit.delete', { habitId: habit.id })).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('marking', () => {
  it('pays XP and gold once, when the goal is reached', () => {
    const water = create({ dailyGoal: 2 });
    expect(mark(water.id)).toMatchObject({ ok: true, value: { entry: { count: 1, done: false } }, changed: ['habits'] });
    expect(progress().xpTotal).toBe(0);
    expect(mark(water.id)).toMatchObject({ value: { entry: { count: 2, done: true, xp: 10, gold: 5 } }, changed: ['habits', 'progress'] });
    expect(mark(water.id)).toEqual({ ok: false, error: 'conflict' });
    expect(progress()).toMatchObject({ xpTotal: 10, gold: 5, level: 1 });
  });

  it('refuses a weekday habit off its days', () => {
    const weekend = create({ rule: 'weekdays', weekdays: 0b1000001 });
    expect(mark(weekend.id)).toEqual({ ok: false, error: 'conflict' });
  });

  it('says when a completion passes a level, and undoing gives back exactly what it earned', () => {
    const habits = Array.from({ length: 5 }, (_, i) => create({ name: `H${i}`, difficulty: 'hard' }));
    const results = habits.map((h) => mark(h.id));
    expect(results.map((r) => (r as { value: { levelUp: number | null } }).value.levelUp)).toEqual([null, null, null, null, 2]);
    expect(progress()).toMatchObject({ xpTotal: 125, gold: 65, level: 2, xpInLevel: 15 });

    expect(service.command(ana, 'habit.unmark', { habitId: habits[4].id })).toMatchObject({ ok: true, changed: ['habits', 'progress'] });
    expect(progress()).toMatchObject({ xpTotal: 100, gold: 52, level: 1 });
    expect(today().habits[4].entry).toEqual({ count: 0, done: false, minimum: false, xp: 0, gold: 0 });
  });

  it('never lets gold go below 0 when undoing', () => {
    const habit = create();
    mark(habit.id);
    service['ctx'].sql.run('UPDATE progress SET gold = 2');
    service.command(ana, 'habit.unmark', { habitId: habit.id });
    expect(progress()).toMatchObject({ xpTotal: 0, gold: 0 });
  });

  it('locks yesterday’s completions after the day turns', () => {
    const habit = create();
    mark(habit.id);
    clock.set('2026-11-12T12:00:00Z');
    expect(service.command(ana, 'habit.unmark', { habitId: habit.id })).toEqual({ ok: false, error: 'not_found' });
    expect(progress().xpTotal).toBe(10);
    expect(today().habits[0].entry.done).toBe(false);
  });
});

describe('régua', () => {
  it('pays the new size right after raising', () => {
    const habit = create();
    service.command(ana, 'habit.resize', { habitId: habit.id, difficulty: 'medium', dailyGoal: 1, weekdays: 0 });
    expect(mark(habit.id)).toMatchObject({ value: { entry: { xp: 15, gold: 8 } } });
  });

  it('completes today when a lower goal is already reached', () => {
    const water = create({ dailyGoal: 8 });
    for (let i = 0; i < 5; i++) mark(water.id);
    const result = service.command(ana, 'habit.resize', { habitId: water.id, difficulty: 'easy', dailyGoal: 4, weekdays: 0 });
    expect(result).toMatchObject({ ok: true, changed: ['habits', 'progress'] });
    expect(today().habits[0].entry).toEqual({ count: 5, done: true, minimum: false, xp: 10, gold: 5 });
  });

  it('refuses sizes that do not fit the rule', () => {
    const free = create({ rule: 'free' });
    expect(service.command(ana, 'habit.resize', { habitId: free.id, difficulty: 'easy', dailyGoal: 3, weekdays: 0 })).toEqual({ ok: false, error: 'invalid' });
    const gym = create({ rule: 'weekdays', weekdays: WORK_WEEK });
    expect(service.command(ana, 'habit.resize', { habitId: gym.id, difficulty: 'easy', dailyGoal: 1, weekdays: 0 })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('archiving and deleting', () => {
  it('archives out of Hoje and reactivates with the history kept', () => {
    const habit = create();
    mark(habit.id);
    expect(service.command(ana, 'habit.archive', { habitId: habit.id })).toMatchObject({ value: { state: 'archived', archivedOn: '2026-11-11' } });
    expect(today().habits).toEqual([]);
    expect(ok<HabitView[]>(service.query(ana, 'archivedHabits', {})).map((h) => h.id)).toEqual([habit.id]);
    expect(mark(habit.id)).toEqual({ ok: false, error: 'conflict' });

    service.command(ana, 'habit.reactivate', { habitId: habit.id });
    expect(today().habits[0].entry.done).toBe(true);
  });

  it('deletes the habit and its history, keeping XP and gold', () => {
    const habit = create();
    mark(habit.id);
    expect(service.command(ana, 'habit.delete', { habitId: habit.id })).toMatchObject({ ok: true });
    expect(service.query(ana, 'habit', { habitId: habit.id })).toEqual({ ok: false, error: 'not_found' });
    expect(progress()).toMatchObject({ xpTotal: 10, gold: 5 });
  });
});

/** Moves the clock to `offset` days after Wednesday 11 Nov, 9:00 in São Paulo. */
const onDay = (offset: number) => clock.set(new Date(Date.parse(WEDNESDAY) + offset * 86_400_000).toISOString());
const view = (habitId: string) => ok<HabitView>(service.query(ana, 'habit', { habitId }));

describe('versão mínima (phase 1b)', () => {
  it('is set at creation and in the edit, never on a free habit', () => {
    const reading = create({ minimum: ' Ler 1  página ' });
    expect(reading.minimum).toBe('Ler 1 página');
    expect(service.command(ana, 'habit.create', { name: 'Passear', rule: 'free', difficulty: 'easy', minimum: 'x' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command(ana, 'habit.update', { habitId: reading.id, name: 'Ler', rule: 'daily' })).toMatchObject({ value: { minimum: 'Ler 1 página' } });
    expect(service.command(ana, 'habit.update', { habitId: reading.id, name: 'Ler', rule: 'daily', minimum: '' })).toMatchObject({ value: { minimum: null } });
    service.command(ana, 'habit.update', { habitId: reading.id, name: 'Ler', rule: 'daily', minimum: '1 página' });
    expect(service.command(ana, 'habit.update', { habitId: reading.id, name: 'Ler', rule: 'free' })).toMatchObject({ value: { minimum: null } });
  });

  it('completes the day at once for a quarter of the XP, and undoing gives it back', () => {
    const water = create({ dailyGoal: 8, minimum: '1 copo' });
    mark(water.id);
    const result = service.command(ana, 'habit.markMinimum', { habitId: water.id });
    expect(result).toMatchObject({ ok: true, value: { entry: { count: 1, done: true, minimum: true, xp: 3, gold: 2 } }, changed: ['habits', 'progress'] });
    expect(today().habits[0].entry.minimum).toBe(true);
    expect(service.command(ana, 'habit.markMinimum', { habitId: water.id })).toEqual({ ok: false, error: 'conflict' });
    service.command(ana, 'habit.unmark', { habitId: water.id });
    expect(progress()).toMatchObject({ xpTotal: 0, gold: 0 });
  });

  it('is refused when the habit has none', () => {
    const habit = create();
    expect(service.command(ana, 'habit.markMinimum', { habitId: habit.id })).toEqual({ ok: false, error: 'conflict' });
  });
});

describe('streak and Ritmo (phase 1b)', () => {
  it('counts days done in a row, kept by the versão mínima, and a missed day restarts it', () => {
    const habit = create({ minimum: '1 página' });
    mark(habit.id);
    onDay(1);
    expect(view(habit.id).consistency).toEqual({ kind: 'streak', streak: 1 });
    service.command(ana, 'habit.markMinimum', { habitId: habit.id });
    expect(view(habit.id).consistency).toEqual({ kind: 'streak', streak: 2 });
    onDay(3);
    expect(view(habit.id).consistency).toEqual({ kind: 'streak', streak: 0 });
  });

  it('goes on through a régua change, and restarts with a new time rule', () => {
    const habit = create();
    mark(habit.id);
    onDay(1);
    mark(habit.id);
    service.command(ana, 'habit.resize', { habitId: habit.id, difficulty: 'medium', dailyGoal: 1, weekdays: 0 });
    service.command(ana, 'habit.resize', { habitId: habit.id, difficulty: 'hard', dailyGoal: 1, weekdays: 0 });
    expect(view(habit.id).consistency).toEqual({ kind: 'streak', streak: 2 });
    onDay(2);
    mark(habit.id);
    expect(view(habit.id).consistency).toEqual({ kind: 'streak', streak: 3 });
    service.command(ana, 'habit.update', { habitId: habit.id, name: 'Ler', rule: 'weekdays', weekdays: 0b1111111 });
    expect(view(habit.id).consistency).toEqual({ kind: 'streak', streak: 1 });
  });

  it('is frozen while archived and goes on after reactivating', () => {
    const habit = create();
    mark(habit.id);
    onDay(1);
    service.command(ana, 'habit.archive', { habitId: habit.id });
    onDay(5);
    expect(view(habit.id).consistency).toEqual({ kind: 'streak', streak: 1 });
    service.command(ana, 'habit.reactivate', { habitId: habit.id });
    onDay(6);
    mark(habit.id);
    expect(view(habit.id).consistency).toEqual({ kind: 'streak', streak: 2 });
  });

  it('shows Ritmo, Última vez and "Faz tempo" for free habits', () => {
    const walk = create({ rule: 'free' });
    mark(walk.id);
    onDay(4);
    expect(view(walk.id).consistency).toEqual({ kind: 'rhythm', rhythm: 1, lastDoneDaysAgo: 4, longAgo: false });
    onDay(11);
    expect(view(walk.id).consistency).toMatchObject({ lastDoneDaysAgo: 11, longAgo: true });
  });
});
