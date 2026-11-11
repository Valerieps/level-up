import { describe, expect, it } from 'vitest';
import { dropIndex, moveItem, reorderWithin, sortByIds } from './order';

describe('reorderWithin', () => {
  it('reorders the moved ids in their own slots, leaving the others in place', () => {
    expect(reorderWithin(['a', 'free', 'b', 'c', 'done'], ['c', 'a', 'b'])).toEqual(['c', 'free', 'a', 'b', 'done']);
  });

  it('keeps the order when nothing moved', () => {
    expect(reorderWithin(['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(reorderWithin(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('refuses repeated or unknown ids', () => {
    expect(reorderWithin(['a', 'b'], ['a', 'a'])).toBeNull();
    expect(reorderWithin(['a', 'b'], ['a', 'x'])).toBeNull();
  });
});

describe('moveItem', () => {
  it('moves an item down and up', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('clamps the target and ignores a missing source', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });
});

describe('dropIndex', () => {
  const centers = [10, 30, 50, 70];

  it('stays put until the dragged center crosses a neighbor’s center', () => {
    expect(dropIndex(centers, 1, 30)).toBe(1);
    expect(dropIndex(centers, 1, 49)).toBe(1);
    expect(dropIndex(centers, 1, 11)).toBe(1);
  });

  it('passes every center crossed, in either direction', () => {
    expect(dropIndex(centers, 1, 51)).toBe(2);
    expect(dropIndex(centers, 0, 100)).toBe(3);
    expect(dropIndex(centers, 3, 9)).toBe(0);
    expect(dropIndex(centers, 2, 29)).toBe(1);
  });
});

describe('sortByIds', () => {
  it('follows the ids, with the unnamed items after, in their order', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'new' }, { id: 'c' }];
    expect(sortByIds(items, (i) => i.id, ['c', 'a', 'b', 'gone']).map((i) => i.id)).toEqual(['c', 'a', 'b', 'new']);
  });
});
