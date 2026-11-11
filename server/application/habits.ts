// Habits and the member's day (docs/spec/habitos.md, registrar-o-dia.md, regua.md). Every query
// and command reads and writes only the actor's own rows (ADR-008): an id of someone else's habit
// is simply not found.
import type { HabitView, MarkResult, TodayView } from '../../src/application/api-contract';
import type { Day } from '../../src/domain/day';
import { consistencyOn, streakOn, type HabitHistory } from '../../src/domain/habits/consistency';
import { complete, markMinimum, NOT_STARTED, tap, type DayEntry } from '../../src/domain/habits/day-log';
import {
  isDifficulty,
  isRule,
  isValidDailyGoal,
  isValidWeekdays,
  normalizeHabitName,
  normalizeMinimum,
  shapeFor,
  type Difficulty,
  type HabitShape,
  type HabitState,
  type Rule,
} from '../../src/domain/habits/habit';
import { isActive, isFrozenOn, type PausePeriod } from '../../src/domain/habits/pause';
import { failure, nowIso, QueryError, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { deletePausesOf, endArchivedStretch, periodsOf, startArchivedStretch } from './pauses';
import { addProgress } from './progress';
import { today } from './settings';

interface HabitRow {
  id: string;
  member_id: string;
  name: string;
  rule: Rule;
  difficulty: Difficulty;
  daily_goal: number;
  weekdays: number;
  minimum: string | null;
  stars: number;
  position: number;
  state: HabitState;
  tier_started_on: Day;
  streak_carry: number;
  archived_on: Day | null;
}

interface CompletionRow {
  id: string;
  habit_id: string;
  day: Day;
  count: number;
  done: number;
  minimum: number;
  xp: number;
  gold: number;
}

type Input = Record<string, unknown>;

const CHANGED = ['habits'] as const;
const CHANGED_WITH_PROGRESS = ['habits', 'progress'] as const;
const CHANGED_WITH_PAUSES = ['habits', 'pauses'] as const;

/** What a habit's view needs besides its row: the member's today, pauses and done days. */
interface Lens {
  readonly today: Day;
  readonly periods: readonly PausePeriod[];
  readonly doneDays: ReadonlyMap<string, ReadonlySet<Day>>;
}

/** The lens for the member's habits; with `habitId`, only that habit's completions are read. */
function lensFor(ctx: Context, actor: Member, habitId?: string): Lens {
  const rows = habitId
    ? ctx.sql.all<{ habit_id: string; day: Day }>('SELECT habit_id, day FROM completions WHERE habit_id = ? AND done = 1', habitId)
    : ctx.sql.all<{ habit_id: string; day: Day }>('SELECT habit_id, day FROM completions WHERE member_id = ? AND done = 1', actor.id);
  const doneDays = new Map<string, Set<Day>>();
  for (const row of rows) {
    const days = doneDays.get(row.habit_id) ?? new Set<Day>();
    days.add(row.day);
    doneDays.set(row.habit_id, days);
  }
  return { today: today(ctx, actor.id), periods: periodsOf(ctx, actor.id), doneDays };
}

function shapeOf(row: HabitRow): HabitShape {
  return { rule: row.rule, difficulty: row.difficulty, dailyGoal: row.daily_goal, weekdays: row.weekdays };
}

function historyOf(row: HabitRow, lens: Lens): HabitHistory {
  return {
    shape: shapeOf(row),
    windowStart: row.tier_started_on,
    carry: row.streak_carry,
    doneDays: lens.doneDays.get(row.id) ?? new Set(),
    isFrozen: (day) => isFrozenOn(lens.periods, row.id, day),
  };
}

function toView(row: HabitRow, lens: Lens): HabitView {
  return {
    id: row.id,
    name: row.name,
    rule: row.rule,
    difficulty: row.difficulty,
    dailyGoal: row.daily_goal,
    weekdays: row.weekdays,
    stars: row.stars,
    state: row.state,
    archivedOn: row.archived_on,
    minimum: row.minimum,
    // A running pause, not one ended by "Voltar" today (today still freezes the streak).
    paused: isFrozenOn(
      lens.periods.filter((p) => p.kind === 'pause' && isActive(p, lens.today)),
      row.id,
      lens.today,
    ),
    consistency: consistencyOn(historyOf(row, lens), lens.today),
  };
}

function toEntry(row: CompletionRow | undefined): DayEntry {
  return row ? { count: row.count, done: row.done === 1, minimum: row.minimum === 1, xp: row.xp, gold: row.gold } : NOT_STARTED;
}

function findHabit(ctx: Context, actor: Member, habitId: unknown): HabitRow | null {
  if (typeof habitId !== 'string') return null;
  const [row] = ctx.sql.all<HabitRow>('SELECT * FROM habits WHERE id = ? AND member_id = ?', habitId, actor.id);
  return row ?? null;
}

function reload(ctx: Context, id: string): HabitRow {
  return ctx.sql.all<HabitRow>('SELECT * FROM habits WHERE id = ?', id)[0];
}

function viewOf(ctx: Context, actor: Member, id: string): HabitView {
  return toView(reload(ctx, id), lensFor(ctx, actor, id));
}

function completionOn(ctx: Context, habitId: string, day: Day): CompletionRow | undefined {
  return ctx.sql.all<CompletionRow>('SELECT * FROM completions WHERE habit_id = ? AND day = ?', habitId, day)[0];
}

function saveEntry(ctx: Context, actor: Member, habitId: string, day: Day, entry: DayEntry): void {
  ctx.sql.run(
    `INSERT INTO completions (id, member_id, habit_id, day, count, done, minimum, xp, gold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (habit_id, day) DO UPDATE SET
       count = excluded.count, done = excluded.done, minimum = excluded.minimum, xp = excluded.xp, gold = excluded.gold`,
    ctx.ids.next(),
    actor.id,
    habitId,
    day,
    entry.count,
    entry.done ? 1 : 0,
    entry.minimum ? 1 : 0,
    entry.xp,
    entry.gold,
  );
}

// Queries

export function todayView(ctx: Context, actor: Member): TodayView {
  const lens = lensFor(ctx, actor);
  const day = lens.today;
  const habits = ctx.sql.all<HabitRow>("SELECT * FROM habits WHERE member_id = ? AND state = 'active' ORDER BY position", actor.id);
  const entries = new Map(
    ctx.sql.all<CompletionRow>('SELECT * FROM completions WHERE member_id = ? AND day = ?', actor.id, day).map((c) => [c.habit_id, c]),
  );
  return { day, habits: habits.map((row) => ({ habit: toView(row, lens), entry: toEntry(entries.get(row.id)) })) };
}

export function getHabit(ctx: Context, actor: Member, input: Input): HabitView | QueryError {
  const row = findHabit(ctx, actor, input.habitId);
  return row ? toView(row, lensFor(ctx, actor, row.id)) : new QueryError('not_found');
}

export function archivedHabits(ctx: Context, actor: Member): HabitView[] {
  const lens = lensFor(ctx, actor);
  return ctx.sql
    .all<HabitRow>("SELECT * FROM habits WHERE member_id = ? AND state = 'archived' ORDER BY archived_on DESC, name", actor.id)
    .map((row) => toView(row, lens));
}

// Commands

export function createHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const name = normalizeHabitName(input.name);
  if (!name || !isRule(input.rule) || !isDifficulty(input.difficulty)) return failure('invalid');
  if (input.rule === 'daily' && input.dailyGoal !== undefined && !isValidDailyGoal(input.dailyGoal)) return failure('invalid');
  const shape = shapeFor(input.rule, input.difficulty, Number(input.dailyGoal ?? 1), Number(input.weekdays ?? 0));
  if (!shape) return failure('invalid');
  const minimum = normalizeMinimum(input.minimum ?? null);
  if (minimum === undefined || (minimum !== null && shape.rule === 'free')) return failure('invalid');

  const [{ next }] = ctx.sql.all<{ next: number }>('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM habits WHERE member_id = ?', actor.id);
  const id = ctx.ids.next();
  ctx.sql.run(
    `INSERT INTO habits (id, member_id, name, rule, difficulty, daily_goal, weekdays, minimum, position, tier_started_on, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    actor.id,
    name,
    shape.rule,
    shape.difficulty,
    shape.dailyGoal,
    shape.weekdays,
    minimum,
    next,
    today(ctx, actor.id),
    nowIso(ctx),
  );
  return { ok: true, value: viewOf(ctx, actor, id), changed: CHANGED };
}

/**
 * Name, versão mínima and time rule. A new rule restarts the window for Automatizado
 * (tier_started_on) and the streak (no carry); a daily habit keeps its goal, a weekday habit takes
 * the days chosen in the edit, a free habit loses its versão mínima. No `minimum` keeps it.
 */
export function updateHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (habit.state !== 'active') return failure('conflict');
  const name = normalizeHabitName(input.name);
  if (!name || !isRule(input.rule)) return failure('invalid');
  const minimum = input.minimum === undefined ? (input.rule === 'free' ? null : habit.minimum) : normalizeMinimum(input.minimum);
  if (minimum === undefined || (minimum !== null && input.rule === 'free')) return failure('invalid');

  if (input.rule !== habit.rule) {
    const shape = shapeFor(input.rule, habit.difficulty, habit.daily_goal, Number(input.weekdays ?? 0));
    if (!shape) return failure('invalid');
    ctx.sql.run(
      'UPDATE habits SET rule = ?, daily_goal = ?, weekdays = ?, tier_started_on = ?, streak_carry = 0 WHERE id = ?',
      shape.rule,
      shape.dailyGoal,
      shape.weekdays,
      today(ctx, actor.id),
      habit.id,
    );
  }
  ctx.sql.run('UPDATE habits SET name = ?, minimum = ? WHERE id = ?', name, minimum, habit.id);
  return { ok: true, value: viewOf(ctx, actor, habit.id), changed: CHANGED };
}

/**
 * Subir or baixar a régua. The size must fit the rule. The streak goes on: what it was before
 * today is carried into the new window, so the days before count by the old size (ADR-011). When
 * a lower goal is already reached today, the day completes now, at the new size.
 */
export function resizeHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (habit.state !== 'active') return failure('conflict');
  if (!isDifficulty(input.difficulty) || !isValidDailyGoal(input.dailyGoal)) return failure('invalid');
  if (habit.rule !== 'daily' && input.dailyGoal !== 1) return failure('invalid');
  const weekdays = habit.rule === 'weekdays' ? input.weekdays : 0;
  if (habit.rule === 'weekdays' && !isValidWeekdays(weekdays)) return failure('invalid');
  if (habit.rule !== 'weekdays' && input.weekdays !== 0) return failure('invalid');

  const lens = lensFor(ctx, actor, habit.id);
  const day = lens.today;
  const doneToday = lens.doneDays.get(habit.id)?.has(day) ? 1 : 0;
  const carry = streakOn(historyOf(habit, lens), day) - doneToday;
  ctx.sql.run(
    'UPDATE habits SET difficulty = ?, daily_goal = ?, weekdays = ?, tier_started_on = ?, streak_carry = ? WHERE id = ?',
    input.difficulty,
    input.dailyGoal,
    weekdays as number,
    day,
    carry,
    habit.id,
  );

  let changedProgress = false;
  const entry = toEntry(completionOn(ctx, habit.id, day));
  if (!entry.done && entry.count > 0 && entry.count >= input.dailyGoal) {
    const done = complete({ difficulty: input.difficulty, stars: habit.stars }, entry.count);
    saveEntry(ctx, actor, habit.id, day, done);
    addProgress(ctx, actor.id, done.xp, done.gold);
    changedProgress = true;
  }
  return { ok: true, value: viewOf(ctx, actor, habit.id), changed: changedProgress ? CHANGED_WITH_PROGRESS : CHANGED };
}

/** Archiving freezes the streak like a pause and ends the habit's own running pause. */
export function archiveHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (habit.state === 'active') {
    const day = today(ctx, actor.id);
    ctx.sql.run("UPDATE habits SET state = 'archived', archived_on = ? WHERE id = ?", day, habit.id);
    startArchivedStretch(ctx, actor.id, habit.id, day);
  }
  return { ok: true, value: viewOf(ctx, actor, habit.id), changed: CHANGED_WITH_PAUSES };
}

/** The streak goes on from where it stopped, as after a pause. */
export function reactivateHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (habit.state === 'archived') {
    ctx.sql.run("UPDATE habits SET state = 'active', archived_on = NULL WHERE id = ?", habit.id);
    endArchivedStretch(ctx, habit.id, today(ctx, actor.id));
  }
  return { ok: true, value: viewOf(ctx, actor, habit.id), changed: CHANGED };
}

/** Deletes the habit and its history. XP and gold already earned stay with the member. */
export function deleteHabit(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  ctx.sql.run('DELETE FROM completions WHERE habit_id = ?', habit.id);
  deletePausesOf(ctx, habit.id);
  ctx.sql.run('DELETE FROM habits WHERE id = ?', habit.id);
  return { ok: true, value: null, changed: CHANGED_WITH_PAUSES };
}

type Step = (habit: HabitRow, day: Day, entry: DayEntry) => DayEntry | null;

/** One tap on the marker, on the member's today. A paused habit takes it normally. */
export function markHabit(ctx: Context, actor: Member, input: Input): CommandResult<MarkResult> {
  return record(ctx, actor, input, (habit, day, entry) => tap({ ...shapeOf(habit), stars: habit.stars }, day, entry));
}

/** The long press: the versão mínima completes today at once, whatever the counter says. */
export function markHabitMinimum(ctx: Context, actor: Member, input: Input): CommandResult<MarkResult> {
  return record(ctx, actor, input, (habit, day, entry) =>
    markMinimum({ ...shapeOf(habit), stars: habit.stars, minimum: habit.minimum }, day, entry),
  );
}

function record(ctx: Context, actor: Member, input: Input, step: Step): CommandResult<MarkResult> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (habit.state !== 'active') return failure('conflict');
  const day = today(ctx, actor.id);
  const entry = step(habit, day, toEntry(completionOn(ctx, habit.id, day)));
  if (!entry) return failure('conflict');
  saveEntry(ctx, actor, habit.id, day, entry);
  if (!entry.done) return { ok: true, value: { entry, levelUp: null }, changed: CHANGED };
  const levels = addProgress(ctx, actor.id, entry.xp, entry.gold);
  return { ok: true, value: { entry, levelUp: levels.after > levels.before ? levels.after : null }, changed: CHANGED_WITH_PROGRESS };
}

/**
 * Undoes today's record of a habit and gives back exactly what it earned (gold stops at 0).
 * Yesterday's completions are locked: only the member's today can be undone.
 */
export function unmarkHabit(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  const completion = completionOn(ctx, habit.id, today(ctx, actor.id));
  if (!completion) return failure('not_found');
  ctx.sql.run('DELETE FROM completions WHERE id = ?', completion.id);
  if (completion.done !== 1) return { ok: true, value: null, changed: CHANGED };
  addProgress(ctx, actor.id, -completion.xp, -completion.gold);
  return { ok: true, value: null, changed: CHANGED_WITH_PROGRESS };
}
