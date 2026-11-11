// Loja (docs/spec/loja.md): rewards the member defines and buys with gold.

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
