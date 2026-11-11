import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, THEME_IDS } from '../../domain/themes';
import { strings } from '../../domain/strings';
import { CoinIcon, Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { ThemePicker } from '../screens/theme-picker';
import { AMEIXA } from './ameixa';
import { OCARINA } from './ocarina';
import { applyTheme, rememberedTheme, rememberTheme, THEME_KEY, type ThemeDocument } from './apply-theme';
import { DEFAULT_VISUALS, THEME_LIST, THEMES, ThemeVisualsContext } from './themes';
import { THEMED_ICONS, type ThemeVisuals } from './types';

/**
 * A second theme that exists only in this test (ADR-012): pixel icons, a check and a coin of its
 * own, and its own logo. It proves icons, the coin and the logo switch with the theme, and that
 * what it does not redraw falls back to the default.
 */
const FIXTURE: ThemeVisuals = {
  id: 'fixture',
  name: 'Fixture',
  iconStyle: { viewBox: '0 0 16 16', fill: 'currentColor', shapeRendering: 'crispEdges' },
  icons: {
    check: { d: 'M1 8h2v2H1z' },
    coin: { d: 'M4 4h8v8H4z' },
  },
  Logo: () => <svg className="logo" data-logo="fixture" />,
  favicon: '/themes/fixture/favicon.svg',
};

const inTheme = (theme: ThemeVisuals, node: React.ReactNode) =>
  renderToStaticMarkup(<ThemeVisualsContext.Provider value={theme}>{node}</ThemeVisualsContext.Provider>);

describe('the theme registry', () => {
  it('has visuals for every theme id, keyed by their own id, the default first', () => {
    expect(THEME_LIST.map((theme) => theme.id)).toEqual([...THEME_IDS]);
    for (const [id, theme] of Object.entries(THEMES)) expect(theme.id).toBe(id);
    expect(DEFAULT_VISUALS.id).toBe(DEFAULT_THEME);
  });

  it('names each theme from strings.ts', () => {
    for (const theme of THEME_LIST) expect(theme.name).toBe(strings.themes[theme.id as keyof typeof strings.themes]);
  });

  it('gives the default theme a drawing of every themed icon, so others can fall back to it', () => {
    for (const name of THEMED_ICONS) expect(AMEIXA.icons[name].d).not.toBe('');
  });
});

describe('icons', () => {
  it('draw Ameixa by default: outline, stroke 2, round ends, and the 8-bit coin', () => {
    const check = renderToStaticMarkup(<Icon name="check" />);
    expect(check).toContain('viewBox="0 0 24 24"');
    expect(check).toContain('stroke-width="2"');
    expect(check).toContain('stroke-linecap="round"');
    expect(check).toContain(`d="${AMEIXA.icons.check.d}"`);
    const coin = renderToStaticMarkup(<CoinIcon />);
    expect(coin).toContain('viewBox="0 0 8 8"');
    expect(coin).toContain('shape-rendering="crispEdges"');
    expect(coin).not.toContain('stroke');
  });

  it("switch the themed ones to the theme's drawing and style", () => {
    const check = inTheme(FIXTURE, <Icon name="check" />);
    expect(check).toContain('d="M1 8h2v2H1z"');
    expect(check).toContain('viewBox="0 0 16 16"');
    expect(check).toContain('fill="currentColor"');
    expect(check).not.toContain('stroke');
    expect(inTheme(FIXTURE, <CoinIcon />)).toContain('d="M4 4h8v8H4z"');
  });

  it("fall back to the default's drawing and style for themed icons the theme does not redraw", () => {
    const star = inTheme(FIXTURE, <Icon name="star" />);
    expect(star).toBe(renderToStaticMarkup(<Icon name="star" />));
  });

  it('keep functional icons the same in every theme', () => {
    for (const name of ['back', 'chevron', 'settings', 'edit'] as const) {
      expect(inTheme(FIXTURE, <Icon name={name} />)).toBe(renderToStaticMarkup(<Icon name={name} />));
    }
  });
});

describe('the logo', () => {
  it("is the active theme's", () => {
    expect(renderToStaticMarkup(<Logo />)).toContain('logo-plate');
    expect(inTheme(FIXTURE, <Logo />)).toContain('data-logo="fixture"');
  });
});

describe('the Ocarina theme', () => {
  it('redraws every themed icon in angular outlines', () => {
    for (const name of THEMED_ICONS) expect(OCARINA.icons[name]?.d, name).toBeTruthy();
    expect(inTheme(OCARINA, <Icon name="check" />)).toContain('stroke-linejoin="miter"');
  });

  it("paints its Rupee in the currency color, while Ameixa's coin follows the text", () => {
    expect(inTheme(OCARINA, <CoinIcon />)).toContain('class="icon icon-currency"');
    expect(renderToStaticMarkup(<CoinIcon />)).toContain('class="icon"');
  });

  it('draws its own logo and favicon', () => {
    expect(inTheme(OCARINA, <Logo />)).not.toBe(renderToStaticMarkup(<Logo />));
    expect(OCARINA.favicon).toBe('/themes/ocarina/favicon.svg');
  });

  it('shows the Tema picker, now that the app ships two themes', () => {
    expect(renderToStaticMarkup(<ThemePicker themes={THEME_LIST} current="ocarina" onChoose={() => {}} />)).toContain('>Ocarina<');
  });
});

describe('the Tema picker', () => {
  const noop = () => {};

  it('stays hidden while the app ships one theme', () => {
    expect(renderToStaticMarkup(<ThemePicker themes={THEME_LIST.slice(0, 1)} current={DEFAULT_THEME} onChoose={noop} />)).toBe('');
  });

  it('lists every theme by name, the current one checked', () => {
    const html = renderToStaticMarkup(<ThemePicker themes={[AMEIXA, FIXTURE]} current="fixture" onChoose={noop} />);
    expect(html).toContain(strings.profile.theme);
    expect(html).toContain('>Ameixa<');
    expect(html).toContain('>Fixture<');
    expect(html).toContain('checked="" value="fixture"');
    expect(html).not.toContain('checked="" value="ameixa"');
  });

  it('shows an error when storing the choice failed', () => {
    const html = renderToStaticMarkup(<ThemePicker themes={[AMEIXA, FIXTURE]} current="ameixa" onChoose={noop} error />);
    expect(html).toContain(strings.genericError);
  });
});

/** A <html> with a favicon <link> and a theme-color <meta>, enough for applyTheme. */
function fakeDocument() {
  const attributes = new Map<string, Map<string, string>>([
    ['link[rel="icon"]', new Map([['href', '/icon.svg']])],
    ['meta[name="theme-color"]', new Map([['content', '#c84a1c']])],
  ]);
  const element = (selector: string) => ({
    setAttribute: (name: string, value: string) => attributes.get(selector)!.set(name, value),
    // A replaced <meta> is a fresh clone that takes over the old one's attributes.
    cloneNode: () => ({ setAttribute: (name: string, value: string) => attributes.get(selector)!.set(name, value) }),
    replaceWith: () => {},
  });
  const documentElement = { dataset: {} as DOMStringMap };
  const doc = {
    documentElement,
    querySelector: (selector: string) => (attributes.has(selector) ? element(selector) : null),
  } as unknown as ThemeDocument;
  return { doc, documentElement, attr: (selector: string, name: string) => attributes.get(selector)!.get(name) };
}

describe('applying a theme to the page', () => {
  it("sets data-theme, the favicon and the browser bar from the theme's token", () => {
    const { doc, documentElement, attr } = fakeDocument();
    const tokens: Record<string, string> = { '--color-browser-bar': ' #1d4ed8' };
    applyTheme('ameixa', FIXTURE.favicon, doc, (name) => tokens[name] ?? '');
    expect(documentElement.dataset.theme).toBe('ameixa');
    expect(attr('link[rel="icon"]', 'href')).toBe('/themes/fixture/favicon.svg');
    expect(attr('meta[name="theme-color"]', 'content')).toBe('#1d4ed8');
  });

  it('keeps the browser bar when the token is missing', () => {
    const { doc, attr } = fakeDocument();
    applyTheme('ameixa', '/icon.svg', doc, () => '');
    expect(attr('meta[name="theme-color"]', 'content')).toBe('#c84a1c');
  });
});

describe("the device's last theme", () => {
  const store = () => {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), values };
  };

  it('is remembered and read back', () => {
    const s = store();
    rememberTheme('ameixa', s);
    expect(s.values.get(THEME_KEY)).toBe('ameixa');
    expect(rememberedTheme(s)).toBe('ameixa');
  });

  it('falls back to the default when absent, unknown, or storage is off or throws', () => {
    const s = store();
    expect(rememberedTheme(s)).toBe(DEFAULT_THEME);
    s.setItem(THEME_KEY, 'retired');
    expect(rememberedTheme(s)).toBe(DEFAULT_THEME);
    expect(rememberedTheme(null)).toBe(DEFAULT_THEME);
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(rememberedTheme(broken)).toBe(DEFAULT_THEME);
    expect(() => rememberTheme('ameixa', broken)).not.toThrow();
  });
});
