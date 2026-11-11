import { beforeEach, describe, expect, it } from 'vitest';
import type { DaySheetView, HabitHeatmapView, HabitView, OverallHeatmapView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const ADMIN = 'ana@example.com';
// Wednesday, 9:00 in São Paulo.
const WEDNESDAY = '2026-11-11T12:00:00Z';
const ana = 'h-ana';
const bia = 'h-bia';

let clock: ReturnType<typeof fixedClock>;
let service: GroupService;

beforeEach(() => {
  clock = fixedClock(WEDNESDAY);
  service = new GroupService(memorySql(), clock, sequentialIds());
  service.migrate();
  service.signIn({ sub: 's-ana', email: ADMIN, name: 'Ana', picture: null }, ana, [ADMIN]);
  service.command(ana, 'invite.create', { email: 'bia@example.com' });
  service.signIn({ sub: 's-bia', email: 'bia@example.com', name: 'Bia', picture: null }, bia, [ADMIN]);
});

function ok<T>(result: { ok: boolean; value?: unknown; error?: string }): T {
  expect(result).toMatchObject({ ok: true });
  return result.value as T;
}

const onDay = (offset: number) => clock.set(new Date(Date.parse(WEDNESDAY) + offset * 86_400_000).toISOString());
const create = (name: string, extra: Record<string, unknown> = {}) =>
  ok<HabitView>(service.command(ana, 'habit.create', { name, rule: 'daily', difficulty: 'easy', ...extra }));
const mark = (id: string) => ok(service.command(ana, 'habit.mark', { habitId: id }));
const habitHeatmap = (id: string, session = ana) => service.query(session, 'habitHeatmap', { habitId: id });
const overall = () => ok<OverallHeatmapView>(service.query(ana, 'heatmap', {}));
const sheet = (day: string) => service.query(ana, 'daySheet', { day });

describe('heatmap (spec/heatmap.md)', () => {
  it('shows done, partial and versão mínima days of a habit, and nothing for the rest', () => {
    const water = create('Água', { dailyGoal: 3 });
    const reading = create('Ler', { minimum: '1 página' });
    mark(water.id); // 1 of 3 on Wednesday
    ok(service.command(ana, 'habit.markMinimum', { habitId: reading.id }));
    onDay(1);
    for (let i = 0; i < 3; i++) mark(water.id);

    const map = ok<HabitHeatmapView>(habitHeatmap(water.id));
    expect(map).toMatchObject({ from: '2025-11-13', to: '2026-11-12' });
    expect(map.days.map((d) => [d.day, Number(d.fraction.toFixed(2)), d.minimum])).toEqual([
      ['2026-11-11', 0.33, false],
      ['2026-11-12', 1, false],
    ]);
    expect(ok<HabitHeatmapView>(habitHeatmap(reading.id)).days).toEqual([{ day: '2026-11-11', fraction: 1, minimum: true, markers: [] }]);
  });

  it('marks the day a habit mastered a patamar', () => {
    const reading = create('Ler');
    for (let d = 0; d < 21; d++) {
      onDay(d);
      mark(reading.id);
    }
    const marked = ok<HabitHeatmapView>(habitHeatmap(reading.id)).days.filter((d) => d.markers.length > 0);
    expect(marked.map((d) => d.markers)).toEqual([['mastered']]);
  });

  it('counts completions per day overall, archived habits included and deleted ones not', () => {
    const a = create('A');
    const b = create('B');
    const c = create('C');
    [a, b, c].forEach((h) => mark(h.id));
    ok(service.command(ana, 'habit.archive', { habitId: a.id }));
    ok(service.command(ana, 'habit.delete', { habitId: c.id }));
    expect(overall().days).toEqual([{ day: '2026-11-11', completions: 2, level: 2 }]);
  });

  it('opens the folha do dia with what was done and the conquistas reached', () => {
    const reading = create('Ler', { minimum: '1 página' });
    const water = create('Água', { dailyGoal: 3 });
    ok(service.command(ana, 'habit.markMinimum', { habitId: reading.id }));
    mark(water.id);
    expect(ok<DaySheetView>(sheet('2026-11-11'))).toEqual({
      day: '2026-11-11',
      habits: [
        { habitId: reading.id, habitName: 'Ler', done: true, minimum: true, count: 0, dailyGoal: 1 },
        { habitId: water.id, habitName: 'Água', done: false, minimum: false, count: 1, dailyGoal: 3 },
      ],
      markers: [],
      achievements: [],
    });
    expect(sheet('2026-11-12')).toEqual({ ok: false, error: 'invalid' });
    expect(sheet('ontem')).toEqual({ ok: false, error: 'invalid' });
  });

  it('keeps each member’s heatmap private', () => {
    const reading = create('Ler');
    expect(habitHeatmap(reading.id, bia)).toEqual({ ok: false, error: 'not_found' });
  });
});
