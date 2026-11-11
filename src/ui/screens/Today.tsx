import { useEffect, useRef, useState } from 'react';
import type { HabitView, ReviewResult } from '../../application/api-contract';
import { formatDayLong } from '../../domain/day';
import { NOT_STARTED, planToday, tap, type DayEntry, type TodayHabit } from '../../domain/habits/day-log';
import { describeRule } from '../../domain/habits/describe';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button, ButtonLink } from '../components/Button';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { ProgressTop } from '../components/ProgressTop';
import { Link, navigate } from '../router';
import { useQuery } from '../use-query';
import { YesterdaySheet } from './YesterdaySheet';

const t = strings.today;
const FREE_COLLAPSED_KEY = 'levelup.freeCollapsed';

/** A tap the server has not confirmed yet: the screen shows it at once (spec: "responde na hora"). */
interface Overlay {
  readonly entry: DayEntry;
  readonly inFlight: number;
}

interface PendingGain {
  readonly id: number;
  readonly xp: number;
  readonly gold: number;
  readonly settled: boolean;
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(FREE_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(FREE_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // Private mode: the section just opens next time.
  }
}

// The Hoje tab (docs/spec/telas-e-feedback.md "Hoje", registrar-o-dia.md): mark and leave.
export function Today() {
  const { backend } = useServices();
  const today = useQuery('today', {}, ['habits', 'day']);
  const progress = useQuery('progress', {}, ['progress']);
  const yesterday = useQuery('yesterday', {}, ['habits', 'day']);
  const [overlays, setOverlays] = useState<ReadonlyMap<string, Overlay>>(new Map());
  const [gains, setGains] = useState<readonly PendingGain[]>([]);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [celebration, setCelebration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [freeCollapsed, setFreeCollapsed] = useState(readCollapsed);
  const [undoing, setUndoing] = useState<string | null>(null);
  const gainIds = useRef(0);

  // Fresh data from the server replaces what it confirmed.
  useEffect(() => {
    setOverlays((current) => new Map([...current].filter(([, o]) => o.inFlight > 0)));
  }, [today.data]);
  useEffect(() => {
    setGains((current) => current.filter((g) => !g.settled));
  }, [progress.data]);

  if (!today.data) {
    if (today.error) {
      return (
        <section>
          <Notice tone="error">{strings.genericError}</Notice>
          <Button onClick={today.reload}>{strings.retry}</Button>
        </section>
      );
    }
    return <p className="muted">{strings.loading}</p>;
  }

  const { day } = today.data;
  const items: TodayHabit<HabitView>[] = today.data.habits.map(({ habit, entry }) => ({ habit, entry: overlays.get(habit.id)?.entry ?? entry }));
  // Just-completed items stay in place for a moment, showing what they earned, then leave.
  const plan = planToday(
    items.map((item) => (leaving.has(item.habit.id) ? { ...item, entry: { ...item.entry, done: false } } : item)),
    day,
  );
  const done = planToday(items, day).done;
  const xpTotal = (progress.data?.xpTotal ?? 0) + gains.reduce((sum, g) => sum + g.xp, 0);
  const gold = (progress.data?.gold ?? 0) + gains.reduce((sum, g) => sum + g.gold, 0);
  const entryOf = (habitId: string) => items.find((i) => i.habit.id === habitId)?.entry ?? NOT_STARTED;

  async function mark(habit: HabitView) {
    const before = entryOf(habit.id);
    const next = tap(habit, day, before);
    if (!next) return;
    setError(null);
    setOverlays((current) => new Map(current).set(habit.id, { entry: next, inFlight: (current.get(habit.id)?.inFlight ?? 0) + 1 }));
    const gainId = ++gainIds.current;
    if (next.done) {
      setLeaving((current) => new Set(current).add(habit.id));
      setGains((current) => [...current, { id: gainId, xp: next.xp, gold: next.gold, settled: false }]);
    }

    const result = await backend.command('habit.mark', { habitId: habit.id });
    if (!result.ok) {
      // Spec: if saving fails, say so and put the item back.
      setOverlays((current) => {
        const copy = new Map(current);
        copy.delete(habit.id);
        return copy;
      });
      setGains((current) => current.filter((g) => g.id !== gainId));
      setLeaving((current) => {
        const copy = new Set(current);
        copy.delete(habit.id);
        return copy;
      });
      setError(t.saveFailed);
      today.reload();
      return;
    }
    setOverlays((current) => {
      const overlay = current.get(habit.id);
      return overlay ? new Map(current).set(habit.id, { ...overlay, inFlight: overlay.inFlight - 1 }) : current;
    });
    setGains((current) => current.map((g) => (g.id === gainId ? { ...g, settled: true } : g)));
    if (result.value.levelUp !== null) setCelebration(result.value.levelUp);
    today.reload();
    progress.reload();
  }

  function finishLeaving(habitId: string) {
    setLeaving((current) => {
      const copy = new Set(current);
      copy.delete(habitId);
      return copy;
    });
  }

  async function undo(habit: HabitView) {
    setUndoing(habit.id);
    const result = await backend.command('habit.unmark', { habitId: habit.id });
    setUndoing(null);
    setError(result.ok ? null : strings.genericError);
    today.reload();
    progress.reload();
  }

  function reviewed(result: ReviewResult | null) {
    if (result?.levelUp != null) setCelebration(result.levelUp);
    yesterday.reload();
    today.reload();
    progress.reload();
  }

  function toggleFree() {
    setFreeCollapsed((current) => {
      writeCollapsed(!current);
      return !current;
    });
  }

  const review = yesterday.data && yesterday.data.habits.length > 0 && (
    <YesterdaySheet key={yesterday.data.day} review={yesterday.data} onDone={reviewed} />
  );
  const top = (
    <>
      <ProgressTop xpTotal={xpTotal} gold={gold} celebration={celebration} onCelebrationEnd={() => setCelebration(null)} />
      {review}
    </>
  );
  const fab = (
    <Link to="/habito/novo" className="fab" aria-label={t.create}>
      <Icon name="plus" />
    </Link>
  );

  if (items.length === 0) {
    return (
      <section>
        {top}
        <FirstUse />
        {fab}
      </section>
    );
  }

  const nothingScheduled = plan.scheduledCount === 0;
  const allDone = !nothingScheduled && plan.scheduled.length === 0;
  const freeOpen = nothingScheduled || !freeCollapsed;
  const doneXp = done.reduce((sum, i) => sum + i.entry.xp, 0);
  const doneGold = done.reduce((sum, i) => sum + i.entry.gold, 0);

  return (
    <section>
      {top}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="section-head">
        <h1>{t.title}</h1>
        <span className="muted small">{formatDayLong(day)}</span>
      </div>
      {nothingScheduled && <p className="muted">{t.nothingScheduled}</p>}
      {allDone && (
        <div className="card done-card" role="status">
          <h2>{t.allDone}</h2>
          <p className="muted">{t.allDoneSummary(done.length, doneXp, doneGold)}</p>
        </div>
      )}
      <HabitList items={plan.scheduled} leaving={leaving} onMark={(h) => void mark(h)} onLeft={finishLeaving} />

      {plan.free.length > 0 && (
        <>
          <div className="section-head section-title">
            <h2 id="free-title">{t.free}</h2>
            {!nothingScheduled && (
              <button type="button" className="text-button" aria-expanded={freeOpen} aria-controls="free-list" onClick={toggleFree}>
                {freeOpen ? t.collapse : <span className="count-pill mono">{plan.free.length}</span>}
                {!freeOpen && <span className="visually-hidden">{t.expand}</span>}
              </button>
            )}
          </div>
          <div id="free-list" hidden={!freeOpen}>
            <HabitList items={plan.free} leaving={leaving} onMark={(h) => void mark(h)} onLeft={finishLeaving} labelledBy="free-title" />
          </div>
        </>
      )}

      {done.length > 0 && (
        <div className="section-title">
          <button type="button" className="text-button" aria-expanded={showDone} aria-controls="done-list" onClick={() => setShowDone((v) => !v)}>
            {showDone ? t.hideDone : t.showDone(done.length)}
          </button>
          <div id="done-list" hidden={!showDone}>
            <ul className="list">
              {done.map(({ habit, entry }) => (
                <li key={habit.id} className="habit-item done">
                  <span className="marker checked" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <Link to={`/habito/${habit.id}`} className="habit-name grow">
                    {habit.name}
                  </Link>
                  <span className="gain mono">{strings.progress.gain(entry.xp, entry.gold)}</span>
                  <Button
                    variant="secondary"
                    aria-label={t.undoOf(habit.name)}
                    disabled={undoing === habit.id || (overlays.get(habit.id)?.inFlight ?? 0) > 0}
                    onClick={() => void undo(habit)}
                  >
                    {t.undo}
                  </Button>
                </li>
              ))}
            </ul>
            <p className="muted small">{t.undoHint}</p>
          </div>
        </div>
      )}
      {fab}
    </section>
  );
}

function HabitList({
  items,
  leaving,
  onMark,
  onLeft,
  labelledBy,
}: {
  items: readonly TodayHabit<HabitView>[];
  leaving: ReadonlySet<string>;
  onMark: (habit: HabitView) => void;
  onLeft: (habitId: string) => void;
  labelledBy?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="list" aria-labelledby={labelledBy}>
      {items.map(({ habit, entry }) => {
        const isLeaving = leaving.has(habit.id);
        const counter = habit.dailyGoal > 1;
        return (
          <li key={habit.id} className={isLeaving ? 'habit-item leaving' : 'habit-item'} onAnimationEnd={(e) => e.target === e.currentTarget && onLeft(habit.id)}>
            <button type="button" className={isLeaving ? 'marker checked' : 'marker'} aria-label={strings.today.markOf(habit.name)} disabled={isLeaving} onClick={() => onMark(habit)}>
              {isLeaving ? <Icon name="check" /> : counter && <span className="mono marker-count">{entry.count}</span>}
            </button>
            <Link to={`/habito/${habit.id}`} className="habit-name grow">
              <span className="strong-name">{habit.name}</span>
              {habit.rule === 'weekdays' && <span className="muted small">{describeRule(habit)}</span>}
            </Link>
            {counter && !isLeaving && (
              <span className="counter mono" aria-label={strings.today.counterOf(entry.count, habit.dailyGoal)}>
                {entry.count}/{habit.dailyGoal}
              </span>
            )}
            {isLeaving && (
              <span className="gain mono" role="status">
                {strings.progress.gain(entry.xp, entry.gold)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** First use, with no habits: the idea of the app and one button, plus examples. No tutorial. */
function FirstUse() {
  return (
    <div className="first-use">
      <h1>{t.firstTitle}</h1>
      <p className="muted">{t.firstText}</p>
      <ButtonLink
        href="/habito/novo"
        className="wide"
        onClick={(event) => {
          event.preventDefault();
          navigate('/habito/novo');
        }}
      >
        {t.firstButton}
      </ButtonLink>
      <h2 className="section-title">{t.examplesTitle}</h2>
      <ul className="list">
        {strings.habit.examples.map((example) => (
          <li key={example.key}>
            <Link to={`/habito/novo?exemplo=${example.key}`} className="card list-link column">
              <span>{example.name}</span>
              <span className="muted small">{example.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
