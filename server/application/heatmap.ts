// The heatmaps and the folha do dia (docs/spec/heatmap.md). Computed from completions, milestones
// and achievements; nothing is stored for them. Only the actor's own rows (ADR-008): a deleted
// habit's rows are gone, so it no longer counts; an archived one still does.
import type { DaySheetView, HabitHeatmapView, HeatmapMarker, OverallHeatmapView } from '../../src/application/api-contract';
import { isDay, type Day } from '../../src/domain/day';
import type { Track } from '../../src/domain/habits/achievements';
import { habitCellFraction, heatmapRange, overallLevel } from '../../src/domain/habits/heatmap';
import { QueryError, type Context } from './context';
import type { Member } from './members';
import { today } from './settings';

type Input = Record<string, unknown>;

interface CellRow {
  day: Day;
  count: number;
  done: number;
  minimum: number;
}

export function habitHeatmap(ctx: Context, actor: Member, input: Input): HabitHeatmapView | QueryError {
  if (typeof input.habitId !== 'string') return new QueryError('not_found');
  const [habit] = ctx.sql.all<{ id: string; daily_goal: number }>(
    'SELECT id, daily_goal FROM habits WHERE id = ? AND member_id = ?',
    input.habitId,
    actor.id,
  );
  if (!habit) return new QueryError('not_found');
  const { from, to } = heatmapRange(today(ctx, actor.id));
  const cells = ctx.sql.all<CellRow>(
    'SELECT day, count, done, minimum FROM completions WHERE habit_id = ? AND day BETWEEN ? AND ? AND (done = 1 OR count > 0)',
    habit.id,
    from,
    to,
  );
  const markers = ctx.sql.all<{ day: Day; kind: HeatmapMarker }>(
    'SELECT day, kind FROM milestones WHERE habit_id = ? AND day BETWEEN ? AND ?',
    habit.id,
    from,
    to,
  );
  const days = new Map<Day, { day: Day; fraction: number; minimum: boolean; markers: HeatmapMarker[] }>();
  for (const cell of cells) {
    const record = { count: cell.count, done: cell.done === 1, minimum: cell.minimum === 1 };
    days.set(cell.day, { day: cell.day, fraction: habitCellFraction(record, habit.daily_goal), minimum: record.done && record.minimum, markers: [] });
  }
  for (const marker of markers) {
    const entry = days.get(marker.day) ?? { day: marker.day, fraction: 0, minimum: false, markers: [] };
    if (!entry.markers.includes(marker.kind)) entry.markers.push(marker.kind);
    days.set(marker.day, entry);
  }
  return { from, to, days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)) };
}

export function overallHeatmap(ctx: Context, actor: Member): OverallHeatmapView {
  const { from, to } = heatmapRange(today(ctx, actor.id));
  const rows = ctx.sql.all<{ day: Day; completions: number }>(
    'SELECT day, COUNT(*) AS completions FROM completions WHERE member_id = ? AND done = 1 AND day BETWEEN ? AND ? GROUP BY day ORDER BY day',
    actor.id,
    from,
    to,
  );
  return { from, to, days: rows.map((r) => ({ day: r.day, completions: r.completions, level: overallLevel(r.completions) })) };
}

export function daySheet(ctx: Context, actor: Member, input: Input): DaySheetView | QueryError {
  const day = input.day;
  if (!isDay(day) || day > today(ctx, actor.id)) return new QueryError('invalid');
  const habits = ctx.sql.all<{ habit_id: string; name: string; done: number; minimum: number; count: number; daily_goal: number }>(
    `SELECT completions.habit_id, habits.name, completions.done, completions.minimum, completions.count, habits.daily_goal
     FROM completions JOIN habits ON habits.id = completions.habit_id
     WHERE completions.member_id = ? AND completions.day = ? AND (completions.done = 1 OR completions.count > 0)
     ORDER BY habits.position`,
    actor.id,
    day,
  );
  const markers = ctx.sql.all<{ habit_id: string; name: string; kind: HeatmapMarker }>(
    `SELECT milestones.habit_id, habits.name, milestones.kind
     FROM milestones JOIN habits ON habits.id = milestones.habit_id
     WHERE milestones.member_id = ? AND milestones.day = ? ORDER BY habits.position`,
    actor.id,
    day,
  );
  const achievements = ctx.sql.all<{ track: Track; milestone: number; gold: number }>(
    'SELECT track, milestone, gold FROM achievements WHERE member_id = ? AND reached_on = ? ORDER BY track, milestone',
    actor.id,
    day,
  );
  return {
    day,
    habits: habits.map((h) => ({
      habitId: h.habit_id,
      habitName: h.name,
      done: h.done === 1,
      minimum: h.done === 1 && h.minimum === 1,
      count: h.count,
      dailyGoal: h.daily_goal,
    })),
    markers: markers.map((m) => ({ habitId: m.habit_id, habitName: m.name, kind: m.kind })),
    achievements,
  };
}
