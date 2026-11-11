// The member's visual theme (ADR-012). A per-member preference, private like their habits
// (ADR-008): no input names a member, and the change reaches only the member's own apps.
import type { ThemeView } from '../../src/application/api-contract';
import { DEFAULT_THEME, isThemeId } from '../../src/domain/themes';
import { failure, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { ensureSettings } from './settings';

export function getTheme(ctx: Context, actor: Member): ThemeView {
  ensureSettings(ctx, actor.id);
  const [row] = ctx.sql.all<{ theme: string }>('SELECT theme FROM member_settings WHERE member_id = ?', actor.id);
  // A theme the app no longer ships falls back to the default.
  return { theme: isThemeId(row.theme) ? row.theme : DEFAULT_THEME };
}

/** Only an id the app ships (src/domain/themes.ts); anything else is `invalid`. */
export function setTheme(ctx: Context, actor: Member, input: { theme?: unknown }): CommandResult<ThemeView> {
  if (!isThemeId(input.theme)) return failure('invalid');
  ensureSettings(ctx, actor.id);
  ctx.sql.run('UPDATE member_settings SET theme = ? WHERE member_id = ?', input.theme, actor.id);
  return { ok: true, value: { theme: input.theme }, changed: ['theme'] };
}
