import { describe, expect, it } from 'vitest';
import { nearNextLevel, ringFraction, tween } from './motion';

describe('ringFraction', () => {
  it('closes the ring by parts: 3 of 8 is 3/8', () => {
    expect(ringFraction(3, 8)).toBe(3 / 8);
  });
  it('starts empty and stops at a full turn', () => {
    expect(ringFraction(0, 8)).toBe(0);
    expect(ringFraction(9, 8)).toBe(1);
  });
  it('is empty when there is no goal', () => {
    expect(ringFraction(2, 0)).toBe(0);
  });
});

describe('nearNextLevel', () => {
  it('glows only with less than 10% of the level left', () => {
    expect(nearNextLevel(91, 100)).toBe(true);
    expect(nearNextLevel(90, 100)).toBe(false);
    expect(nearNextLevel(10, 100)).toBe(false);
  });
  it('does not glow without a level to reach', () => {
    expect(nearNextLevel(0, 0)).toBe(false);
    expect(nearNextLevel(100, 100)).toBe(false);
  });
});

describe('tween', () => {
  it('walks from one number to the other', () => {
    expect(tween(10, 20, 0)).toBe(10);
    expect(tween(10, 20, 0.5)).toBe(15);
    expect(tween(10, 20, 2)).toBe(20);
  });
});
