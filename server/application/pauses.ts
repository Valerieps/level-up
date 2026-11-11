// Modo Pausa (docs/spec/modo-pausa.md) and the archived stretches of a habit (ADR-011). Only the
// actor's own pauses (ADR-008). A pause that reached its return date needs no write: which days a
// pause covers is computed (src/domain/habits/pause.ts).
import type { PausesView, PauseView } from '../../src/application/api-contract';
import type { Day } from '../../src/domain/day';
import { isActive, isValidReturnDate, type PauseKind, type PausePeriod } from '../../src/domain/habits/pause';
import { failure, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { today } from './settings';

interface PauseRow {
  id: string;
  member_id: string;
  habit_id: string | null;
  kind: PauseKind;
  from_day: Day;
  until_day: Day | null;
  ended_on: Day | null;
  habit_name?: string | null;
}

type Input = Record<string, unknown>;

const CHANGED = ['pauses', 'habits'] as const;

function toPeriod(row: PauseRow): PausePeriod {
  return { habitId: row.habit_id, kind: row.kind, fromDay: row.from_day, untilDay: row.until_day, endedOn: row.ended_on };
}

function toView(row: PauseRow): PauseView {
  return { id: row.id, habitId: row.habit_id, habitName: row.habit_name ?? null, fromDay: row.from_day, untilDay: row.until_day };
}

/** Every pause and archived stretch of the member: what freezes streaks. */
export function periodsOf(ctx: Context, memberId: string): PausePeriod[] {
  return ctx.sql.all<PauseRow>('SELECT * FROM pauses WHERE member_id = ?', memberId).map(toPeriod);
}

function runningPauses(ctx: Context, memberId: string, day: Day): PauseRow[] {
  return ctx.sql
    .all<PauseRow>(
      `SELECT pauses.*, habits.name AS habit_name FROM pauses LEFT JOIN habits ON habits.id = pauses.habit_id
       WHERE pauses.member_id = ? AND pauses.kind = 'pause' AND pauses.ended_on IS NULL ORDER BY pauses.from_day, habits.position`,
      memberId,
    )
    .filter((row) => isActive(toPeriod(row), day));
}

export function listPauses(ctx: Context, actor: Member): PausesView {
  const rows = runningPauses(ctx, actor.id, today(ctx, actor.id));
  const app = rows.find((row) => row.habit_id === null);
  return { app: app ? toView(app) : null, habits: rows.filter((row) => row.habit_id !== null).map(toView) };
}

export function startPause(ctx: Context, actor: Member, input: Input): CommandResult<PauseView> {
  const day = today(ctx, actor.id);
  const untilDay = input.untilDay ?? null;
  if (!isValidReturnDate(untilDay, day)) return failure('invalid');
  let habitId: string | null = null;
  if (input.habitId !== undefined) {
    if (typeof input.habitId !== 'string') return failure('invalid');
    const [habit] = ctx.sql.all<{ id: string; state: string }>('SELECT id, state FROM habits WHERE id = ? AND member_id = ?', input.habitId, actor.id);
    if (!habit) return failure('not_found');
    if (habit.state !== 'active') return failure('conflict');
    habitId = habit.id;
  }
  if (runningPauses(ctx, actor.id, day).some((row) => row.habit_id === habitId)) return failure('conflict');

  const id = ctx.ids.next();
  ctx.sql.run(
    "INSERT INTO pauses (id, member_id, habit_id, kind, from_day, until_day) VALUES (?, ?, ?, 'pause', ?, ?)",
    id,
    actor.id,
    habitId,
    day,
    untilDay,
  );
  const [row] = ctx.sql.all<PauseRow>(
    'SELECT pauses.*, habits.name AS habit_name FROM pauses LEFT JOIN habits ON habits.id = pauses.habit_id WHERE pauses.id = ?',
    id,
  );
  return { ok: true, value: toView(row), changed: CHANGED };
}

/** "Voltar". Ending a pause that already ended is a no-op. */
export function endPause(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  if (typeof input.pauseId !== 'string') return failure('invalid');
  const [row] = ctx.sql.all<PauseRow>("SELECT * FROM pauses WHERE id = ? AND member_id = ? AND kind = 'pause'", input.pauseId, actor.id);
  if (!row) return failure('not_found');
  const day = today(ctx, actor.id);
  if (!isActive(toPeriod(row), day)) return { ok: true, value: null, changed: [] };
  ctx.sql.run('UPDATE pauses SET ended_on = ? WHERE id = ?', day, row.id);
  return { ok: true, value: null, changed: CHANGED };
}

/** Archiving freezes the habit like a pause, and ends the habit's own running pause. */
export function startArchivedStretch(ctx: Context, memberId: string, habitId: string, day: Day): void {
  ctx.sql.run("UPDATE pauses SET ended_on = ? WHERE habit_id = ? AND kind = 'pause' AND ended_on IS NULL", day, habitId);
  ctx.sql.run("INSERT INTO pauses (id, member_id, habit_id, kind, from_day) VALUES (?, ?, ?, 'archive', ?)", ctx.ids.next(), memberId, habitId, day);
}

/** Reactivating: the streak goes on from where it stopped; the day of reactivating stays covered. */
export function endArchivedStretch(ctx: Context, habitId: string, day: Day): void {
  ctx.sql.run("UPDATE pauses SET ended_on = ? WHERE habit_id = ? AND kind = 'archive' AND ended_on IS NULL", day, habitId);
}

export function deletePausesOf(ctx: Context, habitId: string): void {
  ctx.sql.run('DELETE FROM pauses WHERE habit_id = ?', habitId);
}
