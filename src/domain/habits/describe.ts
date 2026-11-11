// Habits in plain words: "Fácil · seg, qua, sex" (docs/spec/telas-e-feedback.md "Detalhe").
import { strings } from '../strings';
import { ALL_WEEKDAYS, hasWeekday, WEEK_ORDER, WORK_WEEK, type HabitShape } from './habit';

const t = strings.habit;

/** When the habit happens: "todo dia", "8 por dia", "seg, qua, sex", "livre". */
export function describeRule(habit: HabitShape): string {
  if (habit.rule === 'free') return t.free;
  if (habit.rule === 'daily') return habit.dailyGoal > 1 ? t.perDay(habit.dailyGoal) : t.everyDay;
  if (habit.weekdays === ALL_WEEKDAYS) return t.everyDay;
  if (habit.weekdays === WORK_WEEK) return t.workWeek;
  return WEEK_ORDER.filter((day) => hasWeekday(habit.weekdays, day))
    .map((day) => t.weekdayShort[day])
    .join(', ');
}

/** Difficulty and rule: "Fácil · seg, qua, sex". */
export function describeHabit(habit: HabitShape): string {
  return `${t.difficultyName[habit.difficulty]} · ${describeRule(habit)}`;
}

const shortDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'short' });

/** "2 de out." as people read it on a card. */
export function formatDayShort(day: string): string {
  return shortDate.format(new Date(`${day}T12:00:00Z`));
}
