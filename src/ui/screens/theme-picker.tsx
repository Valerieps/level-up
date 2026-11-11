import { useEffect, useState } from 'react';
import { DEFAULT_THEME, isThemeId } from '../../domain/themes';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { ChoiceGroup } from '../components/Choices';
import { Notice } from '../components/Notice';
import { THEME_LIST, useThemeControl } from '../theme/themes';
import type { ThemeVisuals } from '../theme/types';
import { useQuery } from '../use-query';

const p = strings.profile;

/**
 * A few colors of a theme, painted by its own tokens: `data-theme` scopes the theme's block of
 * tokens.css to this element, whatever theme the page shows.
 */
function ThemeSwatch({ id }: { id: string }) {
  return (
    <span className="theme-swatch" data-theme={id} aria-hidden="true">
      <span className="theme-swatch-color top" />
      <span className="theme-swatch-color brand" />
      <span className="theme-swatch-color gold" />
    </span>
  );
}

/** The Tema choices, or nothing while the app ships a single theme. */
export function ThemePicker({
  themes,
  current,
  onChoose,
  error = false,
}: {
  themes: readonly Pick<ThemeVisuals, 'id' | 'name'>[];
  current: string;
  onChoose: (id: string) => void;
  error?: boolean;
}) {
  if (themes.length < 2) return null;
  return (
    <section className="section-title" aria-labelledby="theme-title">
      <h2 id="theme-title">{p.theme}</h2>
      <p className="muted small">{p.themeHint}</p>
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      <ChoiceGroup
        legend={p.theme}
        name="theme"
        value={current}
        columns
        choices={themes.map((theme) => ({ value: theme.id, label: theme.name, aside: <ThemeSwatch id={theme.id} /> }))}
        onChange={onChoose}
      />
    </section>
  );
}

/** The Perfil's Tema section: shows the choice at once and stores it; a failure puts the old one back. */
export function ThemeSection() {
  const { backend } = useServices();
  const { theme, show } = useThemeControl();
  const [error, setError] = useState(false);

  async function choose(id: string) {
    if (!isThemeId(id) || id === theme) return;
    const previous = theme;
    show(id);
    setError(false);
    const result = await backend.command('theme.set', { theme: id });
    if (!result.ok) {
      show(previous);
      setError(true);
    }
  }

  return <ThemePicker themes={THEME_LIST} current={theme} onChoose={(id) => void choose(id)} error={error} />;
}

/**
 * Keeps the screen in the member's stored theme: on load, and when another of their apps changes
 * it. The device's last theme shows until then.
 */
export function useThemeSync(): void {
  const { show } = useThemeControl();
  const stored = useQuery('theme', {}, ['theme']);
  const theme = stored.data?.theme;
  useEffect(() => {
    if (theme) show(theme);
  }, [theme, show]);
}

/** After sign-out the next person on this device starts in the default theme. */
export function useResetTheme(): () => void {
  const { show } = useThemeControl();
  return () => show(DEFAULT_THEME);
}
