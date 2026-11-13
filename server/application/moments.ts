// The short moments on the server (docs/spec/telas-e-feedback.md "Momentos novos"). Called inside
// the command that caused them, so what they store joins its transaction. Only the actor's rows.
import type { Moment } from '../../src/application/api-contract';
import type { Day } from '../../src/domain/day';
import type { HabitHistory } from '../../src/domain/habits/consistency';
import { closesDay, isFirstStep, rewardInReach, streakRecordAfter, type DayItem, type StreakRecordState } from '../../src/domain/habits/moments';
import type { Context } from './context';
import { goldOf } from './progress';
import { ensureSettings } from './settings';

/** Primeiro passo: stored on the first completion, so it never comes back, even after an undo. */
export function firstStepAfter(ctx: Context, memberId: string, day: Day): Moment[] {
  ensureSettings(ctx, memberId);
  const [row] = ctx.sql.all<{ first_step_on: Day | null }>('SELECT first_step_on FROM member_settings WHERE member_id = ?', memberId);
  if (!isFirstStep(row.first_step_on)) return [];
  ctx.sql.run('UPDATE member_settings SET first_step_on = ? WHERE member_id = ?', day, memberId);
  return [{ kind: 'firstStep' }];
}

/** Dia fechado, once a day: stored so an undo and a new mark do not repeat it. */
export function dayClosedAfter(ctx: Context, memberId: string, items: readonly DayItem[], today: Day): Moment[] {
  ensureSettings(ctx, memberId);
  const [row] = ctx.sql.all<{ day_closed_on: Day | null }>('SELECT day_closed_on FROM member_settings WHERE member_id = ?', memberId);
  if (!closesDay(items, today, row.day_closed_on)) return [];
  ctx.sql.run('UPDATE member_settings SET day_closed_on = ? WHERE member_id = ?', today, memberId);
  return [{ kind: 'dayClosed' }];
}

/** Recompensa ao alcance, from the balance before the command's gold to the balance now. */
export function rewardAfter(ctx: Context, memberId: string, goldBefore: number): Moment[] {
  const rewards = ctx.sql.all<{ id: string; name: string; cost: number }>(
    'SELECT id, name, cost FROM rewards WHERE member_id = ? ORDER BY cost DESC, name',
    memberId,
  );
  const reward = rewardInReach(goldBefore, goldOf(ctx, memberId), rewards);
  return reward ? [{ kind: 'rewardInReach', rewardId: reward.id, rewardName: reward.name }] : [];
}

/** The habit's part of a streak record: free habits have no streak. */
export interface RecordHabit {
  readonly id: string;
  readonly name: string;
  readonly best_streak: number | null;
  readonly best_streak_on: Day | null;
  readonly record_on: Day | null;
}

/** Recorde de streak after a completion of a daily or weekday habit; keeps the habit's best. */
export function streakRecordOf(ctx: Context, habit: RecordHabit, history: HabitHistory, today: Day): Moment[] {
  if (history.shape.rule === 'free') return [];
  const state: StreakRecordState = { best: habit.best_streak, bestOn: habit.best_streak_on, recordOn: habit.record_on };
  const { state: next, record } = streakRecordAfter(history, today, state);
  if (next !== state) {
    ctx.sql.run('UPDATE habits SET best_streak = ?, best_streak_on = ?, record_on = ? WHERE id = ?', next.best, next.bestOn, next.recordOn, habit.id);
  }
  return record === null ? [] : [{ kind: 'streakRecord', habitId: habit.id, habitName: habit.name, streak: record }];
}
