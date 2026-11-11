import { useState } from 'react';
import type { PauseView } from '../../application/api-contract';
import { addDays } from '../../domain/day';
import { formatDayShort } from '../../domain/habits/describe';
import { isValidReturnDate } from '../../domain/habits/pause';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { ChoiceGroup } from '../components/Choices';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { Sheet } from '../components/Sheet';
import { useToday } from '../use-today';

const t = strings.pause;

type Until = 'none' | 'date';

/** "volta em 18 de nov." or "sem prazo": the return date is the first day back. */
export function pauseWhen(pause: PauseView): string {
  return pause.untilDay === null ? t.noDeadlineShort : t.returnsOn(formatDayShort(pause.untilDay));
}

/**
 * Pausar (docs/spec/modo-pausa.md "Pausar"): the whole app, or one habit when `habit` is given,
 * with no deadline (the default, one tap) or until a return date after today. No reason asked.
 */
export function PauseSheet({
  habit,
  open,
  onClose,
  onPaused,
}: {
  habit?: { readonly id: string; readonly name: string };
  open: boolean;
  onClose: () => void;
  onPaused: () => void;
}) {
  const { backend } = useServices();
  const today = useToday();
  const [until, setUntil] = useState<Until>('none');
  const [returnDay, setReturnDay] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const untilDay = until === 'none' ? null : returnDay;
  const dateError = touched && !isValidReturnDate(untilDay, today) ? t.returnDayInvalid : null;

  function close() {
    setUntil('none');
    setReturnDay('');
    setTouched(false);
    setError(false);
    onClose();
  }

  async function confirm() {
    setTouched(true);
    if (!isValidReturnDate(untilDay, today)) return;
    setBusy(true);
    const result = await backend.command('pause.start', { habitId: habit?.id, untilDay });
    setBusy(false);
    if (!result.ok) return setError(true);
    onPaused();
    close();
  }

  return (
    <Sheet open={open} title={habit ? t.habitTitle : t.appTitle} onClose={close}>
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      <p>{habit ? t.habitIntro(habit.name) : t.appIntro}</p>
      <ChoiceGroup
        legend={t.until}
        name="pause-until"
        value={until}
        choices={[
          { value: 'none', label: t.noDeadline, hint: t.noDeadlineHint },
          { value: 'date', label: t.withDate, hint: t.withDateHint },
        ]}
        onChange={setUntil}
      />
      {until === 'date' && (
        <Field label={t.returnDay} type="date" min={addDays(today, 1)} value={returnDay} error={dateError} onChange={(e) => setReturnDay(e.target.value)} />
      )}
      <div className="stack">
        <Button className="wide" disabled={busy} onClick={() => void confirm()}>
          {t.confirm}
        </Button>
        <Button variant="secondary" className="wide" onClick={close}>
          {t.cancel}
        </Button>
      </div>
    </Sheet>
  );
}
