import { useThemeVisuals } from '../theme/themes';

/** The app's logo in the active theme (ADR-012). The installed app's icon stays the default's. */
export function Logo() {
  const { Logo: ThemeLogo } = useThemeVisuals();
  return <ThemeLogo />;
}
