// Habits and the member's day (docs/spec/habitos.md, registrar-o-dia.md, regua.md). Every query
// and command reads and writes only the actor's own rows (ADR-008): an id of someone else's habit
// is simply not found.
import type { HabitView, MarkResult, ReviewResult, TodayView, YesterdayView } from '../../src/application/api-contract';
import { addDays, dayOf, type Day } from '../../src/domain/day';
import { complete, completeInReview, NOT_STARTED, planReview, tap, type DayEntry } from '../../src/domain/habits/day-log';
import {
  isDifficulty,
  isRule,
  isValidDailyGoal,
  isValidWeekdays,
  normalizeHabitName,
  shapeFor,
  type Difficulty,
  type HabitState,
  type Rule,
} from '../../src/domain/habits/habit';
import { failure, nowIso, QueryError, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { addProgress } from './progress';
import { memberDay, recordReview, today } from './settings';

interface HabitRow {
  id: string;
  member_id: string;
  name: string;
  rule: Rule;
  difficulty: Difficulty;
  daily_goal: number;
  weekdays: number;
  stars: number;
  position: number;
  state: HabitState;
  tier_started_on: Day;
  archived_on: Day | null;
  created_at: string;
}

interface CompletionRow {
  id: string;
  habit_id: string;
  day: Day;
  count: number;
  done: number;
  xp: number;
  gold: number;
}

type Input = Record<string, unknown>;

const CHANGED = ['habits'] as const;
const CHANGED_WITH_PROGRESS = ['habits', 'progress'] as const;

function toView(row: HabitRow): HabitView {
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
  };
}

function toEntry(row: CompletionRow | undefined): DayEntry {
  return row ? { count: row.count, done: row.done === 1, xp: row.xp, gold: row.gold } : NOT_STARTED;
}

function findHabit(ctx: Context, actor: Member, habitId: unknown): HabitRow | null {
  if (typeof habitId !== 'string') return null;
  const [row] = ctx.sql.all<HabitRow>('SELECT * FROM habits WHERE id = ? AND member_id = ?', habitId, actor.id);
  return row ?? null;
}

function reload(ctx: Context, id: string): HabitRow {
  return ctx.sql.all<HabitRow>('SELECT * FROM habits WHERE id = ?', id)[0];
}

function completionOn(ctx: Context, habitId: string, day: Day): CompletionRow | undefined {
  return ctx.sql.all<CompletionRow>('SELECT * FROM completions WHERE habit_id = ? AND day = ?', habitId, day)[0];
}

function saveEntry(ctx: Context, actor: Member, habitId: string, day: Day, entry: DayEntry): void {
  ctx.sql.run(
    `INSERT INTO completions (id, member_id, habit_id, day, count, done, xp, gold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (habit_id, day) DO UPDATE SET count = excluded.count, done = excluded.done, xp = excluded.xp, gold = excluded.gold`,
    ctx.ids.next(),
    actor.id,
    habitId,
    day,
    entry.count,
    entry.done ? 1 : 0,
    entry.xp,
    entry.gold,
  );
}

// Queries

export function todayView(ctx: Context, actor: Member): TodayView {
  const day = today(ctx, actor.id);
  const habits = ctx.sql.all<HabitRow>("SELECT * FROM habits WHERE member_id = ? AND state = 'active' ORDER BY position", actor.id);
  const entries = new Map(
    ctx.sql.all<CompletionRow>('SELECT * FROM completions WHERE member_id = ? AND day = ?', actor.id, day).map((c) => [c.habit_id, c]),
  );
  return { day, habits: habits.map((row) => ({ habit: toView(row), entry: toEntry(entries.get(row.id)) })) };
}

/**
 * Revisar ontem: the active habits that existed yesterday, could be done then and were not. Empty
 * once the member closed the review today.
 */
function reviewItems(ctx: Context, actor: Member): { day: Day; today: Day; reviewed: boolean; items: { row: HabitRow; entry: DayEntry }[] } {
  const member = memberDay(ctx, actor.id);
  const day = addDays(member.today, -1);
  if (member.reviewedOn === member.today) return { day, today: member.today, reviewed: true, items: [] };
  const rows = ctx.sql
    .all<HabitRow>("SELECT * FROM habits WHERE member_id = ? AND state = 'active' ORDER BY position", actor.id)
    .filter((row) => dayOf(new Date(row.created_at), member.timeZone, member.turnover) <= day);
  const entries = new Map(
    ctx.sql.all<CompletionRow>('SELECT * FROM completions WHERE member_id = ? AND day = ?', actor.id, day).map((c) => [c.habit_id, c]),
  );
  const plan = planReview(
    rows.map((row) => ({ habit: { ...toView(row), row }, entry: toEntry(entries.get(row.id)) })),
    day,
  );
  return { day, today: member.today, reviewed: false, items: plan.map(({ habit, entry }) => ({ row: habit.row, entry })) };
}

export function yesterdayView(ctx: Context, actor: Member): YesterdayView {
  const { day, items } = reviewItems(ctx, actor);
  return { day, habits: items.map(({ row, entry }) => ({ habit: toView(row), entry })) };
}

export function getHabit(ctx: Context, actor: Member, input: Input): HabitView | QueryError {
  const row = findHabit(ctx, actor, input.habitId);
  return row ? toView(row) : new QueryError('not_found');
}

export function archivedHabits(ctx: Context, actor: Member): HabitView[] {
  return ctx.sql
    .all<HabitRow>("SELECT * FROM habits WHERE member_id = ? AND state = 'archived' ORDER BY archived_on DESC, name", actor.id)
    .map(toView);
}

// Commands

export function createHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const name = normalizeHabitName(input.name);
  if (!name || !isRule(input.rule) || !isDifficulty(input.difficulty)) return failure('invalid');
  if (input.rule === 'daily' && input.dailyGoal !== undefined && !isValidDailyGoal(input.dailyGoal)) return failure('invalid');
  const shape = shapeFor(input.rule, input.difficulty, Number(input.dailyGoal ?? 1), Number(input.weekdays ?? 0));
  if (!shape) return failure('invalid');

  const [{ next }] = ctx.sql.all<{ next: number }>('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM habits WHERE member_id = ?', actor.id);
  const id = ctx.ids.next();
  ctx.sql.run(
    `INSERT INTO habits (id, member_id, name, rule, difficulty, daily_goal, weekdays, position, tier_started_on, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    actor.id,
    name,
    shape.rule,
    shape.difficulty,
    shape.dailyGoal,
    shape.weekdays,
    next,
    today(ctx, actor.id),
    nowIso(ctx),
  );
  return { ok: true, value: toView(reload(ctx, id)), changed: CHANGED };
}

/**
 * Name and time rule. A new rule restarts the window for Automatizado (tier_started_on); a daily
 * habit keeps its goal, a weekday habit takes the days chosen in the edit.
 */
export function updateHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (habit.state !== 'active') return failure('conflict');
  const name = normalizeHabitName(input.name);
  if (!name || !isRule(input.rule)) return failure('invalid');

  if (input.rule === habit.rule) {
    ctx.sql.run('UPDATE habits SET name = ? WHERE id = ?', name, habit.id);
  } else {
    const shape = shapeFor(input.rule, habit.difficulty, habit.daily_goal, Number(input.weekdays ?? 0));
    if (!shape) return failure('invalid');
    ctx.sql.run(
      'UPDATE habits SET name = ?, rule = ?, daily_goal = ?, weekdays = ?, tier_started_on = ? WHERE id = ?',
      name,
      shape.rule,
      shape.dailyGoal,
      shape.weekdays,
      today(ctx, actor.id),
      habit.id,
    );
  }
  return { ok: true, value: toView(reload(ctx, habit.id)), changed: CHANGED };
}

/**
 * Subir or baixar a régua. The size must fit the rule. When a lower goal is already reached
 * today, the day completes now, at the new size.
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

  const day = today(ctx, actor.id);
  ctx.sql.run(
    'UPDATE habits SET difficulty = ?, daily_goal = ?, weekdays = ?, tier_started_on = ? WHERE id = ?',
    input.difficulty,
    input.dailyGoal,
    weekdays as number,
    day,
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
  return { ok: true, value: toView(reload(ctx, habit.id)), changed: changedProgress ? CHANGED_WITH_PROGRESS : CHANGED };
}

export function archiveHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (habit.state === 'active') {
    ctx.sql.run("UPDATE habits SET state = 'archived', archived_on = ? WHERE id = ?", today(ctx, actor.id), habit.id);
  }
  return { ok: true, value: toView(reload(ctx, habit.id)), changed: CHANGED };
}

export function reactivateHabit(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  ctx.sql.run("UPDATE habits SET state = 'active', archived_on = NULL WHERE id = ?", habit.id);
  return { ok: true, value: toView(reload(ctx, habit.id)), changed: CHANGED };
}

/** Deletes the habit and its history. XP and gold already earned stay with the member. */
export function deleteHabit(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  ctx.sql.run('DELETE FROM completions WHERE habit_id = ?', habit.id);
  ctx.sql.run('DELETE FROM habits WHERE id = ?', habit.id);
  return { ok: true, value: null, changed: CHANGED };
}

/** One tap on the marker, on the member's today. */
export function markHabit(ctx: Context, actor: Member, input: Input): CommandResult<MarkResult> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (habit.state !== 'active') return failure('conflict');
  const day = today(ctx, actor.id);
  const shape = { rule: habit.rule, difficulty: habit.difficulty, dailyGoal: habit.daily_goal, weekdays: habit.weekdays, stars: habit.stars };
  const entry = tap(shape, day, toEntry(completionOn(ctx, habit.id, day)));
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

/**
 * Closes Revisar ontem: each chosen habit completes yesterday at its current size, earning XP and
 * gold as if marked then. Runs once a day; a second close (another device) is a conflict.
 */
export function reviewYesterday(ctx: Context, actor: Member, input: Input): CommandResult<ReviewResult> {
  const ids = input.habitIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) return failure('invalid');
  const { day, today: todayDay, reviewed, items } = reviewItems(ctx, actor);
  if (reviewed) return failure('conflict');
  const open = new Map(items.map((item) => [item.row.id, item]));
  if (ids.some((id) => !open.has(id as string))) return failure('invalid');

  let xp = 0;
  let gold = 0;
  for (const id of ids as string[]) {
    const { row, entry } = open.get(id)!;
    const done = completeInReview({ difficulty: row.difficulty, dailyGoal: row.daily_goal, stars: row.stars }, entry);
    saveEntry(ctx, actor, row.id, day, done);
    xp += done.xp;
    gold += done.gold;
  }
  recordReview(ctx, actor.id, todayDay);
  if (ids.length === 0) return { ok: true, value: { xp, gold, levelUp: null }, changed: CHANGED };
  const levels = addProgress(ctx, actor.id, xp, gold);
  return { ok: true, value: { xp, gold, levelUp: levels.after > levels.before ? levels.after : null }, changed: CHANGED_WITH_PROGRESS };
}
