// The member's order of habits (docs/spec/telas-e-feedback.md "Hoje": "na ordem que eu arrasto").

/**
 * Puts `moved` (some of the ids of `all`, in their new order) into the slots those ids already
 * take in `all`; every other id keeps its place. So reordering the list Hoje shows never moves the
 * habits it hides (free, paused, done, archived). Null when `moved` repeats an id or names one
 * that is not in `all`.
 */
export function reorderWithin(all: readonly string[], moved: readonly string[]): string[] | null {
  const movedSet = new Set(moved);
  if (movedSet.size !== moved.length) return null;
  const allSet = new Set(all);
  if (moved.some((id) => !allSet.has(id))) return null;
  let next = 0;
  return all.map((id) => (movedSet.has(id) ? moved[next++] : id));
}

/** `items` with the one at `from` taken out and put back at `to`. Out-of-range indexes clamp. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const copy = [...items];
  if (from < 0 || from >= copy.length) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(Math.max(0, Math.min(to, copy.length)), 0, item);
  return copy;
}

/**
 * Where an item dragged from `from` lands, given the centers of the items as laid out before the
 * drag (top to bottom) and the dragged item's center now: past every center it has crossed.
 */
export function dropIndex(centers: readonly number[], from: number, draggedCenter: number): number {
  let index = from;
  for (let i = from + 1; i < centers.length && draggedCenter > centers[i]; i++) index = i;
  for (let i = from - 1; i >= 0 && draggedCenter < centers[i]; i--) index = i;
  return index;
}

/**
 * `items` in the order of `ids` (the member's drag, before the server confirms it); items `ids`
 * does not name keep their order, after the named ones.
 */
export function sortByIds<T>(items: readonly T[], idOf: (item: T) => string, ids: readonly string[]): T[] {
  const rank = new Map(ids.map((id, index) => [id, index]));
  const known = items.filter((item) => rank.has(idOf(item))).sort((a, b) => rank.get(idOf(a))! - rank.get(idOf(b))!);
  return [...known, ...items.filter((item) => !rank.has(idOf(item)))];
}
