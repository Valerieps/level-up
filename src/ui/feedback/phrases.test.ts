import { describe, expect, it } from 'vitest';
import { drawIndex, drawPhrase } from './phrases';

describe('varied phrases', () => {
  it('never repeats the last index when there is a choice', () => {
    for (let last = 0; last < 3; last++) {
      for (const r of [0, 0.34, 0.5, 0.67, 0.99]) {
        const index = drawIndex(3, last, () => r);
        expect(index).not.toBe(last);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(3);
      }
    }
  });

  it('draws any index the first time, and the only one of a single phrase', () => {
    expect(drawIndex(3, null, () => 0.99)).toBe(2);
    expect(drawIndex(1, 0, () => 0.5)).toBe(0);
  });

  it('remembers the last phrase of each list', () => {
    const options = ['a', 'b'];
    const first = drawPhrase('test-list', options, () => 0);
    expect(drawPhrase('test-list', options, () => 0)).not.toBe(first);
  });
});
