import { useState } from 'react';
import type { HabitView } from '../../application/api-contract';
import { countWeekdays } from '../../domain/habits/habit';
import { xpFor } from '../../domain/habits/progression';
import { reguaOptions, type ReguaDirection, type ReguaOption } from '../../domain/habits/regua';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { ChoiceGroup } from '../components/Choices';
import { Notice } from '../components/Notice';
import { Sheet } from '../components/Sheet';
import { navigate } from '../router';

const r = strings.regua;
const t = strings.habit;

function optionText(habit: HabitView, option: ReguaOption, raise: boolean): { label: string; hint: string } {
  switch (option.kind) {
    case 'difficulty':
      return { label: r.difficulty(t.difficultyName[option.from], t.difficultyName[option.to]), hint: raise ? r.raiseDifficulty : r.lowerDifficulty };
    case 'goal':
      return { label: r.goal(option.from, option.to), hint: raise ? r.raiseGoal : r.lowerGoal };
    default: {
      const day = t.weekdayLong[option.weekday];
      const label = option.kind === 'addDay' ? r.addDay(day) : r.removeDay(day);
      return { label, hint: r.days(countWeekdays(habit.weekdays), countWeekdays(option.size.weekdays)) };
    }
  }
}

/**
 * Subir or baixar a régua (docs/spec/regua.md): only the options that apply to the habit, each
 * with the XP now and after. In phase 1a there are no stars yet.
 */
export function ReguaSheet({
  habit,
  direction,
  onClose,
  onChanged,
}: {
  habit: HabitView;
  direction: ReguaDirection | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { backend } = useServices();
  const options = direction ? reguaOptions(habit, direction) : [];
  const [chosen, setChosen] = useState<string>('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const raise = direction === 'raise';
  const option = options[Number(chosen)] ?? options[0];
  const xpNow = xpFor(habit.difficulty, habit.stars);

  function close() {
    setChosen('0');
    setError(false);
    onClose();
  }

  async function confirm() {
    if (!option) return;
    setBusy(true);
    const result = await backend.command('habit.resize', { habitId: habit.id, ...option.size });
    setBusy(false);
    if (!result.ok) return setError(true);
    onChanged();
    close();
  }

  return (
    <Sheet open={direction !== null} title={raise ? r.raise : r.lower} onClose={close}>
      <p className="muted">{habit.name}</p>
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      {options.length === 0 ? (
        <p>{raise ? r.raiseNone : r.lowerNone}</p>
      ) : (
        <>
          <p>{raise ? r.raiseIntro : r.lowerIntro}</p>
          <ChoiceGroup
            legend={raise ? r.raise : r.lower}
            name="regua"
            value={String(options.indexOf(option))}
            choices={options.map((o, i) => {
              const text = optionText(habit, o, raise);
              return {
                value: String(i),
                label: text.label,
                hint: text.hint,
                aside: <span className="xp-tag mono">{r.xpChange(xpNow, xpFor(o.size.difficulty, habit.stars))}</span>,
              };
            })}
            onChange={setChosen}
          />
          <p className="muted small">{r.windowHint}</p>
        </>
      )}
      <div className="stack">
        {options.length > 0 && (
          <Button className="wide" disabled={busy} onClick={() => void confirm()}>
            {raise ? r.confirmRaise : r.confirmLower}
          </Button>
        )}
        <Button variant="secondary" className="wide" onClick={close}>
          {r.close}
        </Button>
      </div>
    </Sheet>
  );
}

/** The only blocking modal: confirming a deletion (docs/spec/habitos.md "Excluir"). */
export function DeleteHabitDialog({ habit, open, onClose }: { habit: HabitView; open: boolean; onClose: () => void }) {
  const { backend } = useServices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await backend.command('habit.delete', { habitId: habit.id });
    setBusy(false);
    if (!result.ok) return setError(true);
    navigate(habit.state === 'archived' ? '/perfil' : '/', { replace: true });
  }

  return (
    <Sheet open={open} variant="confirm" title={t.deleteTitle(habit.name)} onClose={onClose}>
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      <p>{t.deleteText}</p>
      {habit.state === 'active' && <p className="muted small">{t.deleteArchiveHint}</p>}
      <div className="stack">
        <Button variant="danger" className="wide" disabled={busy} onClick={() => void remove()}>
          {t.deleteConfirm}
        </Button>
        <Button variant="secondary" className="wide" onClick={onClose}>
          {t.cancel}
        </Button>
      </div>
    </Sheet>
  );
}
