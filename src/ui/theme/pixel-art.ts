/**
 * Pixel art as text: one string per row, '#' for a lit pixel, anything else for an empty one. Turns
 * it into one SVG path of unit squares, merging each row's runs, for an icon drawn with
 * fill="currentColor" and shape-rendering="crispEdges". Draw on a grid that the icon's size divides
 * evenly (10x10 for --size-icon, 8x8 for --size-icon-small) so every pixel lands on whole screen pixels.
 */
export function pixels(rows: readonly string[]): string {
  return rows
    .flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index}y${y}h${run[0].length}v1h-${run[0].length}z`))
    .join('')
    .replace(/y/g, ' ');
}
