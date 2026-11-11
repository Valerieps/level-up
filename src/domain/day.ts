// The member's day (ADR-009, docs/spec/registrar-o-dia.md "Virada do dia"). "Hoje" always comes
// from dayOf, on the app and on the server, so both agree on which day a completion belongs to.

/** A calendar day, as "YYYY-MM-DD". */
export type Day = string;

/** The zone a member starts with, until their device reports its own. */
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

export const MINUTES_PER_DAY = 24 * 60;

/** Midnight: the default day turnover. */
export const DEFAULT_DAY_TURNOVER = 0;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let found = formatters.get(timeZone);
  if (!found) {
    // en-CA formats as YYYY-MM-DD.
    found = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(timeZone, found);
  }
  return found;
}

/** True for an IANA zone name this runtime knows, such as "America/Sao_Paulo". */
export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone.length === 0 || timeZone.length > 64) return false;
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** True for a turnover in whole minutes after midnight, from 0 to 23:59. */
export function isValidDayTurnover(minutes: unknown): minutes is number {
  return Number.isInteger(minutes) && (minutes as number) >= 0 && (minutes as number) < MINUTES_PER_DAY;
}

/**
 * The member's day at `instant`: the calendar day in `timeZone` of the instant moved back by the
 * turnover. With a 4h turnover, 3:00 on the 12th still belongs to the 11th.
 */
export function dayOf(instant: Date, timeZone: string, turnoverMinutes: number): Day {
  return formatter(timeZone).format(new Date(instant.getTime() - turnoverMinutes * 60_000));
}

/** The day `count` days after `day` (before, when negative). */
export function addDays(day: Day, count: number): Day {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** The device's zone, or the default when the runtime does not say. */
export function deviceTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(zone) ? zone : DEFAULT_TIME_ZONE;
}

const longDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

/** The day as people say it: "quarta-feira, 11 de novembro". */
export function formatDayLong(day: Day): string {
  return longDate.format(new Date(`${day}T12:00:00Z`));
}

/** True for a real calendar day written as "YYYY-MM-DD". */
export function isDay(value: unknown): value is Day {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
}

/** Whole days from `from` to `to`: 1 from one day to the next, negative when `to` comes first. */
export function daysBetween(from: Day, to: Day): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}
