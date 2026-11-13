import { useEffect, useRef, useState } from 'react';
import type { HabitView, ReviewResult } from '../../application/api-contract';
import { formatDayLong, type Day } from '../../domain/day';
import { markMinimum, NOT_STARTED, planToday, tap, type DayEntry, type TodayHabit } from '../../domain/habits/day-log';
import { describeRule } from '../../domain/habits/describe';
import { sortByIds } from '../../domain/habits/order';
import { reguaOptions } from '../../domain/habits/regua';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button, ButtonLink } from '../components/Button';
import { useCelebration } from '../components/Celebration';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { ProgressTop } from '../components/ProgressTop';
import { Sheet } from '../components/Sheet';
import { useDragReorder, type Announcement, type DragItemProps } from '../drag-reorder';
import { useLongPress } from '../long-press';
import { Link, navigate } from '../router';
import { useQuery } from '../use-query';
import { pauseWhen } from './pause';
import { YesterdaySheet } from './YesterdaySheet';

const t = strings.today;
const p = strings.pause;
const FREE_COLLAPSED_KEY = 'levelup.freeCollapsed';
/** The app pause this device last saw running: when it is gone, the member is back. */
const APP_PAUSE_KEY = 'levelup.appPause';

type Mark = 'full' | 'minimum';

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

/**
 * Whether the app pause this device saw is over (by "Voltar" here, elsewhere or on its return
 * date): then Hoje says welcome back once (docs/spec/modo-pausa.md "Voltar").
 */
function cameBack(appPauseId: string | null): boolean {
  try {
    const seen = window.localStorage.getItem(APP_PAUSE_KEY);
    if (appPauseId !== null) window.localStorage.setItem(APP_PAUSE_KEY, appPauseId);
    else if (seen !== null) window.localStorage.removeItem(APP_PAUSE_KEY);
    return appPauseId === null && seen !== null;
  } catch {
    return false;
  }
}

// The Hoje tab (docs/spec/telas-e-feedback.md "Hoje", registrar-o-dia.md): mark and leave.
export function Today() {
  const { backend } = useServices();
  const today = useQuery('today', {}, ['habits', 'day']);
  const progress = useQuery('progress', {}, ['progress']);
  const pauses = useQuery('pauses', {}, ['pauses', 'day']);
  const yesterday = useQuery('yesterday', {}, ['habits', 'day']);
  const [overlays, setOverlays] = useState<ReadonlyMap<string, Overlay>>(new Map());
  const [gains, setGains] = useState<readonly PendingGain[]>([]);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [celebration, setCelebration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [freeCollapsed, setFreeCollapsed] = useState(readCollapsed);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [minimumFor, setMinimumFor] = useState<HabitView | null>(null);
  const [resuming, setResuming] = useState(false);
  const [welcome, setWelcome] = useState(false);
  /** The order just dragged, shown until the server confirms it. */
  const [order, setOrder] = useState<readonly string[] | null>(null);
  const reordering = useRef(0);
  const gainIds = useRef(0);
  // Mastery and conquistas stack into one celebration; a level alone keeps the short toast.
  const celebrate = useCelebration({
    onLevelOnly: setCelebration,
    canRaise: (habitId) => {
      const habit = today.data?.habits.find((item) => item.habit.id === habitId)?.habit;
      return habit ? reguaOptions(habit, 'raise').length > 0 : true;
    },
  });

  // Fresh data from the server replaces what it confirmed.
  useEffect(() => {
    setOverlays((current) => new Map([...current].filter(([, o]) => o.inFlight > 0)));
    if (reordering.current === 0) setOrder(null);
  }, [today.data]);
  useEffect(() => {
    setGains((current) => current.filter((g) => !g.settled));
  }, [progress.data]);
  useEffect(() => {
    if (pauses.data && cameBack(pauses.data.app?.id ?? null)) setWelcome(true);
  }, [pauses.data]);

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
  const scheduled = order ? sortByIds(plan.scheduled, (item) => item.habit.id, order) : plan.scheduled;
  const done = planToday(items, day).done;
  const xpTotal = (progress.data?.xpTotal ?? 0) + gains.reduce((sum, g) => sum + g.xp, 0);
  const gold = (progress.data?.gold ?? 0) + gains.reduce((sum, g) => sum + g.gold, 0);
  const entryOf = (habitId: string) => items.find((i) => i.habit.id === habitId)?.entry ?? NOT_STARTED;

  async function mark(habit: HabitView, how: Mark = 'full') {
    const before = entryOf(habit.id);
    const next = how === 'full' ? tap(habit, day, before) : markMinimum(habit, day, before);
    if (!next) return;
    setError(null);
    setOverlays((current) => new Map(current).set(habit.id, { entry: next, inFlight: (current.get(habit.id)?.inFlight ?? 0) + 1 }));
    const gainId = ++gainIds.current;
    if (next.done) {
      setLeaving((current) => new Set(current).add(habit.id));
      setGains((current) => [...current, { id: gainId, xp: next.xp, gold: next.gold, settled: false }]);
    }

    const result = await backend.command(how === 'full' ? 'habit.mark' : 'habit.markMinimum', { habitId: habit.id });
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
    celebrate.show({ levelUp: result.value.levelUp, celebrations: result.value.celebrations });
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

  /** The drag in Hoje: shown at once, saved behind; a failure puts the old order back. */
  async function reorder(habitIds: string[]) {
    setError(null);
    setOrder(habitIds);
    reordering.current++;
    const result = await backend.command('habit.reorder', { habitIds });
    reordering.current--;
    if (!result.ok) {
      setOrder(null);
      setError(t.reorderFailed);
    }
    today.reload();
  }

  async function undo(habit: HabitView) {
    setUndoing(habit.id);
    const result = await backend.command('habit.unmark', { habitId: habit.id });
    setUndoing(null);
    setError(result.ok ? null : strings.genericError);
    today.reload();
    progress.reload();
  }

  async function resume(pauseId: string) {
    setResuming(true);
    const result = await backend.command('pause.end', { pauseId });
    setResuming(false);
    setError(result.ok ? null : strings.genericError);
    pauses.reload();
    today.reload();
  }

  function reviewed(result: ReviewResult | null) {
    if (result) celebrate.show({ levelUp: result.levelUp, celebrations: result.celebrations });
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

  const appPause = pauses.data?.app ?? null;
  const review = yesterday.data && yesterday.data.habits.length > 0 && (
    <YesterdaySheet key={yesterday.data.day} review={yesterday.data} onDone={reviewed} />
  );
  const top = (
    <>
      <ProgressTop xpTotal={xpTotal} gold={gold} celebration={celebration} onCelebrationEnd={() => setCelebration(null)} />
      {review}
      {celebrate.element}
      {welcome && <Notice>{p.welcomeBack}</Notice>}
      {appPause && (
        <div className="card row pause-banner">
          <span className="tag inline">{p.paused}</span>
          <span className="grow muted small">{pauseWhen(appPause)}</span>
          <Button variant="secondary" aria-label={p.backLabel} disabled={resuming} onClick={() => void resume(appPause.id)}>
            {p.back}
          </Button>
        </div>
      )}
    </>
  );
  const onMark = (habit: HabitView) => void mark(habit);
  const onMinimum = (habit: HabitView) => setMinimumFor(habit);
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

  const nothingScheduled = plan.scheduledCount === 0 && plan.paused.length === 0;
  const allDone = plan.scheduledCount > 0 && plan.scheduled.length === 0;
  const freeOpen = nothingScheduled || !freeCollapsed;
  const doneXp = done.reduce((sum, i) => sum + i.entry.xp, 0);
  const doneGold = done.reduce((sum, i) => sum + i.entry.gold, 0);

  return (
    <section className={welcome ? 'cascading' : undefined}>
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
      <HabitList
        items={scheduled}
        leaving={leaving}
        onMark={onMark}
        onMinimum={onMinimum}
        onLeft={finishLeaving}
        onReorder={(habitIds) => void reorder(habitIds)}
      />
      {plan.paused.length > 0 && appPause && <p className="muted small">{t.pausedHint}</p>}
      <HabitList items={plan.paused} leaving={leaving} onMark={onMark} onMinimum={onMinimum} onLeft={finishLeaving} />

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
            <HabitList items={plan.free} leaving={leaving} onMark={onMark} onMinimum={onMinimum} onLeft={finishLeaving} labelledBy="free-title" />
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
                    {entry.minimum && <span className="muted small">{t.minimumDone}</span>}
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
      <MinimumSheet
        habit={minimumFor}
        entry={minimumFor ? entryOf(minimumFor.id) : NOT_STARTED}
        day={day}
        onClose={() => setMinimumFor(null)}
        onConfirm={(habit) => {
          setMinimumFor(null);
          void mark(habit, 'minimum');
        }}
      />
      {fab}
    </section>
  );
}

/** The long press on the marker: "Fiz a versão mínima: <texto>" (docs/spec/registrar-o-dia.md). */
function MinimumSheet({
  habit,
  entry,
  day,
  onClose,
  onConfirm,
}: {
  habit: HabitView | null;
  entry: DayEntry;
  day: Day;
  onClose: () => void;
  onConfirm: (habit: HabitView) => void;
}) {
  const next = habit ? markMinimum(habit, day, entry) : null;
  return (
    <Sheet open={habit !== null && next !== null} title={habit?.name ?? ''} onClose={onClose}>
      {habit && next && (
        <>
          <p className="muted">{t.minimumGain(next.xp, next.gold)}</p>
          <div className="stack">
            <Button className="wide" onClick={() => onConfirm(habit)}>
              {t.minimumConfirm(habit.minimum ?? '')}
            </Button>
            <Button variant="secondary" className="wide" onClick={onClose}>
              {t.notNow}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

const REORDER_HINT_ID = 'reorder-hint';
const noDrop = () => undefined;

function announce(announcement: Announcement | null, nameOf: (id: string) => string): string {
  if (!announcement) return '';
  if (announcement.kind === 'canceled') return t.reorderCanceled;
  const say = announcement.kind === 'moving' ? t.moving : t.dropped;
  return say(nameOf(announcement.id), announcement.position, announcement.total);
}

/** A list of habits to mark; with `onReorder`, the member drags them into their order. */
function HabitList({
  items,
  leaving,
  onMark,
  onMinimum,
  onLeft,
  onReorder,
  labelledBy,
}: {
  items: readonly TodayHabit<HabitView>[];
  leaving: ReadonlySet<string>;
  onMark: (habit: HabitView) => void;
  onMinimum: (habit: HabitView) => void;
  onLeft: (habitId: string) => void;
  onReorder?: (habitIds: string[]) => void;
  labelledBy?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const drag = useDragReorder(
    items.map((item) => item.habit.id),
    listRef,
    onReorder ?? noDrop,
  );
  if (items.length === 0) return null;
  const byId = new Map(items.map((item) => [item.habit.id, item]));
  const reorderable = onReorder !== undefined && items.length > 1;
  const shown = reorderable ? drag.order.flatMap((id) => byId.get(id) ?? []) : items;
  return (
    <>
      <ul ref={listRef} className={reorderable ? 'list reorderable' : 'list'} aria-labelledby={labelledBy}>
        {shown.map(({ habit, entry }) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            entry={entry}
            leaving={leaving.has(habit.id)}
            onMark={onMark}
            onMinimum={onMinimum}
            onLeft={onLeft}
            drag={reorderable ? drag.itemProps(habit.id, !leaving.has(habit.id)) : undefined}
          />
        ))}
      </ul>
      {reorderable && (
        <>
          <p id={REORDER_HINT_ID} className="visually-hidden">
            {t.reorderHint}
          </p>
          <p className="visually-hidden" aria-live="assertive">
            {announce(drag.announcement, (id) => byId.get(id)?.habit.name ?? '')}
          </p>
        </>
      )}
    </>
  );
}

/**
 * One habit to mark. A tap marks it whole; a long press on the marker offers the versão mínima,
 * when the habit has one, and a long press anywhere else picks the item up to drag (`drag`). A
 * paused habit sits without emphasis, as "opcional"; a free one stopped for long shows "Faz tempo".
 */
function HabitRow({
  habit,
  entry,
  leaving,
  onMark,
  onMinimum,
  onLeft,
  drag,
}: {
  habit: HabitView;
  entry: DayEntry;
  leaving: boolean;
  onMark: (habit: HabitView) => void;
  onMinimum: (habit: HabitView) => void;
  onLeft: (habitId: string) => void;
  drag?: DragItemProps;
}) {
  const longPress = useLongPress(habit.minimum !== null && !leaving ? () => onMinimum(habit) : null);
  const counter = habit.dailyGoal > 1;
  const longAgo = habit.consistency.kind === 'rhythm' && habit.consistency.longAgo;
  const classes = ['habit-item', leaving && 'leaving', habit.paused && 'optional', drag?.className].filter(Boolean).join(' ');
  return (
    <li {...drag} className={classes} onAnimationEnd={(e) => e.target === e.currentTarget && onLeft(habit.id)}>
      <button
        type="button"
        className={leaving ? 'marker checked' : 'marker'}
        aria-label={t.markOf(habit.name)}
        disabled={leaving}
        onClick={() => onMark(habit)}
        {...longPress}
      >
        {leaving ? <Icon name="check" /> : counter && <span className="mono marker-count">{entry.count}</span>}
      </button>
      <Link
        to={`/habito/${habit.id}`}
        className="habit-name grow"
        draggable={drag ? false : undefined}
        aria-describedby={drag ? REORDER_HINT_ID : undefined}
      >
        <span className="strong-name">{habit.name}</span>
        {habit.rule === 'weekdays' && <span className="muted small">{describeRule(habit)}</span>}
      </Link>
      {habit.paused && !leaving && <span className="tag inline">{t.optional}</span>}
      {longAgo && !leaving && <span className="tag inline faz">{t.longAgo}</span>}
      {habit.invitation === 'raise' && !leaving && (
        <span className="invite-icon" role="img" aria-label={strings.mastery.inviteIcon}>
          <Icon name="arrowUp" />
        </span>
      )}
      {counter && !leaving && (
        <span className="counter mono" aria-label={t.counterOf(entry.count, habit.dailyGoal)}>
          {entry.count}/{habit.dailyGoal}
        </span>
      )}
      {leaving && (
        <span className="gain mono" role="status">
          {strings.progress.gain(entry.xp, entry.gold)}
        </span>
      )}
    </li>
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
