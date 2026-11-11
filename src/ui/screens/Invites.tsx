import { useId, useState, type FormEvent } from 'react';
import type { ApiError, InviteState } from '../../application/api-contract';
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../../domain/themes';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { THEME_LIST } from '../theme/themes';
import { useQuery } from '../use-query';

const STATE_LABEL: Record<InviteState, string> = {
  pending: strings.invites.pending,
  accepted: strings.invites.accepted,
  revoked: strings.invites.revoked,
};

function errorText(error: ApiError): string {
  if (error === 'invalid') return strings.invites.invalidEmail;
  if (error === 'conflict') return strings.invites.alreadyMember;
  if (error === 'forbidden') return strings.forbidden;
  return strings.genericError;
}

export function Invites() {
  const { backend } = useServices();
  const invites = useQuery('invites', {}, ['invites']);
  const [email, setEmail] = useState('');
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const themeId = useId();
  const themeHintId = useId();
  // Like the Perfil's Tema section, the choice shows only when there is more than one theme.
  const pickTheme = THEME_LIST.length > 1;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await backend.command('invite.create', { email, theme });
    setBusy(false);
    if (result.ok) {
      setEmail('');
      setTheme(DEFAULT_THEME);
      setError(null);
    } else {
      setError(errorText(result.error));
    }
  }

  async function revoke(target: string) {
    const result = await backend.command('invite.revoke', { email: target });
    if (!result.ok) setError(errorText(result.error));
  }

  return (
    <section>
      <ScreenHeader title={strings.invites.title} back="/perfil/configuracoes" />
      <form className="stack" onSubmit={submit}>
        <Field
          label={strings.invites.emailLabel}
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {pickTheme && (
          <div className="field">
            <label className="field-label" htmlFor={themeId}>
              {strings.invites.themeLabel}
            </label>
            <select
              id={themeId}
              aria-describedby={themeHintId}
              value={theme}
              onChange={(e) => {
                if (isThemeId(e.target.value)) setTheme(e.target.value);
              }}
            >
              {THEME_LIST.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <span id={themeHintId} className="muted small">
              {strings.invites.themeHint}
            </span>
          </div>
        )}
        <Button type="submit" disabled={busy}>
          {strings.invites.send}
        </Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {invites.data?.length === 0 && <p className="muted">{strings.invites.empty}</p>}
      <ul className="list">
        {invites.data?.map((invite) => (
          <li key={invite.email} className="card row">
            <span className="grow">
              {invite.email}
              <br />
              <span className="muted small">
                {pickTheme ? `${STATE_LABEL[invite.state]} · ${strings.themes[invite.theme]}` : STATE_LABEL[invite.state]}
              </span>
            </span>
            {invite.state === 'pending' && (
              <Button variant="secondary" onClick={() => void revoke(invite.email)}>
                {strings.invites.revoke}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
