import { useEffect, useRef, useState } from 'react';
import type { HabitView } from '../../application/api-contract';
import { RHYTHM_DAYS } from '../../domain/habits/consistency';
import { describeHabit, formatDayShort } from '../../domain/habits/describe';
import type { InvitationKind } from '../../domain/habits/invitations';
import { MASTERY_WINDOW, masteryPath } from '../../domain/habits/mastery';
import { MAX_STARS, starBonusPercent, xpFor } from '../../domain/habits/progression';
import type { ReguaDirection } from '../../domain/habits/regua';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { feedback } from '../feedback/feedback';
import { Button } from '../components/Button';
import { useCelebration } from '../components/Celebration';
import { Icon, type IconName } from '../components/Icon';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { Link, navigate } from '../router';
import { useQuery } from '../use-query';
import { AdjustSheet } from './adjust-sheet';
import { HabitHeatmapSection } from './heatmap';
import { DeleteHabitDialog, ReguaSheet, Stars } from './habit-sheets';
import { PauseSheet, pauseWhen } from './pause';

const t = strings.habit;
const r = strings.regua;
const p = strings.pause;
const m = strings.mastery;
const inv = strings.invitation;

// Detalhe do hábito (docs/spec/telas-e-feedback.md "Detalhe"): header with the selo, the stars and
// the consistency, the régua invitation when there is one, the heatmap, then the actions. An
// archived habit is read-only, with its heatmap, Reativar and Excluir (docs/spec/habitos.md).
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
function HabitHeader({ habit, stamp = false }: { habit: HabitView; stamp?: boolean }) {
  const consistency = habit.consistency;
  const path = habit.state === 'active' ? masteryPath(habit.mastery, habit.tierMastered) : null;
  return (
    <div className="habit-header">
      <p className="muted">{describeHabit(habit)}</p>
      {(habit.automated || habit.stars > 0) && (
        <div className="badge-row">
          {habit.automated && (
            <span className={stamp ? 'badge-auto stamping' : 'badge-auto'}>
              <Icon name="automated" />
              {m.automated}
            </span>
          )}
          {habit.stars > 0 && (
            <span className="row tight muted small">
              <Stars count={habit.stars} />
              <span>
                {m.stars(habit.stars, MAX_STARS)} · <span className="mono">{m.starsBonus(starBonusPercent(habit.stars))}</span>
              </span>
            </span>
          )}
        </div>
      )}
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
        <Stat
          label={m.stat}
          value={`${Math.min(habit.mastery.done, habit.mastery.needed)}/${habit.mastery.needed}`}
          unit={habit.tierMastered ? m.statMastered : habit.rule === 'free' ? m.statUnitFree : m.statUnitScheduled(MASTERY_WINDOW)}
        />
        <Stat label={t.statXp} value={String(xpFor(habit.difficulty, habit.stars))} unit={t.statPerCompletion} gold />
      </div>
      {path && <p className="muted small mastery-path">{m.path(path.done, path.needed)}</p>}
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

/** "Ver opções de régua" from a celebration opens the raise sheet here once (`?regua=subir`). */
function raiseRequested(): boolean {
  return new URLSearchParams(window.location.search).get('regua') === 'subir';
}

function ActiveDetail({ habit, onChanged }: { habit: HabitView; onChanged: () => void }) {
  const { backend } = useServices();
  const pauses = useQuery('pauses', {}, ['pauses', 'day']);
  const [sheet, setSheet] = useState<ReguaDirection | null>(() => (raiseRequested() ? 'raise' : null));
  const [adjusting, setAdjusting] = useState(false);
  /** Diminuir or pausar opened from "Ajustar a régua": their success is an ajuste too. */
  const [fromAdjust, setFromAdjust] = useState(false);
  const [adjusted, setAdjusted] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const celebration = useCelebration();

  // The selo is stamped when the member arrives from the celebration ("Ver opções de régua") or
  // watches the habit become Automatizado here; it never stamps again on a plain visit.
  const [stamp, setStamp] = useState(() => raiseRequested() && habit.automated);
  const wasAutomated = useRef(habit.automated);
  useEffect(() => {
    if (!wasAutomated.current && habit.automated) setStamp(true);
    wasAutomated.current = habit.automated;
  }, [habit.automated]);

  useEffect(() => {
    if (raiseRequested()) window.history.replaceState(null, '', window.location.pathname);
  }, []);

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

  async function dismiss(kind: InvitationKind) {
    setBusy(true);
    const result = await backend.command('habit.dismissInvitation', { habitId: habit.id, kind });
    setBusy(false);
    setError(!result.ok);
    onChanged();
  }

  /**
   * An ajuste is done: the message is the reward, and the invitation rests its 4 weeks, so a
   * versão mínima just created does not bring it straight back.
   */
  function finishAdjust() {
    setFromAdjust(false);
    setAdjusted(true);
    feedback('light');
    void dismiss('adjust');
  }

  return (
    <section>
      <ScreenHeader
        title={habit.name}
        back="/"
        actions={
          <Link to={`/habito/${habit.id}/editar`} className="icon-button" aria-label={t.edit}>
            <Icon name="edit" />
          </Link>
        }
      />
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      {adjusted && (
        <div className="adjust-done">
          <Notice>{strings.adjust.done}</Notice>
        </div>
      )}
      {pausedText && <p className="tag">{pausedText}</p>}
      <HabitHeader habit={habit} stamp={stamp} />
      {habit.invitation && (
        <Invitation
          habit={habit}
          kind={habit.invitation}
          busy={busy}
          onAccept={() => (habit.invitation === 'raise' ? setSheet('raise') : setAdjusting(true))}
          onDismiss={() => void dismiss(habit.invitation ?? 'raise')}
        />
      )}
      <HabitHeatmapSection habitId={habit.id} />
      <h2 className="visually-hidden">{t.actions}</h2>
      <ul className="action-bar">
        <ActionTile icon="arrowUp" label={t.actionRaise} aria={r.raise} onClick={() => setSheet('raise')} />
        <ActionTile icon="arrowDown" label={t.actionLower} aria={r.lower} onClick={() => setSheet('lower')} />
        {ownPause ? (
          <ActionTile icon="play" label={t.actionResume} aria={p.backLabel} disabled={busy} onClick={() => void resume(ownPause.id)} />
        ) : (
          <ActionTile icon="pause" label={t.actionPause} aria={t.pauseHabit} disabled={!pauses.data} onClick={() => setPausing(true)} />
        )}
        <ActionTile icon="archive" label={t.actionArchive} aria={t.archive} disabled={busy} onClick={() => void archive()} />
      </ul>
      <ReguaSheet
        habit={habit}
        direction={sheet}
        onClose={() => {
          setSheet(null);
          setFromAdjust(false);
        }}
        onChanged={() => {
          if (fromAdjust) finishAdjust();
          else setAdjusted(false);
          onChanged();
        }}
        onCelebrate={(celebrations) => celebration.show({ levelUp: null, celebrations })}
      />
      <AdjustSheet
        habit={habit}
        open={adjusting}
        onClose={() => setAdjusting(false)}
        onLower={() => {
          setAdjusting(false);
          setFromAdjust(true);
          setSheet('lower');
        }}
        onPause={() => {
          setAdjusting(false);
          setFromAdjust(true);
          setPausing(true);
        }}
        onAdjusted={() => {
          setAdjusting(false);
          finishAdjust();
        }}
      />
      <PauseSheet
        habit={habit}
        open={pausing}
        onClose={() => {
          setPausing(false);
          setFromAdjust(false);
        }}
        onPaused={() => {
          if (fromAdjust) finishAdjust();
          pauses.reload();
          onChanged();
        }}
      />
      {celebration.element}
    </section>
  );
}

/** One of the habit's actions: an icon over a short label, the full name for screen readers. */
function ActionTile({
  icon,
  label,
  aria,
  disabled = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  aria: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className="action-tile" aria-label={aria} title={aria} disabled={disabled} onClick={onClick}>
        <Icon name={icon} />
        <span aria-hidden="true">{label}</span>
      </button>
    </li>
  );
}

/**
 * The one régua invitation (docs/spec/regua.md): subir when the patamar is mastered, ajustar when
 * the habit weighs. Discreet, never a modal; "Agora não" has no consequence.
 */
function Invitation({
  habit,
  kind,
  busy,
  onAccept,
  onDismiss,
}: {
  habit: HabitView;
  kind: InvitationKind;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const raise = kind === 'raise';
  return (
    <div className={raise ? 'card invitation raise' : 'card invitation'}>
      <h2 className="visually-hidden">{raise ? r.raise : strings.adjust.title}</h2>
      {raise ? (
        <p>
          <strong>{inv.raiseTitle}</strong> {habit.stars < MAX_STARS ? inv.raiseText : inv.raiseTextMaxStars}
        </p>
      ) : (
        <p>{inv.adjustText}</p>
      )}
      <div className="row tight">
        <Button onClick={onAccept}>{raise ? inv.raiseAction : inv.adjustAction}</Button>
        <Button variant="secondary" disabled={busy} onClick={onDismiss}>
          {inv.dismiss}
        </Button>
      </div>
    </div>
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
      <HabitHeatmapSection habitId={habit.id} />
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
