import { useEffect, useState } from 'react';
import type { Celebration, HabitView, ResizeResult } from '../../application/api-contract';
import { countWeekdays } from '../../domain/habits/habit';
import { MAX_STARS, starBonusPercent, xpFor } from '../../domain/habits/progression';
import { earnsStar, reguaOptions, type ReguaDirection, type ReguaOption } from '../../domain/habits/regua';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { ChoiceGroup } from '../components/Choices';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { Sheet } from '../components/Sheet';
import { feedback } from '../feedback/feedback';
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
 * with the XP now and after. A raise from a mastered patamar says which options earn an Estrela de
 * Coragem and confirms the star in the sheet itself; the conquistas it reached go to `onCelebrate`
 * once the member closes the sheet.
 */
export function ReguaSheet({
  habit,
  direction,
  onClose,
  onChanged,
  onCelebrate,
}: {
  habit: HabitView;
  direction: ReguaDirection | null;
  onClose: () => void;
  onChanged: (result: ResizeResult) => void;
  onCelebrate?: (celebrations: readonly Celebration[]) => void;
}) {
  const { backend } = useServices();
  const options = direction ? reguaOptions(habit, direction) : [];
  const [chosen, setChosen] = useState<string>('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [starred, setStarred] = useState<ResizeResult | null>(null);
  const raise = direction === 'raise';
  const option = options[Number(chosen)] ?? options[0];
  const xpNow = xpFor(habit.difficulty, habit.stars);
  const stars = options.map((o) => raise && earnsStar(habit, o.size));

  function close() {
    const celebrations = starred?.celebrations ?? [];
    setChosen('0');
    setError(false);
    setStarred(null);
    onClose();
    if (celebrations.length > 0) onCelebrate?.(celebrations);
  }

  async function confirm() {
    if (!option) return;
    setBusy(true);
    const result = await backend.command('habit.resize', { habitId: habit.id, ...option.size });
    setBusy(false);
    if (!result.ok) return setError(true);
    onChanged(result.value);
    if (result.value.star) setStarred(result.value);
    else close();
  }

  if (starred) {
    const count = starred.habit.stars;
    return (
      <Sheet open={direction !== null} title={r.starTitle} onClose={close}>
        <StarLighting count={count} xp={xpFor(starred.habit.difficulty, count)} />
        <p role="status">{r.starText(habit.name, count, starBonusPercent(count))}</p>
        <Button className="wide" onClick={close}>
          {r.starContinue}
        </Button>
      </Sheet>
    );
  }

  return (
    <Sheet open={direction !== null} title={raise ? r.raise : r.lower} onClose={close}>
      <p className="muted">{habit.name}</p>
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      {options.length === 0 ? (
        <p>{raise ? r.raiseNone : r.lowerNone}</p>
      ) : (
        <>
          <p>{stars.some(Boolean) ? r.raiseIntroMastered(habit.name) : raise ? r.raiseIntro : r.lowerIntro}</p>
          <ChoiceGroup
            legend={raise ? r.raise : r.lower}
            name="regua"
            value={String(options.indexOf(option))}
            choices={options.map((o, i) => {
              const text = optionText(habit, o, raise);
              const xpNext = xpFor(o.size.difficulty, habit.stars + (stars[i] ? 1 : 0));
              return {
                value: String(i),
                label: text.label,
                hint: stars[i] ? (
                  <>
                    {text.hint}
                    <span className="star-tag">
                      <Icon name="star" />
                      {r.earnsStar}
                    </span>
                  </>
                ) : (
                  text.hint
                ),
                aside: <span className="xp-tag mono">{r.xpChange(xpNow, xpNext)}</span>,
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

/**
 * The new star on the confirmation: the dim star beside the new XP lights up and flies to the
 * habit's row of stars, where it stays lit (docs/spec/telas-e-feedback.md "Estrela de Coragem").
 */
function StarLighting({ count, xp }: { count: number; xp: number }) {
  useEffect(() => feedback('medium'), []);
  return (
    <div className="star-lighting">
      <Stars count={count} arriving />
      <span className="star-light" aria-hidden="true">
        <span className="star">
          <Icon name="star" />
        </span>
        <span className="mono">{r.starXp(xp)}</span>
      </span>
    </div>
  );
}

/** The habit's Estrelas de Coragem out of 5, filled ones first; the text next to them names them. */
export function Stars({ count, arriving = false }: { count: number; arriving?: boolean }) {
  return (
    <span className="stars" aria-hidden="true">
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <span key={i} className={i < count ? (arriving && i === count - 1 ? 'star filled arriving' : 'star filled') : 'star'}>
          <Icon name="star" />
        </span>
      ))}
    </span>
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
