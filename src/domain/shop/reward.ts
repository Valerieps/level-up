// Loja (docs/spec/loja.md): rewards the member defines and buys with gold.
import { goldFor, xpFor } from '../habits/progression';

export const REWARD_NAME_MAX_LENGTH = 80;
export const MAX_REWARD_COST = 99_999;

/** How many redemptions the Loja shows before "Ver tudo". */
export const RECENT_REDEMPTIONS = 5;

/** The name as stored: trimmed, inner spaces collapsed; null when empty or too long. */
export function normalizeRewardName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const clean = name.trim().replace(/\s+/g, ' ');
  return clean.length > 0 && clean.length <= REWARD_NAME_MAX_LENGTH ? clean : null;
}

/** A cost in whole gold, from 1 to MAX_REWARD_COST. */
export function isValidRewardCost(cost: unknown): cost is number {
  return Number.isInteger(cost) && (cost as number) >= 1 && (cost as number) <= MAX_REWARD_COST;
}

/** Gold still missing to redeem ("faltam 12"); 0 when the balance covers the cost. */
export function goldMissing(balance: number, cost: number): number {
  return Math.max(0, cost - balance);
}

/** The pace reference the Loja shows: about 25 gold a day from 5 easy habits (spec/loja.md). */
export const DAILY_GOLD_REFERENCE = 5 * goldFor(xpFor('easy'));

/** Days of that pace a cost takes, at least 1: "100 de ouro ≈ 4 dias". */
export function daysOfGold(cost: number): number {
  return Math.max(1, Math.round(cost / DAILY_GOLD_REFERENCE));
}
