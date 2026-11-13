// Varied phrases for the short moments and the dia fechado (docs/spec/telas-e-feedback.md "Momentos
// novos"): each list is drawn from at random, never repeating the last phrase shown from it.

/** An index in [0, count), different from `last` whenever there is a choice. */
export function drawIndex(count: number, last: number | null, random: () => number = Math.random): number {
  if (count <= 1) return 0;
  if (last === null || last < 0 || last >= count) return Math.floor(random() * count);
  // Draw among the others and step over the last one.
  const index = Math.floor(random() * (count - 1));
  return index >= last ? index + 1 : index;
}

const lastShown = new Map<string, number>();

/** One phrase of `options`, never the one this list showed last. */
export function drawPhrase<T>(list: string, options: readonly T[], random: () => number = Math.random): T {
  const index = drawIndex(options.length, lastShown.get(list) ?? null, random);
  lastShown.set(list, index);
  return options[index];
}
