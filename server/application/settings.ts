// The member's day (ADR-009, docs/spec/registrar-o-dia.md "Virada do dia"): when it turns over,
// in which zone, and the last day the server closed for them.
import type { SettingsView } from '../../src/application/api-contract';
import { addDays, dayOf, DEFAULT_DAY_TURNOVER, DEFAULT_TIME_ZONE, isValidDayTurnover, isValidTimeZone, type Day } from '../../src/domain/day';
import { failure, type CommandResult, type Context } from './context';
import type { Member } from './members';

interface SettingsRow {
  member_id: string;
  day_turnover: number;
  time_zone: string;
  last_closed_day: Day | null;
  yesterday_reviewed_on: Day | null;
}

function toView(row: SettingsRow): SettingsView {
  return { dayTurnover: row.day_turnover, timeZone: row.time_zone };
}

/** Gives a member the default settings, once. */
export function ensureSettings(ctx: Context, memberId: string): void {
  ctx.sql.run(
    'INSERT OR IGNORE INTO member_settings (member_id, day_turnover, time_zone) VALUES (?, ?, ?)',
    memberId,
    DEFAULT_DAY_TURNOVER,
    DEFAULT_TIME_ZONE,
  );
}

function row(ctx: Context, memberId: string): SettingsRow {
  ensureSettings(ctx, memberId);
  const [found] = ctx.sql.all<SettingsRow>('SELECT * FROM member_settings WHERE member_id = ?', memberId);
  return found;
}

/** The member's "hoje", from the server's clock and the member's stored zone and turnover. */
export function today(ctx: Context, memberId: string): Day {
  const settings = row(ctx, memberId);
  return dayOf(ctx.clock.now(), settings.time_zone, settings.day_turnover);
}

/** The member's day settings as the server keeps them: zone, turnover and today. */
export function memberDay(ctx: Context, memberId: string): { today: Day; timeZone: string; turnover: number; reviewedOn: Day | null } {
  const settings = row(ctx, memberId);
  return {
    today: dayOf(ctx.clock.now(), settings.time_zone, settings.day_turnover),
    timeZone: settings.time_zone,
    turnover: settings.day_turnover,
    reviewedOn: settings.yesterday_reviewed_on,
  };
}

/** Records that the member closed Revisar ontem on `day`, so it does not open again that day. */
export function recordReview(ctx: Context, memberId: string, day: Day): void {
  ctx.sql.run('UPDATE member_settings SET yesterday_reviewed_on = ? WHERE member_id = ?', day, memberId);
}

export function getSettings(ctx: Context, actor: Member): SettingsView {
  return toView(row(ctx, actor.id));
}

/**
 * Stores the zone the device sent with a command, when valid and different. Returns whether it
 * changed, so the member's other apps refetch their settings.
 */
export function recordTimeZone(ctx: Context, memberId: string, timeZone: unknown): boolean {
  if (!isValidTimeZone(timeZone) || row(ctx, memberId).time_zone === timeZone) return false;
  ctx.sql.run('UPDATE member_settings SET time_zone = ? WHERE member_id = ?', timeZone, memberId);
  return true;
}

/** The member changes when their day ends. Only their own settings: no input names a member. */
export function updateSettings(ctx: Context, actor: Member, input: { dayTurnover?: unknown }): CommandResult<SettingsView> {
  if (input.dayTurnover !== undefined) {
    if (!isValidDayTurnover(input.dayTurnover)) return failure('invalid');
    row(ctx, actor.id);
    ctx.sql.run('UPDATE member_settings SET day_turnover = ? WHERE member_id = ?', input.dayTurnover, actor.id);
  }
  return { ok: true, value: toView(row(ctx, actor.id)), changed: ['settings', 'day'] };
}

/**
 * The day turnover (UC-80), run by the cron for every active member whose yesterday is not closed
 * yet. A member seen for the first time has nothing to close. Returns the members whose day turned.
 * Locking yesterday's completions, streaks, "Faz tempo" and pauses reaching their return date need
 * no write here: they are computed from the member's today (ADR-011). Domínio and the régua
 * invitations (1c) join here.
 */
export function closeDays(ctx: Context): string[] {
  const rows = ctx.sql.all<SettingsRow>(
    `SELECT member_settings.* FROM member_settings
     JOIN members ON members.id = member_settings.member_id WHERE members.active = 1`,
  );
  const turned: string[] = [];
  for (const settings of rows) {
    const yesterday = addDays(dayOf(ctx.clock.now(), settings.time_zone, settings.day_turnover), -1);
    if (settings.last_closed_day !== null && settings.last_closed_day >= yesterday) continue;
    ctx.sql.transaction(() => {
      ctx.sql.run('UPDATE member_settings SET last_closed_day = ? WHERE member_id = ?', yesterday, settings.member_id);
    });
    if (settings.last_closed_day !== null) turned.push(settings.member_id);
  }
  return turned;
}
