import { useId, type ReactNode } from 'react';
import { hasWeekday, toggleWeekday, WEEK_ORDER } from '../../domain/habits/habit';
import { strings } from '../../domain/strings';

export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
  /** A line under the label, or a value at its end ("10 XP"). */
  readonly hint?: ReactNode;
  readonly aside?: ReactNode;
}

/**
 * One choice among a few, as tappable cards over native radio buttons: the keyboard and screen
 * readers get a real radio group.
 */
export function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  choices,
  onChange,
  columns = false,
}: {
  legend: string;
  name: string;
  value: T;
  choices: readonly Choice<T>[];
  onChange: (value: T) => void;
  columns?: boolean;
}) {
  return (
    <fieldset className="choices">
      <legend className="field-label">{legend}</legend>
      <div className={columns ? 'choice-grid' : 'stack-tight'}>
        {choices.map((choice) => (
          <label key={choice.value} className="choice">
            <input type="radio" name={name} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} />
            <span className="grow">
              <span className="choice-label">{choice.label}</span>
              {choice.hint && <span className="muted small choice-hint">{choice.hint}</span>}
            </span>
            {choice.aside}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The days of the week, Monday first, as toggles. */
export function WeekdayPicker({ value, onChange, error }: { value: number; onChange: (mask: number) => void; error?: string | null }) {
  const errorId = useId();
  return (
    <fieldset className="choices" aria-describedby={error ? errorId : undefined}>
      <legend className="field-label">{strings.habit.days}</legend>
      <div className="weekdays">
        {WEEK_ORDER.map((day) => (
          <label key={day} className="weekday">
            <input type="checkbox" checked={hasWeekday(value, day)} onChange={() => onChange(toggleWeekday(value, day))} />
            <span aria-hidden="true">{strings.habit.weekdayLetter[day]}</span>
            <span className="visually-hidden">{strings.habit.weekdayLong[day]}</span>
          </label>
        ))}
      </div>
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </fieldset>
  );
}
