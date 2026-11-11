// Modo Pausa (docs/spec/modo-pausa.md) and the archived stretches of a habit, which freeze it the
// same way (docs/spec/habitos.md "Arquivar e reativar"). Which days a pause covers is computed
// here, on the app and on the server; nothing about a frozen streak is stored (ADR-011).
import { addDays, isDay, type Day } from '../day';

/** A pause of the whole app, or the time a habit spent archived. */
export type PauseKind = 'pause' | 'archive';

export interface PausePeriod {
  /** Null: the whole app. */
  readonly habitId: string | null;
  readonly kind: PauseKind;
  /** The first day covered: the day of the pause. */
  readonly fromDay: Day;
  /** The return date chosen when pausing: the first day back, not covered. Null: no deadline. */
  readonly untilDay: Day | null;
  /** The day of "Voltar" (or of reactivating): still covered, the normal count starts the day after. */
  readonly endedOn: Day | null;
}

/** Whether the period covers `day`. */
export function covers(period: PausePeriod, day: Day): boolean {
  if (day < period.fromDay) return false;
  if (period.untilDay !== null && day >= period.untilDay) return false;
  return period.endedOn === null || day <= period.endedOn;
}

/** Whether the period still runs on `today`: it shows in Hoje and in Configurações. */
export function isActive(period: PausePeriod, today: Day): boolean {
  return period.endedOn === null && covers(period, today);
}

/** Whether `day` is frozen for the habit: an app pause, a pause of the habit or its archived time. */
export function isFrozenOn(periods: readonly PausePeriod[], habitId: string, day: Day): boolean {
  return periods.some((p) => (p.habitId === null || p.habitId === habitId) && covers(p, day));
}

/** A return date must be a real day after today; null means no deadline. */
export function isValidReturnDate(untilDay: unknown, today: Day): untilDay is Day | null {
  return untilDay === null || (isDay(untilDay) && untilDay > today);
}

/** The return date's last covered day, for screens that say "até 14 de nov.". */
export function lastPausedDay(period: PausePeriod): Day | null {
  return period.untilDay === null ? null : addDays(period.untilDay, -1);
}
