// Each member's XP and gold (docs/spec/progressao.md). The level is never stored: it comes from
// xp_total through the curve.
import type { ProgressView } from '../../src/application/api-contract';
import { levelOf } from '../../src/domain/habits/progression';
import type { Context } from './context';
import type { Member } from './members';

interface ProgressRow {
  xp_total: number;
  gold: number;
}

function row(ctx: Context, memberId: string): ProgressRow {
  const [found] = ctx.sql.all<ProgressRow>('SELECT xp_total, gold FROM progress WHERE member_id = ?', memberId);
  return found ?? { xp_total: 0, gold: 0 };
}

function toView(progress: ProgressRow): ProgressView {
  return { xpTotal: progress.xp_total, gold: progress.gold, ...levelOf(progress.xp_total) };
}

export function getProgress(ctx: Context, actor: Member): ProgressView {
  return toView(row(ctx, actor.id));
}

/**
 * Adds (or, when undoing a completion, takes back) XP and gold. Neither ever goes below 0: gold
 * already spent is not owed back. Returns the levels before and after.
 */
export function addProgress(ctx: Context, memberId: string, xp: number, gold: number): { before: number; after: number } {
  const current = row(ctx, memberId);
  const next = { xp_total: Math.max(0, current.xp_total + xp), gold: Math.max(0, current.gold + gold) };
  ctx.sql.run(
    `INSERT INTO progress (member_id, xp_total, gold) VALUES (?, ?, ?)
     ON CONFLICT (member_id) DO UPDATE SET xp_total = excluded.xp_total, gold = excluded.gold`,
    memberId,
    next.xp_total,
    next.gold,
  );
  return { before: levelOf(current.xp_total).level, after: levelOf(next.xp_total).level };
}
