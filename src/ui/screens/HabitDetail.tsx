import { useState } from 'react';
import type { HabitView } from '../../application/api-contract';
import { RHYTHM_DAYS } from '../../domain/habits/consistency';
import { describeHabit, formatDayShort } from '../../domain/habits/describe';
import { xpFor } from '../../domain/habits/progression';
import type { ReguaDirection } from '../../domain/habits/regua';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { Link, navigate } from '../router';
import { useQuery } from '../use-query';
import { DeleteHabitDialog, ReguaSheet } from './habit-sheets';
import { PauseSheet, pauseWhen } from './pause';

const t = strings.habit;
const r = strings.regua;
const p = strings.pause;

// Detalhe do hábito (docs/spec/telas-e-feedback.md "Detalhe"): header with the consistency, then
// the actions. Invitations (1c) and heatmap (1d) join with their features. An archived
// habit is read-only, with Reativar and Excluir (docs/spec/habitos.md).
export function HabitDetail({ habitId }: { habitId: string }) {
  const habit = useQuery('habit', { habitId }, ['habits']);

  if (!habit.data) {
    if (habit.error === 'not_found') {
      return (
        <section>
          <ScreenHeader title={t.notFound} back="/" />
        </section>
      );
    }
    if (habit.error) {
      return (
        <section>
          <Notice tone="error">{strings.genericError}</Notice>
          <Button onClick={habit.reload}>{strings.retry}</Button>
        </section>
      );
    }
    return <p className="muted">{strings.loading}</p>;
  }
  return habit.data.state === 'archived' ? (
    <ArchivedDetail habit={habit.data} onChanged={habit.reload} />
  ) : (
    <ActiveDetail habit={habit.data} onChanged={habit.reload} />
  );
}

/**
 * Size, consistency and XP: the streak for scheduled habits, Ritmo and Última vez for free ones
 * (docs/spec/streak-e-dominio.md), then the versão mínima when there is one.
 */
function HabitHeader({ habit }: { habit: HabitView }) {
  const consistency = habit.consistency;
  return (
    <div className="habit-header">
      <p className="muted">{describeHabit(habit)}</p>
      <h2 className="visually-hidden">{t.consistency}</h2>
      <div className="stat-row">
        {consistency.kind === 'streak' ? (
          <Stat label={t.streak} value={String(consistency.streak)} unit={t.streakUnit(consistency.streak)} />
        ) : (
          <>
            <Stat label={t.rhythm} value={String(consistency.rhythm)} unit={t.rhythmUnit(RHYTHM_DAYS)} />
            <Stat label={t.lastTime} value={t.lastTimeValue(consistency.lastDoneDaysAgo)} unit={t.lastTimeUnit(consistency.lastDoneDaysAgo)} />
          </>
        )}
        <Stat label={t.statXp} value={String(xpFor(habit.difficulty, habit.stars))} unit={t.statPerCompletion} gold />
      </div>
      {habit.minimum !== null && (
        <div className="card column-card">
          <span className="muted small">{t.minimum}</span>
          <span>{habit.minimum}</span>
          {habit.state === 'active' && <span className="muted small">{t.minimumLongPress}</span>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, unit, gold = false }: { label: string; value: string; unit: string; gold?: boolean }) {
  return (
    <div className="stat card">
      <span className="muted small">{label}</span>
      <span className={gold ? 'stat-value mono' : 'stat-value plain mono'}>{value}</span>
      {unit && <span className="muted small">{unit}</span>}
    </div>
  );
}

function ActiveDetail({ habit, onChanged }: { habit: HabitView; onChanged: () => void }) {
  const { backend } = useServices();
  const pauses = useQuery('pauses', {}, ['pauses', 'day']);
  const [sheet, setSheet] = useState<ReguaDirection | null>(null);
  const [pausing, setPausing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function archive() {
    setBusy(true);
    const result = await backend.command('habit.archive', { habitId: habit.id });
    setBusy(false);
    if (!result.ok) return setError(true);
    navigate('/', { replace: true });
  }

  const ownPause = pauses.data?.habits.find((pause) => pause.habitId === habit.id) ?? null;
  const pausedText = ownPause ? `${p.habitPaused} · ${pauseWhen(ownPause)}` : habit.paused ? p.paused : null;

  async function resume(pauseId: string) {
    setBusy(true);
    const result = await backend.command('pause.end', { pauseId });
    setBusy(false);
    setError(!result.ok);
    pauses.reload();
    onChanged();
  }

  return (
    <section>
      <ScreenHeader
        title={habit.name}
        back="/"
        actions={
          <Link to={`/habito/${habit.id}/editar`} className="text-button">
            {t.edit}
          </Link>
        }
      />
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      {pausedText && <p className="tag">{pausedText}</p>}
      <HabitHeader habit={habit} />
      <h2 className="visually-hidden">{t.actions}</h2>
      <ul className="list action-list">
        <li>
          <button type="button" className="card list-link" onClick={() => setSheet('raise')}>
            {r.raise}
          </button>
        </li>
        <li>
          <button type="button" className="card list-link" onClick={() => setSheet('lower')}>
            {r.lower}
          </button>
        </li>
        <li>
          {ownPause ? (
            <button type="button" className="card list-link" disabled={busy} onClick={() => void resume(ownPause.id)}>
              {p.backLabel}
            </button>
          ) : (
            <button type="button" className="card list-link" disabled={!pauses.data} onClick={() => setPausing(true)}>
              {t.pauseHabit}
            </button>
          )}
        </li>
        <li>
          <Link to={`/habito/${habit.id}/editar`} className="card list-link">
            {t.edit}
          </Link>
        </li>
        <li>
          <button type="button" className="card list-link" disabled={busy} onClick={() => void archive()}>
            {t.archive}
          </button>
        </li>
      </ul>
      <ReguaSheet habit={habit} direction={sheet} onClose={() => setSheet(null)} onChanged={onChanged} />
      <PauseSheet
        habit={habit}
        open={pausing}
        onClose={() => setPausing(false)}
        onPaused={() => {
          pauses.reload();
          onChanged();
        }}
      />
    </section>
  );
}

function ArchivedDetail({ habit, onChanged }: { habit: HabitView; onChanged: () => void }) {
  const { backend } = useServices();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function reactivate() {
    setBusy(true);
    const result = await backend.command('habit.reactivate', { habitId: habit.id });
    setBusy(false);
    setError(!result.ok);
    if (result.ok) onChanged();
  }

  return (
    <section>
      <ScreenHeader title={habit.name} back="/perfil" />
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      {habit.archivedOn && <p className="tag">{t.archivedOn(formatDayShort(habit.archivedOn))}</p>}
      <HabitHeader habit={habit} />
      <p className="muted small">{t.archivedHint}</p>
      <div className="stack">
        <Button className="wide" disabled={busy} onClick={() => void reactivate()}>
          {t.reactivate}
        </Button>
        <Button variant="secondary-danger" className="wide" onClick={() => setConfirming(true)}>
          {t.delete}
        </Button>
      </div>
      <DeleteHabitDialog habit={habit} open={confirming} onClose={() => setConfirming(false)} />
    </section>
  );
}
