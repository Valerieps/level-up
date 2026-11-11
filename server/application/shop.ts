// Loja (docs/spec/loja.md): the member's rewards, redeeming them with gold and the history. Only
// the actor's own rows (ADR-008): an id of someone else's reward is simply not found.
import type { RedemptionView, RewardView, ShopView } from '../../src/application/api-contract';
import type { Day } from '../../src/domain/day';
import { isValidRewardCost, normalizeRewardName, RECENT_REDEMPTIONS } from '../../src/domain/shop/reward';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { addProgress, getProgress } from './progress';
import { today } from './settings';

type Input = Record<string, unknown>;

interface RewardRow {
  id: string;
  name: string;
  cost: number;
}

interface RedemptionRow {
  id: string;
  reward_id: string;
  name: string;
  cost: number;
  day: Day;
}

const CHANGED = ['shop'] as const;
const CHANGED_WITH_PROGRESS = ['shop', 'progress'] as const;

const toReward = (row: RewardRow): RewardView => ({ id: row.id, name: row.name, cost: row.cost });
const toRedemption = (row: RedemptionRow): RedemptionView => ({ id: row.id, rewardId: row.reward_id, name: row.name, cost: row.cost, day: row.day });

function findReward(ctx: Context, actor: Member, rewardId: unknown): RewardRow | null {
  if (typeof rewardId !== 'string') return null;
  const [row] = ctx.sql.all<RewardRow>('SELECT id, name, cost FROM rewards WHERE id = ? AND member_id = ?', rewardId, actor.id);
  return row ?? null;
}

function redemptions(ctx: Context, actor: Member, limit?: number): RedemptionView[] {
  const sql = 'SELECT id, reward_id, name, cost, day FROM redemptions WHERE member_id = ? ORDER BY at DESC, rowid DESC';
  const rows = limit === undefined ? ctx.sql.all<RedemptionRow>(sql, actor.id) : ctx.sql.all<RedemptionRow>(`${sql} LIMIT ?`, actor.id, limit);
  return rows.map(toRedemption);
}

export function shopView(ctx: Context, actor: Member): ShopView {
  const rewards = ctx.sql.all<RewardRow>('SELECT id, name, cost FROM rewards WHERE member_id = ? ORDER BY cost, name', actor.id);
  const [{ total }] = ctx.sql.all<{ total: number }>('SELECT COUNT(*) AS total FROM redemptions WHERE member_id = ?', actor.id);
  return { rewards: rewards.map(toReward), recent: redemptions(ctx, actor, RECENT_REDEMPTIONS), redemptionCount: total };
}

export function listRedemptions(ctx: Context, actor: Member): RedemptionView[] {
  return redemptions(ctx, actor);
}

export function createReward(ctx: Context, actor: Member, input: Input): CommandResult<RewardView> {
  const name = normalizeRewardName(input.name);
  if (name === null || !isValidRewardCost(input.cost)) return failure('invalid');
  const id = ctx.ids.next();
  ctx.sql.run('INSERT INTO rewards (id, member_id, name, cost, created_at) VALUES (?, ?, ?, ?, ?)', id, actor.id, name, input.cost, nowIso(ctx));
  return { ok: true, value: { id, name, cost: input.cost }, changed: CHANGED };
}

export function updateReward(ctx: Context, actor: Member, input: Input): CommandResult<RewardView> {
  const reward = findReward(ctx, actor, input.rewardId);
  if (!reward) return failure('not_found');
  const name = normalizeRewardName(input.name);
  if (name === null || !isValidRewardCost(input.cost)) return failure('invalid');
  ctx.sql.run('UPDATE rewards SET name = ?, cost = ? WHERE id = ?', name, input.cost, reward.id);
  return { ok: true, value: { id: reward.id, name, cost: input.cost }, changed: CHANGED };
}

export function deleteReward(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  const reward = findReward(ctx, actor, input.rewardId);
  if (!reward) return failure('not_found');
  ctx.sql.run('DELETE FROM rewards WHERE id = ?', reward.id);
  return { ok: true, value: null, changed: CHANGED };
}

/** Debits the cost and records the redemption, with the reward's name and cost now. */
export function redeemReward(ctx: Context, actor: Member, input: Input): CommandResult<{ redemption: RedemptionView; gold: number }> {
  const reward = findReward(ctx, actor, input.rewardId);
  if (!reward) return failure('not_found');
  if (getProgress(ctx, actor).gold < reward.cost) return failure('conflict');
  addProgress(ctx, actor.id, 0, -reward.cost);
  const redemption: RedemptionView = { id: ctx.ids.next(), rewardId: reward.id, name: reward.name, cost: reward.cost, day: today(ctx, actor.id) };
  ctx.sql.run(
    'INSERT INTO redemptions (id, member_id, reward_id, name, cost, day, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    redemption.id,
    actor.id,
    reward.id,
    reward.name,
    reward.cost,
    redemption.day,
    nowIso(ctx),
  );
  return { ok: true, value: { redemption, gold: getProgress(ctx, actor).gold }, changed: CHANGED_WITH_PROGRESS };
}
