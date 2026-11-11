import { useId, useState, type FormEvent } from 'react';
import { DIFFICULTIES, isValidWeekdays, MAX_DAILY_GOAL, MINIMUM_MAX_LENGTH, NAME_MAX_LENGTH, normalizeHabitName, RULES, WORK_WEEK, type Difficulty, type Rule } from '../../domain/habits/habit';
import { xpFor } from '../../domain/habits/progression';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { ChoiceGroup, WeekdayPicker } from '../components/Choices';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
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
  minimum: string;
}

/** The examples of the first use fill the form in (docs/spec/telas-e-feedback.md "Hoje"). */
const EXAMPLES: Record<string, Partial<Draft>> = {
  agua: { name: 'Beber 8 copos de água', rule: 'daily', dailyGoal: 8 },
  leitura: { name: 'Ler 30 minutos', rule: 'weekdays', weekdays: WORK_WEEK },
  refrigerante: { name: 'Ficar sem refrigerante', rule: 'free' },
};

function initialDraft(): Draft {
  const example = EXAMPLES[new URLSearchParams(window.location.search).get('exemplo') ?? ''] ?? {};
  return { name: '', rule: 'daily', difficulty: 'easy', dailyGoal: 1, weekdays: WORK_WEEK, minimum: '', ...example };
}

export const ruleChoices = RULES.map((rule) => ({ value: rule, label: t.rule[rule], hint: t.ruleHint[rule] }));

/**
 * The versão mínima (docs/spec/habitos.md "Versão mínima"): optional, so it starts collapsed unless
 * the habit has one. Free habits have none, so the form hides it for them.
 */
export function MinimumField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(value !== '');
  const panelId = useId();
  const hintId = useId();
  return (
    <div className="field">
      <button type="button" className="text-button disclosure" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        {t.minimumOptional}
        <span className={open ? 'chevron open' : 'chevron'}>
          <Icon name="chevron" />
        </span>
      </button>
      <div id={panelId} className="stack-tight" hidden={!open}>
        <Field
          label={t.minimum}
          placeholder={t.minimumPlaceholder}
          value={value}
          maxLength={MINIMUM_MAX_LENGTH}
          aria-describedby={hintId}
          onChange={(e) => onChange(e.target.value)}
        />
        <span id={hintId} className="muted small">
          {t.minimumHint}
        </span>
      </div>
    </div>
  );
}

// Cadastro (docs/spec/habitos.md "Cadastro"): name, rule, goal or days, difficulty and the versão
// mínima, collapsed. Under 30 s.
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
      minimum: draft.rule === 'free' ? null : draft.minimum,
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
        {draft.rule !== 'free' && <MinimumField value={draft.minimum} onChange={(minimum) => set({ minimum })} />}
        <Button type="submit" className="wide" disabled={busy}>
          {t.save}
        </Button>
      </form>
    </section>
  );
}
