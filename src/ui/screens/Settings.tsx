import { useId, useState } from 'react';
import type { MeView } from '../../application/api-contract';
import { MINUTES_PER_DAY } from '../../domain/day';
import { canManageGroup } from '../../domain/group/roles';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { Link } from '../router';
import { useQuery } from '../use-query';

const HOURS = Array.from({ length: MINUTES_PER_DAY / 60 }, (_, hour) => hour);

// Configurações (docs/spec/telas-e-feedback.md): the day turnover, the account and, for admins,
// the group. Modo Pausa joins in phase 1b.
export function Settings({ me, onSignOut }: { me: MeView; onSignOut: () => void }) {
  const { backend } = useServices();
  const settings = useQuery('settings', {}, ['settings']);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const turnoverId = useId();
  const hintId = useId();

  async function setTurnover(minutes: number) {
    setBusy(true);
    const result = await backend.command('settings.update', { dayTurnover: minutes });
    setBusy(false);
    setError(!result.ok);
    if (result.ok) settings.reload();
  }

  return (
    <section>
      <ScreenHeader title={strings.settings.title} back="/perfil" />
      {error && <Notice tone="error">{strings.genericError}</Notice>}

      <h2>{strings.settings.day}</h2>
      <div className="field">
        <label className="field-label" htmlFor={turnoverId}>
          {strings.settings.dayTurnoverLabel}
        </label>
        <select
          id={turnoverId}
          aria-describedby={hintId}
          disabled={busy || !settings.data}
          value={settings.data?.dayTurnover ?? 0}
          onChange={(e) => void setTurnover(Number(e.target.value))}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour * 60}>
              {strings.settings.hour(hour)}
            </option>
          ))}
        </select>
        <span id={hintId} className="muted small">
          {strings.settings.dayTurnoverHint}
        </span>
      </div>

      <h2 className="section-title">{strings.settings.account}</h2>
      <div className="row">
        <span className="grow muted">{me.email}</span>
        <Button variant="secondary" onClick={onSignOut}>
          {strings.settings.signOut}
        </Button>
      </div>

      {canManageGroup(me) && (
        <>
          <h2 className="section-title">{strings.settings.group}</h2>
          <ul className="list">
            <li>
              <Link to="/perfil/configuracoes/membros" className="card list-link">
                {strings.members.title}
              </Link>
            </li>
            <li>
              <Link to="/perfil/configuracoes/convites" className="card list-link">
                {strings.invites.title}
              </Link>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
