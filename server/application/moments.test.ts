import { beforeEach, describe, expect, it } from 'vitest';
import type { HabitView, MarkResult, Moment, NewHabitInput, ReviewResult } from '../../src/application/api-contract';
import { addDays } from '../../src/domain/day';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const ADMIN = 'ana@example.com';
// Wednesday 11 Nov, 9:00 in São Paulo.
const WEDNESDAY = '2026-11-11';

let clock: ReturnType<typeof fixedClock>;
let service: GroupService;
const ana = 'h-ana';

beforeEach(() => {
  clock = fixedClock(`${WEDNESDAY}T12:00:00Z`);
  service = new GroupService(memorySql(), clock, sequentialIds());
  service.migrate();
  service.signIn({ sub: 's-ana', email: ADMIN, name: 'Ana', picture: null }, ana, [ADMIN]);
});

function ok<T>(result: { ok: boolean; value?: unknown; error?: string }): T {
  expect(result).toMatchObject({ ok: true });
  return result.value as T;
}

const create = (input: Partial<NewHabitInput> = {}): HabitView =>
  ok(service.command(ana, 'habit.create', { name: 'Ler', rule: 'daily', difficulty: 'easy', ...input }));
const mark = (habitId: string): readonly Moment[] => ok<MarkResult>(service.command(ana, 'habit.mark', { habitId })).moments;
const unmark = (habitId: string) => ok(service.command(ana, 'habit.unmark', { habitId }));
const close = (habitIds: string[]): readonly Moment[] => ok<ReviewResult>(service.command(ana, 'day.reviewYesterday', { habitIds })).moments;
const kinds = (moments: readonly Moment[]) => moments.map((m) => m.kind);
/** Moves the clock to `offset` days after Wednesday, 9:00 in São Paulo. */
const goTo = (offset: number) => clock.set(`${addDays(WEDNESDAY, offset)}T12:00:00Z`);

describe('primeiro passo', () => {
  it('comes with the first completion only, even after an undo', () => {
    const reading = create();
    const water = create({ name: 'Água', dailyGoal: 2 });
    expect(mark(water.id)).toEqual([]);
    expect(mark(reading.id)).toContainEqual({ kind: 'firstStep' });
    unmark(reading.id);
    expect(kinds(mark(reading.id))).not.toContain('firstStep');
    expect(kinds(mark(water.id))).not.toContain('firstStep');
  });

  it('comes from the review of yesterday too', () => {
    const reading = create();
    goTo(1);
    expect(close([reading.id])).toContainEqual({ kind: 'firstStep' });
  });

  it('is already spent for members who completed something before the rule', () => {
    const reading = create();
    mark(reading.id);
    service['ctx'].sql.run('UPDATE member_settings SET first_step_on = NULL');
    service['ctx'].sql.run('DELETE FROM schema_migrations WHERE version = 11');
    for (const column of ['first_step_on', 'day_closed_on']) service['ctx'].sql.run(`ALTER TABLE member_settings DROP COLUMN ${column}`);
    for (const column of ['best_streak', 'best_streak_on', 'record_on']) service['ctx'].sql.run(`ALTER TABLE habits DROP COLUMN ${column}`);
    service.migrate();
    expect(service['ctx'].sql.all('SELECT first_step_on FROM member_settings')).toEqual([{ first_step_on: WEDNESDAY }]);
  });
});

describe('dia fechado', () => {
  it('comes with the last habit scheduled today, once a day', () => {
    const reading = create();
    const gym = create({ name: 'Academia', rule: 'weekdays', weekdays: 0b0001000 });
    create({ name: 'Caminhar', rule: 'free' });
    // Thursday: the gym is not scheduled.
    create({ name: 'Quinta', rule: 'weekdays', weekdays: 0b0010000 });
    expect(kinds(mark(reading.id))).not.toContain('dayClosed');
    expect(kinds(mark(gym.id))).toContain('dayClosed');
    unmark(gym.id);
    expect(kinds(mark(gym.id))).not.toContain('dayClosed');
  });

  it('leaves paused habits out, and closes again the next day', () => {
    const reading = create();
    const gym = create({ name: 'Academia' });
    ok(service.command(ana, 'pause.start', { habitId: gym.id }));
    expect(kinds(mark(reading.id))).toContain('dayClosed');
    goTo(1);
    expect(kinds(mark(reading.id))).toContain('dayClosed');
  });

  it('never comes from the review of yesterday', () => {
    const reading = create();
    goTo(1);
    expect(kinds(close([reading.id]))).not.toContain('dayClosed');
  });

  it('never comes on a day with only free habits', () => {
    const walk = create({ rule: 'free' });
    expect(kinds(mark(walk.id))).not.toContain('dayClosed');
  });
});

describe('recompensa ao alcance', () => {
  const reward = (name: string, cost: number) => ok(service.command(ana, 'reward.create', { name, cost }));

  it('names the most expensive reward the gold brought into reach', () => {
    reward('Café', 8);
    const dessert = reward('Sobremesa', 10) as { id: string };
    reward('Cinema', 200);
    const reading = create();
    const water = create({ name: 'Água' });
    expect(kinds(mark(reading.id))).not.toContain('rewardInReach');
    expect(mark(water.id)).toContainEqual({ kind: 'rewardInReach', rewardId: dessert.id, rewardName: 'Sobremesa' });
  });

  it('counts the gold of the review', () => {
    reward('Café', 5);
    const reading = create();
    goTo(1);
    expect(kinds(close([reading.id]))).toContain('rewardInReach');
  });
});

describe('recorde de streak', () => {
  it('comes on the day a first run reaches 7, then not on the next days', () => {
    const reading = create();
    const records: [number, Moment][] = [];
    for (let offset = 0; offset < 9; offset++) {
      goTo(offset);
      for (const moment of mark(reading.id)) if (moment.kind === 'streakRecord') records.push([offset, moment]);
    }
    expect(records).toEqual([[6, { kind: 'streakRecord', habitId: reading.id, habitName: 'Ler', streak: 7 }]]);
  });

  it('comes when a later run passes the best, counting the review', () => {
    const reading = create();
    for (let offset = 0; offset < 7; offset++) {
      goTo(offset);
      mark(reading.id);
    }
    // A missed day, then 7 more: the 8th day of the new run is closed in the review.
    const seen: number[] = [];
    for (let offset = 8; offset < 15; offset++) {
      goTo(offset);
      for (const moment of mark(reading.id)) if (moment.kind === 'streakRecord') seen.push(offset);
    }
    goTo(16);
    expect(close([reading.id])).toContainEqual({ kind: 'streakRecord', habitId: reading.id, habitName: 'Ler', streak: 8 });
    expect(seen).toEqual([]);
  });
});
