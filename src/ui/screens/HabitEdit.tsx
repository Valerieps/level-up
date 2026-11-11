import { useState, type FormEvent } from 'react';
import type { HabitView } from '../../application/api-contract';
import { describeHabit } from '../../domain/habits/describe';
import { isValidWeekdays, NAME_MAX_LENGTH, normalizeHabitName, WORK_WEEK, type Rule } from '../../domain/habits/habit';
import { xpFor } from '../../domain/habits/progression';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { ChoiceGroup, WeekdayPicker } from '../components/Choices';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { Link, navigate } from '../router';
import { useQuery } from '../use-query';
import { DeleteHabitDialog } from './habit-sheets';
import { ruleChoices } from './HabitNew';

const t = strings.habit;

// Editar (docs/spec/habitos.md "Editar"): name and time rule. Difficulty, goal and days are
// read-only here, with a shortcut to the régua. Excluir sits at the end, apart.
export function HabitEdit({ habitId }: { habitId: string }) {
  const habit = useQuery('habit', { habitId }, ['habits']);
  if (!habit.data) {
    if (habit.error) {
      return (
        <section>
          <ScreenHeader title={t.editTitle} back="/" />
          <Notice tone="error">{habit.error === 'not_found' ? t.notFound : strings.genericError}</Notice>
        </section>
      );
    }
    return <p className="muted">{strings.loading}</p>;
  }
  return <EditForm habit={habit.data} />;
}

function EditForm({ habit }: { habit: HabitView }) {
  const { backend } = useServices();
  const [name, setName] = useState(habit.name);
  const [rule, setRule] = useState<Rule>(habit.rule);
  const [weekdays, setWeekdays] = useState(habit.rule === 'weekdays' ? habit.weekdays : WORK_WEEK);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const detail = `/habito/${habit.id}`;
  const ruleChanged = rule !== habit.rule;
  const nameError = touched && !normalizeHabitName(name) ? t.nameMissing : null;
  const daysError = touched && ruleChanged && rule === 'weekdays' && !isValidWeekdays(weekdays) ? t.daysMissing : null;

  async function save(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!normalizeHabitName(name) || (ruleChanged && rule === 'weekdays' && !isValidWeekdays(weekdays))) return;
    setBusy(true);
    const result = await backend.command('habit.update', { habitId: habit.id, name, rule, weekdays: rule === 'weekdays' ? weekdays : undefined });
    setBusy(false);
    if (!result.ok) return setError(true);
    navigate(detail, { replace: true });
  }

  async function archive() {
    setBusy(true);
    const result = await backend.command('habit.archive', { habitId: habit.id });
    setBusy(false);
    if (!result.ok) return setError(true);
    navigate('/', { replace: true });
  }

  return (
    <section>
      <ScreenHeader title={t.editTitle} back={detail} />
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      <form className="stack form" onSubmit={(e) => void save(e)} noValidate>
        <Field label={t.name} value={name} maxLength={NAME_MAX_LENGTH} error={nameError} onChange={(e) => setName(e.target.value)} />
        <ChoiceGroup legend={t.when} name="rule" value={rule} choices={ruleChoices} onChange={setRule} />
        {ruleChanged && rule === 'weekdays' && <WeekdayPicker value={weekdays} onChange={setWeekdays} error={daysError} />}
        {ruleChanged && <Notice>{t.ruleChangeWarning}</Notice>}

        <div className="field">
          <span className="field-label">{t.regua}</span>
          <div className="card row tight">
            <span className="grow">
              {describeHabit(habit)}
              <br />
              <span className="muted small">{t.xpPerCompletion(xpFor(habit.difficulty, habit.stars))}</span>
            </span>
            <Link to={detail} className="text-button">
              {strings.regua.shortcut}
            </Link>
          </div>
          <span className="muted small">{t.reguaHint}</span>
        </div>

        <Button type="submit" className="wide" disabled={busy}>
          {t.saveEdit}
        </Button>
      </form>

      <div className="stack section-title">
        <Button variant="secondary" className="wide" disabled={busy} onClick={() => void archive()}>
          {t.archive}
        </Button>
        <Button variant="secondary-danger" className="wide" onClick={() => setConfirming(true)}>
          {t.delete}
        </Button>
      </div>
      <DeleteHabitDialog habit={habit} open={confirming} onClose={() => setConfirming(false)} />
    </section>
  );
}
