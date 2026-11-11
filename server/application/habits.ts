// Habits and the member's day (docs/spec/habitos.md, registrar-o-dia.md, regua.md). Every query
// and command reads and writes only the actor's own rows (ADR-008): an id of someone else's habit
// is simply not found.
import type { Celebration, HabitView, MarkResult, ResizeResult, ReviewResult, TodayView, YesterdayView } from '../../src/application/api-contract';
import { addDays, dayOf, type Day } from '../../src/domain/day';
import { consistencyOn, streakOn, type HabitHistory } from '../../src/domain/habits/consistency';
import { complete, completeInReview, markMinimum, NOT_STARTED, planReview, tap, type DayEntry } from '../../src/domain/habits/day-log';
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
import { INVITATION_KINDS, invitationOn, type InvitationKind } from '../../src/domain/habits/invitations';
import { masteryOn, type MasteryHistory } from '../../src/domain/habits/mastery';
import { covers, isActive, isFrozenOn, type PausePeriod } from '../../src/domain/habits/pause';
import { earnsStar, reguaOptions, tierKey } from '../../src/domain/habits/regua';
import { failure, nowIso, QueryError, type CommandResult, type Context } from './context';
import { checkMastery, dismissalsOf, dismissInvitation, giveStar, recordTier, tiersOf } from './mastery';
import type { Member } from './members';
import { deletePausesOf, endArchivedStretch, periodsOf, startArchivedStretch } from './pauses';
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
  minimum: string | null;
  stars: number;
  position: number;
  state: HabitState;
  tier_started_on: Day;
  streak_carry: number;
  archived_on: Day | null;
  created_at: string;
  automated_on: Day | null;
  tier_mastered_on: Day | null;
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
const CHANGED_WITH_ACHIEVEMENTS = ['habits', 'progress', 'achievements'] as const;

/**
 * What a habit's view needs besides its row: the member's today and calendar, pauses, done days
 * (and which were the versão mínima), the patamares each habit had and the invitations dismissed.
 */
interface Lens {
  readonly today: Day;
  readonly dayOfInstant: (iso: string) => Day;
  readonly periods: readonly PausePeriod[];
  readonly doneDays: ReadonlyMap<string, ReadonlySet<Day>>;
  readonly minimumDays: ReadonlyMap<string, ReadonlySet<Day>>;
  readonly tiers: ReadonlyMap<string, readonly string[]>;
  readonly dismissals: ReadonlyMap<string, Partial<Record<InvitationKind, Day>>>;
}

function addTo(map: Map<string, Set<Day>>, habitId: string, day: Day): void {
  const days = map.get(habitId) ?? new Set<Day>();
  days.add(day);
  map.set(habitId, days);
}

/** The lens for the member's habits; with `habitId`, only that habit's rows are read. */
function lensFor(ctx: Context, actor: Member, habitId?: string): Lens {
  type Done = { habit_id: string; day: Day; minimum: number };
  const rows = habitId
    ? ctx.sql.all<Done>('SELECT habit_id, day, minimum FROM completions WHERE habit_id = ? AND done = 1', habitId)
    : ctx.sql.all<Done>('SELECT habit_id, day, minimum FROM completions WHERE member_id = ? AND done = 1', actor.id);
  const doneDays = new Map<string, Set<Day>>();
  const minimumDays = new Map<string, Set<Day>>();
  for (const row of rows) {
    addTo(doneDays, row.habit_id, row.day);
    if (row.minimum === 1) addTo(minimumDays, row.habit_id, row.day);
  }
  const member = memberDay(ctx, actor.id);
  return {
    today: member.today,
    dayOfInstant: (iso) => dayOf(new Date(iso), member.timeZone, member.turnover),
    periods: periodsOf(ctx, actor.id),
    doneDays,
    minimumDays,
    tiers: tiersOf(ctx, actor.id, habitId),
    dismissals: dismissalsOf(ctx, actor.id),
  };
}

function shapeOf(row: HabitRow): HabitShape {
  return { rule: row.rule, difficulty: row.difficulty, dailyGoal: row.daily_goal, weekdays: row.weekdays };
}

function historyOf(row: HabitRow, lens: Lens): MasteryHistory {
  return {
    shape: shapeOf(row),
    windowStart: row.tier_started_on,
    carry: row.streak_carry,
    doneDays: lens.doneDays.get(row.id) ?? new Set(),
    minimumDays: lens.minimumDays.get(row.id) ?? new Set(),
    isFrozen: (day) => isFrozenOn(lens.periods, row.id, day),
  };
}

/** The régua invitation of an active habit, on the member's today. */
function invitationFor(row: HabitRow, history: HabitHistory, lens: Lens): InvitationKind | null {
  if (row.state !== 'active') return null;
  const pauses = lens.periods.filter((p) => p.kind === 'pause' && (p.habitId === null || p.habitId === row.id));
  return invitationOn(
    {
      history,
      createdOn: lens.dayOfInstant(row.created_at),
      tierMastered: row.tier_mastered_on !== null,
      canRaise: reguaOptions(shapeOf(row), 'raise').length > 0,
      isPausedOn: (day) => pauses.some((p) => covers(p, day)),
      dismissedOn: lens.dismissals.get(row.id) ?? {},
    },
    lens.today,
  );
}

function toView(row: HabitRow, lens: Lens): HabitView {
  const history = historyOf(row, lens);
  const mastery = masteryOn(history, lens.today);
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
    consistency: consistencyOn(history, lens.today),
    automated: row.automated_on !== null,
    tierMastered: row.tier_mastered_on !== null,
    mastery: { done: mastery.done, needed: mastery.needed },
    tiers: lens.tiers.get(row.id) ?? [],
    invitation: invitationFor(row, history, lens),
  };
}

/** Domínio after a completion of the habit, with its history as it is now. */
function masteryAfter(ctx: Context, actor: Member, habitId: string): Celebration[] {
  const row = reload(ctx, habitId);
  const lens = lensFor(ctx, actor, habitId);
  const habit = {
    id: row.id,
    name: row.name,
    difficulty: row.difficulty,
    stars: row.stars,
    tierKey: tierKey(row.rule, shapeOf(row)),
    tierMastered: row.tier_mastered_on !== null,
    automated: row.automated_on !== null,
  };
  return checkMastery(ctx, actor, habit, historyOf(row, lens), lens.today);
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

/**
 * Revisar ontem: the active habits that existed yesterday, could be done then and were not. Empty
 * once the member closed the review today.
 */
function reviewItems(ctx: Context, actor: Member): { day: Day; today: Day; reviewed: boolean; items: { habit: HabitView; row: HabitRow; entry: DayEntry }[] } {
  const member = memberDay(ctx, actor.id);
  const lens = lensFor(ctx, actor);
  const day = addDays(member.today, -1);
  if (member.reviewedOn === member.today) return { day, today: member.today, reviewed: true, items: [] };
  const rows = ctx.sql
    .all<HabitRow>("SELECT * FROM habits WHERE member_id = ? AND state = 'active' ORDER BY position", actor.id)
    .filter((row) => dayOf(new Date(row.created_at), member.timeZone, member.turnover) <= day);
  const entries = new Map(
    ctx.sql.all<CompletionRow>('SELECT * FROM completions WHERE member_id = ? AND day = ?', actor.id, day).map((c) => [c.habit_id, c]),
  );
  const plan = planReview(
    rows.map((row) => ({ habit: { ...toView(row, lens), row }, entry: toEntry(entries.get(row.id)) })),
    day,
  );
  return { day, today: member.today, reviewed: false, items: plan.map(({ habit: { row, ...habit }, entry }) => ({ habit, row, entry })) };
}

export function yesterdayView(ctx: Context, actor: Member): YesterdayView {
  const { day, items } = reviewItems(ctx, actor);
  return { day, habits: items.map(({ habit, entry }) => ({ habit, entry })) };
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
  recordTier(ctx, id, tierKey(shape.rule, shape), today(ctx, actor.id));
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
    const day = today(ctx, actor.id);
    ctx.sql.run(
      'UPDATE habits SET rule = ?, daily_goal = ?, weekdays = ?, tier_started_on = ?, streak_carry = 0, tier_mastered_on = NULL WHERE id = ?',
      shape.rule,
      shape.dailyGoal,
      shape.weekdays,
      day,
      habit.id,
    );
    recordTier(ctx, habit.id, tierKey(shape.rule, shape), day);
  }
  ctx.sql.run('UPDATE habits SET name = ?, minimum = ? WHERE id = ?', name, minimum, habit.id);
  return { ok: true, value: viewOf(ctx, actor, habit.id), changed: CHANGED };
}

/**
 * Subir, baixar or ajustar a régua. The size must fit the rule. The streak goes on: what it was
 * before today is carried into the new window, so the days before count by the old size
 * (ADR-011); the mastery window restarts. A raise from a mastered patamar to a new one earns an
 * Estrela de Coragem. When a lower goal is already reached today, the day completes now, at the
 * new size.
 */
export function resizeHabit(ctx: Context, actor: Member, input: Input): CommandResult<ResizeResult> {
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
  const size = { difficulty: input.difficulty, dailyGoal: input.dailyGoal, weekdays: weekdays as number };
  const star = earnsStar(
    { ...shapeOf(habit), stars: habit.stars, tierMastered: habit.tier_mastered_on !== null, tiers: lens.tiers.get(habit.id) ?? [] },
    size,
  );
  const doneToday = lens.doneDays.get(habit.id)?.has(day) ? 1 : 0;
  const carry = streakOn(historyOf(habit, lens), day) - doneToday;
  ctx.sql.run(
    'UPDATE habits SET difficulty = ?, daily_goal = ?, weekdays = ?, tier_started_on = ?, streak_carry = ?, tier_mastered_on = NULL WHERE id = ?',
    size.difficulty,
    size.dailyGoal,
    size.weekdays,
    day,
    carry,
    habit.id,
  );
  recordTier(ctx, habit.id, tierKey(habit.rule, size), day);
  const celebrations = star ? giveStar(ctx, actor, habit.id, day) : [];

  let changedProgress = false;
  const entry = toEntry(completionOn(ctx, habit.id, day));
  if (!entry.done && entry.count > 0 && entry.count >= input.dailyGoal) {
    const done = complete({ difficulty: input.difficulty, stars: habit.stars + (star ? 1 : 0) }, entry.count);
    saveEntry(ctx, actor, habit.id, day, done);
    addProgress(ctx, actor.id, done.xp, done.gold);
    changedProgress = true;
  }
  const changed = star ? CHANGED_WITH_ACHIEVEMENTS : changedProgress ? CHANGED_WITH_PROGRESS : CHANGED;
  return { ok: true, value: { habit: viewOf(ctx, actor, habit.id), star, celebrations }, changed };
}

/** "Agora não" on a régua invitation: it comes back by the rules of each (docs/spec/regua.md). */
export function dismissHabitInvitation(ctx: Context, actor: Member, input: Input): CommandResult<HabitView> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  if (!INVITATION_KINDS.includes(input.kind as InvitationKind)) return failure('invalid');
  dismissInvitation(ctx, habit.id, input.kind as InvitationKind, today(ctx, actor.id));
  return { ok: true, value: viewOf(ctx, actor, habit.id), changed: CHANGED };
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

/**
 * Deletes the habit and its history. XP, gold, conquistas and the track counts (the selo and the
 * stars it earned) stay with the member.
 */
export function deleteHabit(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  const habit = findHabit(ctx, actor, input.habitId);
  if (!habit) return failure('not_found');
  ctx.sql.run('DELETE FROM completions WHERE habit_id = ?', habit.id);
  for (const table of ['habit_tiers', 'invitations', 'milestones']) ctx.sql.run(`DELETE FROM ${table} WHERE habit_id = ?`, habit.id);
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
  if (!entry.done) return { ok: true, value: { entry, levelUp: null, celebrations: [] }, changed: CHANGED };
  const levels = addProgress(ctx, actor.id, entry.xp, entry.gold);
  const celebrations = masteryAfter(ctx, actor, habit.id);
  return {
    ok: true,
    value: { entry, levelUp: levels.after > levels.before ? levels.after : null, celebrations },
    changed: celebrations.length > 0 ? CHANGED_WITH_ACHIEVEMENTS : CHANGED_WITH_PROGRESS,
  };
}

/**
 * Undoes today's record of a habit and gives back exactly what it earned (gold stops at 0).
 * Yesterday's completions are locked: only the member's today can be undone. A mastery this
 * completion reached stays, with its selo, prize and conquistas.
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
  if (ids.length === 0) return { ok: true, value: { xp, gold, levelUp: null, celebrations: [] }, changed: CHANGED };
  const levels = addProgress(ctx, actor.id, xp, gold);
  const celebrations = (ids as string[]).flatMap((id) => masteryAfter(ctx, actor, id));
  // Smallest first: every selo before the conquistas they reached.
  celebrations.sort((a, b) => Number(a.kind === 'achievement') - Number(b.kind === 'achievement'));
  return {
    ok: true,
    value: { xp, gold, levelUp: levels.after > levels.before ? levels.after : null, celebrations },
    changed: celebrations.length > 0 ? CHANGED_WITH_ACHIEVEMENTS : CHANGED_WITH_PROGRESS,
  };
}
