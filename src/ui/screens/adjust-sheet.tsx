import { useState } from 'react';
import type { HabitView } from '../../application/api-contract';
import { countWeekdays, isValidWeekdays, MINIMUM_MAX_LENGTH } from '../../domain/habits/habit';
import { reguaOptions } from '../../domain/habits/regua';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { ChoiceGroup, WeekdayPicker } from '../components/Choices';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { Sheet } from '../components/Sheet';

const a = strings.adjust;

export type AdjustReason = keyof typeof strings.adjust.reasons;
export type AdjustOption = 'lower' | 'minimum' | 'days' | 'free' | 'pause';

const REASONS: readonly AdjustReason[] = ['big', 'days', 'busy', 'unsure'];

/** "O que está pesando?": the options each answer puts first (docs/spec/regua.md "Ajustar"). */
const USEFUL: Readonly<Record<AdjustReason, readonly AdjustOption[]>> = {
  big: ['lower', 'minimum'],
  days: ['days', 'free'],
  busy: ['pause', 'minimum'],
  unsure: [],
};

/** The ajuste options that apply to the habit, in the spec's order. */
export function adjustOptions(habit: Pick<HabitView, 'rule' | 'difficulty' | 'dailyGoal' | 'weekdays' | 'paused'>): AdjustOption[] {
  const options: AdjustOption[] = [];
  if (reguaOptions(habit, 'lower').length > 0) options.push('lower');
  if (habit.rule !== 'free') options.push('minimum');
  if (habit.rule === 'weekdays') options.push('days');
  if (habit.rule !== 'free') options.push('free');
  if (!habit.paused) options.push('pause');
  return options;
}

/** The options split by the answer: the useful ones first; with no answer, all without emphasis. */
export function splitOptions(options: readonly AdjustOption[], reason: AdjustReason | null): { useful: AdjustOption[]; others: AdjustOption[] } {
  const highlight = reason ? USEFUL[reason] : [];
  return {
    useful: options.filter((o) => highlight.includes(o)),
    others: options.filter((o) => !highlight.includes(o)),
  };
}

/** A new set of days for "Mudar os dias": the same total or fewer, at least one, not the same days. */
export function isValidAdjustedDays(current: number, next: number): boolean {
  return isValidWeekdays(next) && next !== current && countWeekdays(next) <= countWeekdays(current);
}

type Step = 'menu' | 'minimum' | 'days' | 'free';

/**
 * Ajustar a régua (docs/spec/regua.md): an optional "O que está pesando?" that puts the most useful
 * options first, every option still in sight. The versão mínima, the days and "Transformar em
 * livre" happen here; diminuir and pausar open their own sheets (`onLower`, `onPause`). Nothing
 * earned leaves and nothing is earned: the reward is the message (`onAdjusted`).
 */
export function AdjustSheet({
  habit,
  open,
  onClose,
  onLower,
  onPause,
  onAdjusted,
}: {
  habit: HabitView;
  open: boolean;
  onClose: () => void;
  onLower: () => void;
  onPause: () => void;
  onAdjusted: () => void;
}) {
  const { backend } = useServices();
  const [reason, setReason] = useState<AdjustReason | null>(null);
  const [step, setStep] = useState<Step>('menu');
  const [minimum, setMinimum] = useState(habit.minimum ?? '');
  const [weekdays, setWeekdays] = useState(habit.weekdays);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const { useful, others } = splitOptions(adjustOptions(habit), reason);

  function reset() {
    setReason(null);
    setStep('menu');
    setMinimum(habit.minimum ?? '');
    setWeekdays(habit.weekdays);
    setTouched(false);
    setError(false);
  }

  function close() {
    reset();
    onClose();
  }

  function choose(option: AdjustOption) {
    if (option === 'lower' || option === 'pause') {
      reset();
      return option === 'lower' ? onLower() : onPause();
    }
    setStep(option);
  }

  async function run(command: () => Promise<{ ok: boolean }>) {
    setBusy(true);
    const result = await command();
    setBusy(false);
    if (!result.ok) return setError(true);
    reset();
    onAdjusted();
  }

  const minimumMissing = touched && minimum.trim() === '';
  const daysError = touched && !isValidAdjustedDays(habit.weekdays, weekdays) ? a.daysTooMany(countWeekdays(habit.weekdays)) : null;

  function saveMinimum() {
    setTouched(true);
    if (minimum.trim() === '') return;
    void run(() => backend.command('habit.update', { habitId: habit.id, name: habit.name, rule: habit.rule, minimum }));
  }

  function saveDays() {
    setTouched(true);
    if (!isValidAdjustedDays(habit.weekdays, weekdays)) return;
    void run(() => backend.command('habit.resize', { habitId: habit.id, difficulty: habit.difficulty, dailyGoal: habit.dailyGoal, weekdays }));
  }

  function makeFree() {
    void run(() => backend.command('habit.update', { habitId: habit.id, name: habit.name, rule: 'free', minimum: null }));
  }

  const back = (
    <Button variant="secondary" className="wide" onClick={() => setStep('menu')}>
      {a.back}
    </Button>
  );

  return (
    <Sheet open={open} title={a.title} onClose={close}>
      <p className="muted">{habit.name}</p>
      {error && <Notice tone="error">{strings.genericError}</Notice>}

      {step === 'menu' && (
        <>
          <ChoiceGroup<string>
            legend={a.question}
            name="adjust-reason"
            value={reason ?? ''}
            columns
            choices={REASONS.map((value) => ({ value, label: a.reasons[value] }))}
            onChange={(value) => setReason(value as AdjustReason)}
          />
          {useful.length > 0 && <OptionList title={a.useful} options={useful} habit={habit} highlight onChoose={choose} />}
          <OptionList title={useful.length > 0 ? a.others : a.options} options={others} habit={habit} onChoose={choose} />
          <p className="muted small">{a.keeps}</p>
          <Button variant="secondary" className="wide" onClick={close}>
            {strings.invitation.dismiss}
          </Button>
        </>
      )}

      {step === 'minimum' && (
        <>
          <Field
            label={strings.habit.minimum}
            placeholder={strings.habit.minimumPlaceholder}
            value={minimum}
            maxLength={MINIMUM_MAX_LENGTH}
            error={minimumMissing ? a.minimumMissing : null}
            onChange={(e) => setMinimum(e.target.value)}
          />
          <p className="muted small">{strings.habit.minimumHint}</p>
          <Button className="wide" disabled={busy} onClick={saveMinimum}>
            {a.saveMinimum}
          </Button>
          {back}
        </>
      )}

      {step === 'days' && (
        <>
          <WeekdayPicker value={weekdays} onChange={setWeekdays} error={daysError} />
          <p className="muted small">{a.daysHint}</p>
          <Button className="wide" disabled={busy} onClick={saveDays}>
            {a.saveDays}
          </Button>
          {back}
        </>
      )}

      {step === 'free' && (
        <>
          <p>{a.freeText}</p>
          <Button className="wide" disabled={busy} onClick={makeFree}>
            {a.confirmFree}
          </Button>
          {back}
        </>
      )}
    </Sheet>
  );
}

function OptionList({
  title,
  options,
  habit,
  highlight = false,
  onChoose,
}: {
  title: string;
  options: readonly AdjustOption[];
  habit: HabitView;
  highlight?: boolean;
  onChoose: (option: AdjustOption) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="stack-tight">
      <h3 className="field-label">{title}</h3>
      <ul className="list">
        {options.map((option) => {
          const text = optionText(option, habit);
          return (
            <li key={option}>
              <button type="button" className={highlight ? 'card list-link column adjust-option useful' : 'card list-link column adjust-option'} onClick={() => onChoose(option)}>
                <span className="choice-label">{text.label}</span>
                <span className="muted small">{text.hint}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function optionText(option: AdjustOption, habit: HabitView): { label: string; hint: string } {
  switch (option) {
    case 'lower':
      return { label: a.lower, hint: a.lowerHint };
    case 'minimum':
      return habit.minimum === null ? { label: a.minimumCreate, hint: a.minimumHint } : { label: a.minimumEdit, hint: habit.minimum };
    case 'days':
      return { label: a.days, hint: a.daysHint };
    case 'free':
      return { label: a.free, hint: a.freeHint };
    case 'pause':
      return { label: a.pause, hint: a.pauseHint };
  }
}
