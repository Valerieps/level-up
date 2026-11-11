import { useState, type FormEvent } from 'react';
import { DIFFICULTIES, isValidWeekdays, MAX_DAILY_GOAL, NAME_MAX_LENGTH, normalizeHabitName, RULES, WORK_WEEK, type Difficulty, type Rule } from '../../domain/habits/habit';
import { xpFor } from '../../domain/habits/progression';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { ChoiceGroup, WeekdayPicker } from '../components/Choices';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { navigate } from '../router';

const t = strings.habit;

interface Draft {
  name: string;
  rule: Rule;
  difficulty: Difficulty;
  dailyGoal: number;
  weekdays: number;
}

/** The examples of the first use fill the form in (docs/spec/telas-e-feedback.md "Hoje"). */
const EXAMPLES: Record<string, Partial<Draft>> = {
  agua: { name: 'Beber 8 copos de água', rule: 'daily', dailyGoal: 8 },
  leitura: { name: 'Ler 30 minutos', rule: 'weekdays', weekdays: WORK_WEEK },
  refrigerante: { name: 'Ficar sem refrigerante', rule: 'free' },
};

function initialDraft(): Draft {
  const example = EXAMPLES[new URLSearchParams(window.location.search).get('exemplo') ?? ''] ?? {};
  return { name: '', rule: 'daily', difficulty: 'easy', dailyGoal: 1, weekdays: WORK_WEEK, ...example };
}

export const ruleChoices = RULES.map((rule) => ({ value: rule, label: t.rule[rule], hint: t.ruleHint[rule] }));

// Cadastro (docs/spec/habitos.md "Cadastro"): name, rule, goal or days, difficulty. Under 30 s.
export function HabitNew() {
  const { backend } = useServices();
  const [draft, setDraft] = useState(initialDraft);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const nameError = touched && !normalizeHabitName(draft.name) ? t.nameMissing : null;
  const daysError = touched && draft.rule === 'weekdays' && !isValidWeekdays(draft.weekdays) ? t.daysMissing : null;

  async function save(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!normalizeHabitName(draft.name) || (draft.rule === 'weekdays' && !isValidWeekdays(draft.weekdays))) return;
    setBusy(true);
    const result = await backend.command('habit.create', {
      name: draft.name,
      rule: draft.rule,
      difficulty: draft.difficulty,
      dailyGoal: draft.rule === 'daily' ? draft.dailyGoal : undefined,
      weekdays: draft.rule === 'weekdays' ? draft.weekdays : undefined,
    });
    setBusy(false);
    if (!result.ok) return setError(true);
    navigate('/', { replace: true });
  }

  return (
    <section>
      <ScreenHeader title={t.newTitle} back="/" />
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      <form className="stack form" onSubmit={(e) => void save(e)} noValidate>
        <Field
          label={t.name}
          placeholder={t.namePlaceholder}
          value={draft.name}
          maxLength={NAME_MAX_LENGTH}
          autoFocus
          error={nameError}
          onChange={(e) => set({ name: e.target.value })}
        />
        <ChoiceGroup legend={t.when} name="rule" value={draft.rule} choices={ruleChoices} onChange={(rule) => set({ rule })} />
        {draft.rule === 'daily' && (
          <Field
            label={t.goal}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DAILY_GOAL}
            value={draft.dailyGoal}
            onChange={(e) => set({ dailyGoal: Math.min(MAX_DAILY_GOAL, Math.max(1, Math.floor(Number(e.target.value) || 1))) })}
          />
        )}
        {draft.rule === 'weekdays' && <WeekdayPicker value={draft.weekdays} onChange={(weekdays) => set({ weekdays })} error={daysError} />}
        <ChoiceGroup
          legend={t.difficulty}
          name="difficulty"
          value={draft.difficulty}
          columns
          choices={DIFFICULTIES.map((d) => ({ value: d, label: t.difficultyName[d], aside: <span className="xp-tag mono">{t.xp(xpFor(d))}</span> }))}
          onChange={(difficulty) => set({ difficulty })}
        />
        <Button type="submit" className="wide" disabled={busy}>
          {t.save}
        </Button>
      </form>
    </section>
  );
}
