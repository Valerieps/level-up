import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, THEME_IDS } from '../../domain/themes';

/**
 * The visual rules of docs/UI.md that a machine can check. Every color, size, weight, line height
 * and duration lives in tokens.css; a literal anywhere else is how screens drift apart, so the
 * build refuses it. The type scale keeps its rhythm, every theme defines the same tokens and every
 * text color pair passes WCAG AA, in every theme (ADR-012).
 *
 * A failure here lists "file:line: text". Fix it with a token (add one to tokens.css if none
 * fits), never by loosening the test.
 */

const SRC = join(__dirname, '..', '..');
const TOKENS = join(__dirname, 'tokens.css');

function files(dir: string, pattern: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, pattern);
    return pattern.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const read = (path: string) => readFileSync(path, 'utf8');
// Comments keep their line breaks, so line numbers stay right.
const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''));

const stylesheets = files(SRC, /\.css$/).filter((path) => path !== TOKENS);
const components = files(join(SRC, 'ui'), /\.tsx?$/);

/** The lines that break a rule, as "file:line: text". Media queries may hold breakpoints. */
function offending(paths: string[], breaks: (line: string) => boolean): string[] {
  return paths.flatMap((path) =>
    withoutComments(read(path))
      .split('\n')
      .flatMap((line, index) =>
        breaks(line) && !line.trimStart().startsWith('@media') ? [`${relative(SRC, path)}:${index + 1}: ${line.trim()}`] : [],
      ),
  );
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|:\s*[^;]*\b(white|black)\b/;
const LENGTH = /(?<![\w-])\d*\.?\d+(px|rem|em|pt)\b/;
const DURATION = /(?<![\w-])(\d*\.?\d+)(ms|s)\b/g;

/** One rule of tokens.css: its selector, its raw body and its "--name: value;" pairs. */
interface TokenRule {
  readonly selector: string;
  readonly body: string;
  readonly tokens: Map<string, string>;
}

function rules(css: string): TokenRule[] {
  return [...withoutComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim().replace(/\s+/g, ' '),
    body: m[2],
    tokens: new Map([...m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()])),
  }));
}

const THEME_SELECTOR = /\[data-theme='([\w-]+)'\]/;

/** The `:root` block: what no theme may change. */
function fixedOf(css: string): Map<string, string> {
  return rules(css).find((rule) => rule.selector === ':root')?.tokens ?? new Map();
}

/** The theme blocks, in source order, by id. */
function themesOf(css: string): Map<string, TokenRule> {
  return new Map(
    rules(css).flatMap((rule) => {
      const id = THEME_SELECTOR.exec(rule.selector)?.[1];
      return id ? [[id, rule] as const] : [];
    }),
  );
}

/** What a page in `theme` gets: the default's tokens, overridden by the theme's (the cascade). */
function resolve(css: string, theme: string): Map<string, string> {
  const themes = themesOf(css);
  return new Map([...fixedOf(css), ...themes.get(DEFAULT_THEME)!.tokens, ...(themes.get(theme)?.tokens ?? [])]);
}

/** Fixed tokens: the type scale, the spacing grid, the sizes and the focus ring. */
const FIXED = /^--(font-size|space|size|focus-ring)-/;

/** Everything wrong with how tokens.css lays out its themes (ADR-012), as readable lines. */
function themeProblems(css: string): string[] {
  const problems: string[] = [];
  const themes = [...themesOf(css)];
  for (const name of fixedOf(css).keys()) if (!FIXED.test(name)) problems.push(`:root holds ${name}, which belongs in a theme block`);
  const [first] = themes;
  if (!first || first[0] !== DEFAULT_THEME || first[1].selector !== `:root, [data-theme='${DEFAULT_THEME}']`) {
    problems.push(`the first theme block must be ":root, [data-theme='${DEFAULT_THEME}']"`);
  }
  const expected = first ? [...first[1].tokens.keys()] : [];
  for (const [id, rule] of themes) {
    if (id !== DEFAULT_THEME && rule.selector.includes(':root')) problems.push(`${id}: only the default theme answers :root`);
    if (!/(^|;)\s*color-scheme\s*:\s*(light|dark)\s*;/.test(rule.body)) problems.push(`${id}: sets no color-scheme`);
    for (const name of rule.tokens.keys()) {
      if (FIXED.test(name)) problems.push(`${id}: redefines ${name}, which is fixed in every theme`);
      else if (!expected.includes(name)) problems.push(`${id}: defines ${name}, which the default theme lacks`);
    }
    for (const name of expected) if (!rule.tokens.has(name)) problems.push(`${id}: misses ${name}`);
  }
  return problems;
}

const tokensCss = read(TOKENS);
const fixed = fixedOf(tokensCss);
const themes = themesOf(tokensCss);

describe('no literals outside tokens.css', () => {
  it('keeps colors out of the stylesheets and components', () => {
    expect(offending([...stylesheets, ...components], (line) => COLOR.test(line))).toEqual([]);
  });

  it('keeps lengths out of the stylesheets and components', () => {
    expect(offending([...stylesheets, ...components], (line) => LENGTH.test(line))).toEqual([]);
  });

  it('keeps numbers out of inline styles, except percentages', () => {
    const numeric = /:\s*['"`]?-?\d*\.?[1-9]/;
    const percentage = /\d%['"`]?$/;
    const found = components.flatMap((path) =>
      [...read(path).matchAll(/style=\{\{([\s\S]*?)\}\}/g)]
        .filter((m) => m[1].split(',').some((entry) => numeric.test(entry) && !percentage.test(entry.trim())))
        .map((m) => `${relative(SRC, path)}: style={{${m[1].trim()}}}`),
    );
    expect(found).toEqual([]);
  });

  it('keeps durations out of the stylesheets, except 0s', () => {
    const breaks = (line: string) => [...line.matchAll(DURATION)].some((m) => Number(m[1]) !== 0);
    expect(offending(stylesheets, breaks)).toEqual([]);
  });

  it('takes font sizes, weights and line heights only from the scale', () => {
    const rule = /\b(font-size|font-weight|line-height)\s*:(?!\s*var\(--(font-size|font-weight|line-height)-)(?!\s*inherit)/;
    const shorthand = /\bfont\s*:(?!\s*inherit)/;
    expect(offending(stylesheets, (line) => rule.test(line) || shorthand.test(line))).toEqual([]);
  });

  it('uses only tokens that exist', () => {
    const sources = [...stylesheets, ...components, TOKENS].map(read).join('\n');
    // Custom properties a stylesheet or component sets for itself also count as defined.
    const defined = new Set([...sources.matchAll(/['"]?(--[\w-]+)['"]?\s*:/g)].map((m) => m[1]));
    const used = offending([...stylesheets, ...components], (line) =>
      [...line.matchAll(/var\(\s*(--[\w-]+)/g)].some((m) => !defined.has(m[1])),
    );
    expect(used).toEqual([]);
  });
});

function px(value: string): number {
  const match = /^(\d*\.?\d+)(px|rem)$/.exec(value);
  if (!match) throw new Error(`Expected px or rem, got ${value}`);
  return Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
}

describe('the scales in tokens.css', () => {
  const fontSizes = [...fixed].filter(([name]) => name.startsWith('--font-size-')).map(([name, value]) => [name, px(value)] as const);

  // Display sizes (a hero number, a splash title) may leap: they stand alone, not in running text.
  it('lists the font sizes from small to large, each 1.125 to 1.5 times the one before (display sizes may leap more)', () => {
    expect(fontSizes.length).toBeGreaterThanOrEqual(4);
    const jumps = fontSizes.slice(1).map(([name, size], i) => [name, Number((size / fontSizes[i][1]).toFixed(3))] as const);
    for (const [name, ratio] of jumps) {
      expect(ratio, `${name} is ${ratio}x the size before it`).toBeGreaterThanOrEqual(1.125);
      if (!name.startsWith('--font-size-display')) expect(ratio, `${name} is ${ratio}x the size before it`).toBeLessThanOrEqual(1.5);
    }
  });

  it('never goes below 12px, and the body text is at least 16px', () => {
    for (const [name, size] of fontSizes) expect(size, name).toBeGreaterThanOrEqual(12);
    expect(px(fixed.get('--font-size-body')!)).toBeGreaterThanOrEqual(16);
  });

  it('keeps spacing on the 4px grid', () => {
    for (const [name, value] of fixed) {
      if (name.startsWith('--space-')) expect(px(value) % 4, `${name}: ${value}`).toBe(0);
    }
  });

  it('keeps touch targets at least 44px', () => {
    expect(px(fixed.get('--size-touch')!)).toBeGreaterThanOrEqual(44);
  });
});

function luminance(hex: string): number {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Every pair of colors the UI puts one on top of the other. A new color token that carries text
 * or marks a control goes here too. Text needs 4.5:1 (WCAG 1.4.3); edges of controls, focus rings
 * and icons need 3:1 (WCAG 1.4.11).
 */
const TEXT_PAIRS = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-brand', '--color-bg'],
  ['--color-brand', '--color-surface'],
  ['--color-on-brand', '--color-brand'],
  ['--color-danger', '--color-bg'],
  ['--color-danger', '--color-surface'],
  ['--color-on-danger', '--color-danger'],
  ['--color-success', '--color-bg'],
  ['--color-success', '--color-surface'],
  ['--color-text', '--color-surface-raised'],
  ['--color-text-muted', '--color-surface-raised'],
  ['--color-brand-ink', '--color-bg'],
  ['--color-brand-ink', '--color-surface'],
  ['--color-brand-ink', '--color-brand-soft'],
  ['--color-on-top', '--color-top'],
  ['--color-top-muted', '--color-top'],
  ['--color-gold', '--color-top'],
  ['--color-gold', '--color-coin'],
  ['--color-on-level', '--color-level'],
  ['--color-gold-ink', '--color-gold-soft'],
  ['--color-faz', '--color-faz-soft'],
  ['--color-danger', '--color-danger-soft'],
  ['--color-success', '--color-success-soft'],
  ['--color-warning', '--color-warning-soft'],
  ['--color-neutral', '--color-neutral-soft'],
  ['--color-on-toast', '--color-toast'],
  ['--color-text', '--color-brand-soft'],
  ['--color-text-muted', '--color-brand-soft'],
  // 1c: the celebration on plum, the raise invitation, the prize in the conquista tracks.
  ['--color-on-top', '--color-coin'],
  ['--color-top', '--color-gold'],
  ['--color-level', '--color-top'],
  ['--color-top-muted', '--color-coin'],
  ['--color-text', '--color-gold-soft'],
  ['--color-gold-ink', '--color-surface'],
  ['--color-gold-ink', '--color-bg'],
] as const;

const NON_TEXT_PAIRS = [
  ['--color-border-strong', '--color-bg'],
  ['--color-border-strong', '--color-surface'],
  ['--color-focus', '--color-bg'],
  ['--color-focus', '--color-surface'],
  ['--color-brand', '--color-surface'],
  ['--color-star', '--color-surface'],
  ['--color-star', '--color-bg'],
  // The coin icon with a color of its own: in the gold pill and on cards (the Loja).
  ['--color-currency', '--color-coin'],
  ['--color-currency', '--color-surface'],
] as const;

const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

/** The pairs of a theme below WCAG AA, as "fg on bg: ratio". Throws on a color it cannot read. */
function contrastFailures(theme: Map<string, string>): string[] {
  const color = (name: string) => {
    const value = theme.get(name);
    if (!value || !HEX.test(value)) throw new Error(`${name} must be a hex color, got ${value}`);
    return value;
  };
  const below = (pairs: readonly (readonly [string, string])[], min: number) =>
    pairs.flatMap(([fg, bg]) => {
      const ratio = contrast(color(fg), color(bg));
      return ratio < min ? [`${fg} on ${bg}: ${ratio.toFixed(2)}`] : [];
    });
  return [...below(TEXT_PAIRS, 4.5), ...below(NON_TEXT_PAIRS, 3)];
}

describe('the themes in tokens.css (ADR-012)', () => {
  it('are exactly the themes of src/domain/themes.ts, the default first', () => {
    expect([...themes.keys()]).toEqual([...THEME_IDS]);
  });

  it('keep the fixed tokens in :root, the default theme first and answering :root, and the same tokens in every theme', () => {
    expect(themeProblems(tokensCss)).toEqual([]);
  });
});

describe.each([...themes.keys()])('the %s theme', (id) => {
  const theme = resolve(tokensCss, id);
  const color = (name: string) => {
    const value = theme.get(name);
    if (!value || !HEX.test(value)) throw new Error(`${name} must be a hex color, got ${value}`);
    return value;
  };

  it.each(TEXT_PAIRS)('%s on %s is readable as text (4.5:1)', (fg, bg) => {
    expect(contrast(color(fg), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)('%s on %s is visible (3:1)', (fg, bg) => {
    expect(contrast(color(fg), color(bg))).toBeGreaterThanOrEqual(3);
  });
});

/**
 * A second theme that exists only here proves the checks above see a new theme, and that a theme
 * switches what the page gets, apart from the real themes.
 */
describe('a fixture theme', () => {
  const ameixa = themes.get(DEFAULT_THEME)!.tokens;
  const block = (tokens: Map<string, string>, extra = '') =>
    `\n[data-theme='fixture'] {\n  color-scheme: light;\n${[...tokens].map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n${extra}}\n`;
  const fixtureTokens = new Map([
    ...ameixa,
    ['--color-brand', '#1d4ed8'],
    ['--color-brand-ink', '#1e40af'],
    ['--color-focus', '#1d4ed8'],
    ['--font-display', "'Fixture Display', system-ui, sans-serif"],
    ['--radius-marker', '4px'],
  ]);
  const css = tokensCss + block(fixtureTokens);

  it('passes every layout check when it defines the same tokens', () => {
    expect(themeProblems(css)).toEqual([]);
    expect([...themesOf(css).keys()]).toEqual([...THEME_IDS, 'fixture']);
  });

  it('switches colors, fonts and shapes, and leaves the fixed tokens alone', () => {
    const before = resolve(css, DEFAULT_THEME);
    const after = resolve(css, 'fixture');
    for (const name of ['--color-brand', '--font-display', '--radius-marker']) expect(after.get(name)).not.toBe(before.get(name));
    for (const name of fixed.keys()) expect(after.get(name)).toBe(before.get(name));
    expect(contrastFailures(after)).toEqual([]);
  });

  it('fails when it misses a token, adds one the default lacks or redefines a fixed one', () => {
    const missing = new Map(fixtureTokens);
    missing.delete('--color-gold');
    expect(themeProblems(tokensCss + block(missing))).toEqual(['fixture: misses --color-gold']);
    expect(themeProblems(tokensCss + block(fixtureTokens, '  --color-extra: #000000;\n'))).toEqual([
      'fixture: defines --color-extra, which the default theme lacks',
    ]);
    expect(themeProblems(tokensCss + block(fixtureTokens, '  --space-1: 5px;\n'))).toEqual([
      'fixture: redefines --space-1, which is fixed in every theme',
    ]);
  });

  it('fails the contrast check when a pair drops below AA', () => {
    const faint = new Map([...fixtureTokens, ['--color-text-muted', '#d0c8d4']]);
    expect(contrastFailures(resolve(tokensCss + block(faint), 'fixture')).some((line) => line.startsWith('--color-text-muted on --color-bg'))).toBe(true);
  });
});
