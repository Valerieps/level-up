import { beforeEach, describe, expect, it } from 'vitest';
import type { HabitView, PausesView, PauseView, TodayView } from '../../src/application/api-contract';
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
const pause = (input: Record<string, unknown> = {}, session = ana) => service.command(session, 'pause.start', input);
const pauses = (session = ana) => ok<PausesView>(service.query(session, 'pauses', {}));
const habit = (id: string) => ok<HabitView>(service.query(ana, 'habit', { habitId: id }));
const streak = (id: string) => (habit(id).consistency as { streak: number }).streak;
const mark = (id: string) => service.command(ana, 'habit.mark', { habitId: id });

describe('Modo Pausa (spec/modo-pausa.md)', () => {
  it('pauses the whole app from today, without a deadline, and shows it', () => {
    const reading = create();
    const started = ok<PauseView>(pause());
    expect(started).toMatchObject({ habitId: null, habitName: null, fromDay: '2026-11-11', untilDay: null });
    expect(pauses()).toEqual({ app: started, habits: [] });
    expect(ok<TodayView>(service.query(ana, 'today', {})).habits[0].habit.paused).toBe(true);
    expect(habit(reading.id).paused).toBe(true);
    expect(pause()).toEqual({ ok: false, error: 'conflict' });
  });

  it('pauses one habit, by name, and keeps the others running', () => {
    const reading = create();
    const gym = create('Academia');
    expect(pause({ habitId: reading.id, untilDay: '2026-11-14' })).toMatchObject({
      ok: true,
      value: { habitName: 'Ler' },
      changed: ['pauses', 'habits'],
    });
    expect(habit(gym.id).paused).toBe(false);
    expect(pauses().habits.map((p) => p.habitId)).toEqual([reading.id]);
  });

  it('refuses a return date that is not after today, and another member’s habit', () => {
    const reading = create();
    expect(pause({ untilDay: '2026-11-11' })).toEqual({ ok: false, error: 'invalid' });
    expect(pause({ untilDay: 'logo' })).toEqual({ ok: false, error: 'invalid' });
    service.command(ana, 'invite.create', { email: 'bia@example.com' });
    service.signIn({ sub: 's-bia', email: 'bia@example.com', name: 'Bia', picture: null }, 'h-bia', []);
    expect(pause({ habitId: reading.id }, 'h-bia')).toEqual({ ok: false, error: 'not_found' });
    pause();
    expect(pauses('h-bia')).toEqual({ app: null, habits: [] });
  });

  it('freezes the streak; marking during the pause still counts', () => {
    const reading = create();
    const gym = create('Academia');
    mark(reading.id);
    mark(gym.id);
    onDay(1);
    pause({ untilDay: '2026-11-15' });
    mark(gym.id);
    onDay(3);
    expect(streak(reading.id)).toBe(1);
    expect(streak(gym.id)).toBe(2);
  });

  it('ends on the return date by itself, without a write', () => {
    pause({ untilDay: '2026-11-13' });
    onDay(1);
    expect(pauses().app).not.toBeNull();
    onDay(2);
    expect(pauses().app).toBeNull();
  });

  it('"Voltar" keeps today covered; the count is back to normal the next day', () => {
    const reading = create();
    mark(reading.id);
    onDay(1);
    const { id } = ok<PauseView>(pause());
    onDay(3);
    expect(service.command(ana, 'pause.end', { pauseId: id })).toMatchObject({ ok: true, changed: ['pauses', 'habits'] });
    expect(pauses().app).toBeNull();
    expect(habit(reading.id).paused).toBe(false);
    expect(streak(reading.id)).toBe(1);
    onDay(4);
    expect(streak(reading.id)).toBe(1);
    onDay(5);
    expect(streak(reading.id)).toBe(0);
    expect(service.command(ana, 'pause.end', { pauseId: id })).toMatchObject({ ok: true, changed: [] });
  });

  it('archiving ends the habit’s own pause; deleting removes its pauses', () => {
    const reading = create();
    pause({ habitId: reading.id });
    service.command(ana, 'habit.archive', { habitId: reading.id });
    expect(pauses().habits).toEqual([]);
    expect(pause({ habitId: reading.id })).toEqual({ ok: false, error: 'conflict' });
    service.command(ana, 'habit.delete', { habitId: reading.id });
    expect(service['ctx'].sql.all('SELECT * FROM pauses')).toEqual([]);
  });
});
