import { useEffect, useState } from 'react';
import { isThemeId } from '../../domain/themes';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { THEME_LIST, useThemeControl } from '../theme/themes';
import type { ThemeVisuals } from '../theme/types';
import { useQuery } from '../use-query';

const p = strings.profile;

/** The Tema choices, by name only, or nothing while the app ships a single theme. */
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
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      <div className="theme-options" role="radiogroup" aria-labelledby="theme-title">
        {themes.map((theme) => (
          <label key={theme.id} className="theme-option">
            <input className="visually-hidden" type="radio" name="theme" value={theme.id} checked={current === theme.id} onChange={() => onChoose(theme.id)} />
            <span className="theme-option-name">{theme.name}</span>
            {current === theme.id && <Icon name="check" />}
          </label>
        ))}
      </div>
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
 * it. The device's last theme shows until then, and stays after sign-out for the sign-in screen
 * (docs/spec/temas.md).
 */
export function useThemeSync(): void {
  const { show } = useThemeControl();
  const stored = useQuery('theme', {}, ['theme']);
  const theme = stored.data?.theme;
  useEffect(() => {
    if (theme) show(theme);
  }, [theme, show]);
}

