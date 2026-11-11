import { describe, expect, it } from 'vitest';
import { pixels } from './pixel-art';

describe('pixels', () => {
  it('draws each run of a row as one unit-high rectangle', () => {
    expect(pixels(['.##.', '#..#'])).toBe('M1 0h2v1h-2zM0 1h1v1h-1zM3 1h1v1h-1z');
  });

  it('draws nothing for empty rows', () => {
    expect(pixels(['....', '....'])).toBe('');
  });
});
