import { useRef, useState } from 'react';
import type { HabitView, ReviewResult, YesterdayView } from '../../application/api-contract';
import { formatDayLong } from '../../domain/day';
import { completeInReview } from '../../domain/habits/day-log';
import { describeRule } from '../../domain/habits/describe';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { Sheet } from '../components/Sheet';

const t = strings.yesterday;

/**
 * Revisar ontem (docs/spec/registrar-o-dia.md): on the first visit to Hoje after the day turns,
 * the habits left open yesterday, to mark what was done and not marked. However it closes, what is
 * marked counts, and it does not open again that day.
 */
export function YesterdaySheet({ review, onDone }: { review: YesterdayView; onDone: (result: ReviewResult | null) => void }) {
  const { backend } = useServices();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [open, setOpen] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  // Closing the dialog fires onClose too: one save per close.
  const saving = useRef(false);

  const earned = review.habits.filter(({ habit }) => chosen.has(habit.id)).map(({ habit, entry }) => completeInReview(habit, entry));
  const xp = earned.reduce((sum, e) => sum + e.xp, 0);
  const gold = earned.reduce((sum, e) => sum + e.gold, 0);

  function toggle(habit: HabitView) {
    setChosen((current) => {
      const copy = new Set(current);
      if (!copy.delete(habit.id)) copy.add(habit.id);
      return copy;
    });
  }

  async function close() {
    if (saving.current) return;
    saving.current = true;
    setOpen(false);
    setBusy(true);
    const result = await backend.command('day.reviewYesterday', { habitIds: [...chosen] });
    saving.current = false;
    setBusy(false);
    if (result.ok) return onDone(result.value);
    // Another device closed it first: nothing left to save here.
    if (result.error === 'conflict' || result.error === 'invalid') return onDone(null);
    setError(true);
    setOpen(true);
  }

  return (
    <Sheet open={open} title={t.title} onClose={() => void close()}>
      <p className="muted">
        {t.intro} <span className="small">({formatDayLong(review.day)})</span>
      </p>
      {error && <Notice tone="error">{t.saveFailed}</Notice>}
      <ul className="list">
        {review.habits.map(({ habit }) => {
          const marked = chosen.has(habit.id);
          return (
            <li key={habit.id} className="habit-item">
              <button
                type="button"
                className={marked ? 'marker checked' : 'marker'}
                aria-pressed={marked}
                aria-label={t.markOf(habit.name)}
                onClick={() => toggle(habit)}
              >
                {marked && <Icon name="check" />}
              </button>
              <span className="habit-name grow">
                <span className="strong-name">{habit.name}</span>
                {(habit.rule !== 'daily' || habit.dailyGoal > 1) && <span className="muted small">{describeRule(habit)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {chosen.size > 0 && (
        <p className="row">
          <span className="gain mono">{t.total(xp, gold)}</span>
        </p>
      )}
      <Button className="wide" disabled={busy} onClick={() => void close()}>
        {t.confirm(chosen.size)}
      </Button>
      <p className="muted small">{t.hint}</p>
    </Sheet>
  );
}
