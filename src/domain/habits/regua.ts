// Raising and lowering the bar (docs/spec/regua.md) and the Estrelas de Coragem it earns.
import { MAX_STARS } from './progression';
import { DIFFICULTIES, hasWeekday, MAX_DAILY_GOAL, countWeekdays, WEEK_ORDER, type Difficulty, type HabitShape, type HabitSize } from './habit';

export type ReguaDirection = 'raise' | 'lower';

/** One way to resize a habit, and the size it leads to. */
export type ReguaOption =
  | { readonly kind: 'difficulty'; readonly from: Difficulty; readonly to: Difficulty; readonly size: HabitSize }
  | { readonly kind: 'goal'; readonly from: number; readonly to: number; readonly size: HabitSize }
  | { readonly kind: 'addDay' | 'removeDay'; readonly weekday: number; readonly size: HabitSize };

function sizeOf(habit: HabitShape): HabitSize {
  return { difficulty: habit.difficulty, dailyGoal: habit.dailyGoal, weekdays: habit.weekdays };
}

/**
 * The options that apply to the habit: the next difficulty, one more (or less) of the daily goal,
 * one more (or less) scheduled day. Free habits only change difficulty.
 */
export function reguaOptions(habit: HabitShape, direction: ReguaDirection): ReguaOption[] {
  const step = direction === 'raise' ? 1 : -1;
  const base = sizeOf(habit);
  const options: ReguaOption[] = [];

  const next = DIFFICULTIES[DIFFICULTIES.indexOf(habit.difficulty) + step];
  if (next) options.push({ kind: 'difficulty', from: habit.difficulty, to: next, size: { ...base, difficulty: next } });

  if (habit.rule === 'daily') {
    const goal = habit.dailyGoal + step;
    if (goal >= 1 && goal <= MAX_DAILY_GOAL) options.push({ kind: 'goal', from: habit.dailyGoal, to: goal, size: { ...base, dailyGoal: goal } });
  }

  if (habit.rule === 'weekdays') {
    const days = countWeekdays(habit.weekdays);
    for (const weekday of WEEK_ORDER) {
      const scheduled = hasWeekday(habit.weekdays, weekday);
      if (direction === 'raise' && !scheduled) {
        options.push({ kind: 'addDay', weekday, size: { ...base, weekdays: habit.weekdays | (1 << weekday) } });
      } else if (direction === 'lower' && scheduled && days > 1) {
        options.push({ kind: 'removeDay', weekday, size: { ...base, weekdays: habit.weekdays & ~(1 << weekday) } });
      }
    }
  }
  return options;
}

/**
 * A patamar as a key: difficulty, daily goal and days per week (docs/spec/regua.md). Moving a
 * weekday habit's days without changing how many keeps the patamar.
 */
export function tierKey(rule: HabitShape['rule'], size: HabitSize): string {
  const days = rule === 'daily' ? 7 : rule === 'weekdays' ? countWeekdays(size.weekdays) : 0;
  return `${size.difficulty}:${size.dailyGoal}:${days}`;
}

/** What decides whether raising the bar earns an Estrela de Coragem. */
export interface StarState extends HabitShape {
  readonly stars: number;
  /** Whether the current patamar is mastered. */
  readonly tierMastered: boolean;
  /** Every patamar the habit has had (`tierKey`). */
  readonly tiers: readonly string[];
}

/**
 * Whether resizing to `size` earns a star: a raise offered by the "Subir a régua" sheet, from a
 * mastered patamar, to a patamar the habit never had, below the 5-star cap.
 */
export function earnsStar(habit: StarState, size: HabitSize): boolean {
  if (!habit.tierMastered || habit.stars >= MAX_STARS) return false;
  const key = tierKey(habit.rule, size);
  if (habit.tiers.includes(key)) return false;
  return reguaOptions(habit, 'raise').some((option) => tierKey(habit.rule, option.size) === key);
}
