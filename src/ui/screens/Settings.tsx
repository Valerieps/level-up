import { useId, useState } from 'react';
import type { MeView } from '../../application/api-contract';
import { MINUTES_PER_DAY } from '../../domain/day';
import { canManageGroup } from '../../domain/group/roles';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { canVibrate, feedback, setFeedbackSwitches, type FeedbackSwitches } from '../feedback/feedback';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { Switch } from '../components/Switch';
import { Link } from '../router';
import { useQuery } from '../use-query';
import { PauseSheet, pauseWhen } from './pause';

const HOURS = Array.from({ length: MINUTES_PER_DAY / 60 }, (_, hour) => hour);
const p = strings.pause;

// Configurações (docs/spec/telas-e-feedback.md): the day turnover, vibration and sound, Modo Pausa,
// the account and, for admins, the group.
export function Settings({ me, onSignOut }: { me: MeView; onSignOut: () => void }) {
  const { backend } = useServices();
  const settings = useQuery('settings', {}, ['settings']);
  const pauses = useQuery('pauses', {}, ['pauses', 'day']);
  const switches = useQuery('feedback', {}, ['feedback']);
  const [pausing, setPausing] = useState(false);
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

  /** Stores a switch; turning one on gives a light sample of it, so the member feels what they chose. */
  async function setSwitch(change: Partial<FeedbackSwitches>) {
    if (!switches.data) return;
    setBusy(true);
    const result = await backend.command('feedback.set', change);
    setBusy(false);
    setError(!result.ok);
    if (!result.ok) return;
    setFeedbackSwitches(result.value);
    if (change.vibration || change.sound) feedback('light');
    switches.reload();
  }

  async function resume(pauseId: string) {
    setBusy(true);
    const result = await backend.command('pause.end', { pauseId });
    setBusy(false);
    setError(!result.ok);
    pauses.reload();
  }

  const appPause = pauses.data?.app ?? null;

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

      <h2 className="section-title">{strings.settings.feedback}</h2>
      {canVibrate() && (
        <Switch
          label={strings.settings.vibration}
          hint={strings.settings.vibrationHint}
          checked={switches.data?.vibration ?? true}
          disabled={busy || !switches.data}
          onChange={(vibration) => void setSwitch({ vibration })}
        />
      )}
      <Switch
        label={strings.settings.sound}
        hint={strings.settings.soundHint}
        checked={switches.data?.sound ?? false}
        disabled={busy || !switches.data}
        onChange={(sound) => void setSwitch({ sound })}
      />

      <h2 className="section-title">{p.settingsTitle}</h2>
      {pauses.data &&
        (appPause ? (
          <div className="card row tight">
            <span className="grow">
              {p.appPaused}
              <br />
              <span className="muted small">{pauseWhen(appPause)}</span>
            </span>
            <Button variant="secondary" aria-label={p.backLabel} disabled={busy} onClick={() => void resume(appPause.id)}>
              {p.back}
            </Button>
          </div>
        ) : (
          <button type="button" className="card list-link column" onClick={() => setPausing(true)}>
            <span>{p.pauseApp}</span>
            <span className="muted small">{p.pauseAppHint}</span>
          </button>
        ))}
      {pauses.data && pauses.data.habits.length > 0 && (
        <ul className="list">
          {pauses.data.habits.map((pause) => (
            <li key={pause.id} className="card row tight">
              <span className="grow">
                {pause.habitName}
                <br />
                <span className="muted small">{pauseWhen(pause)}</span>
              </span>
              <Button variant="secondary" aria-label={p.backOf(pause.habitName ?? '')} disabled={busy} onClick={() => void resume(pause.id)}>
                {p.back}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <PauseSheet open={pausing} onClose={() => setPausing(false)} onPaused={pauses.reload} />

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
