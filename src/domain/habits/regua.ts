// Raising and lowering the bar (docs/spec/regua.md), without stars in phase 1a.
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
