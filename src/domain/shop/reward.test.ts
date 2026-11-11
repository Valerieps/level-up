import { describe, expect, it } from 'vitest';
import { goldMissing, isValidRewardCost, normalizeRewardName } from './reward';

describe('rewards (spec/loja.md)', () => {
  it('cleans the name and limits it to 80 characters', () => {
    expect(normalizeRewardName('  1  episódio ')).toBe('1 episódio');
    expect(normalizeRewardName('   ')).toBeNull();
    expect(normalizeRewardName('x'.repeat(81))).toBeNull();
    expect(normalizeRewardName(42)).toBeNull();
  });

  it('takes whole costs from 1 to 99.999', () => {
    expect([1, 40, 99_999].every(isValidRewardCost)).toBe(true);
    expect([0, -5, 1.5, 100_000, '40'].some(isValidRewardCost)).toBe(false);
  });

  it('says how much gold is missing, never below 0', () => {
    expect(goldMissing(28, 40)).toBe(12);
    expect(goldMissing(50, 40)).toBe(0);
  });
});
