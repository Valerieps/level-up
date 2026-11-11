// The single entry to the group's data. The Durable Object calls it; every method is synchronous,
// so a command runs alone and inside one transaction (ADR-004).
import type { ApiResult, CommandName, Commands, QueryName, Queries, Topic } from '../../src/application/api-contract';
import { isGroupTopic } from '../../src/application/topics';
import { failure, QueryError, type CommandResult, type Context, type Notification } from './context';
import {
  archivedHabits,
  archiveHabit,
  createHabit,
  deleteHabit,
  dismissHabitInvitation,
  getHabit,
  markHabit,
  markHabitMinimum,
  reactivateHabit,
  reorderHabits,
  resizeHabit,
  reviewYesterday,
  todayView,
  unmarkHabit,
  updateHabit,
  yesterdayView,
} from './habits';
import { daySheet, habitHeatmap, overallHeatmap } from './heatmap';
import { createInvite, listInvites, revokeInvite } from './invites';
import {
  listMembers,
  me,
  memberForSession,
  removeMember,
  rename,
  setRoles,
  signIn,
  signOut,
  type GoogleProfile,
  type Member,
  type SignInResult,
} from './members';
import { listAchievements } from './mastery';
import { endPause, listPauses, startPause } from './pauses';
import type { Clock, IdGenerator, Sql } from './ports';
import { getProgress } from './progress';
import { migrate } from './schema';
import { createReward, deleteReward, listRedemptions, redeemReward, shopView, updateReward } from './shop';
import { closeDays, getSettings, recordTimeZone, updateSettings } from './settings';

type Input = Record<string, unknown>;

type Handler<T> = (ctx: Context, actor: Member, input: Input) => T;

/** Every query the API answers. A handler returns null when the actor may not see it. */
const QUERIES: { [N in QueryName]: Handler<Queries[N]['output'] | QueryError | null> } = {
  me: (_ctx, actor) => me(actor),
  members: (ctx, actor) => listMembers(ctx, actor),
  invites: (ctx, actor) => listInvites(ctx, actor),
  settings: (ctx, actor) => getSettings(ctx, actor),
  today: (ctx, actor) => todayView(ctx, actor),
  progress: (ctx, actor) => getProgress(ctx, actor),
  yesterday: (ctx, actor) => yesterdayView(ctx, actor),
  habit: getHabit,
  archivedHabits: (ctx, actor) => archivedHabits(ctx, actor),
  pauses: (ctx, actor) => listPauses(ctx, actor),
  achievements: (ctx, actor) => listAchievements(ctx, actor),
  habitHeatmap,
  heatmap: (ctx, actor) => overallHeatmap(ctx, actor),
  daySheet,
  shop: (ctx, actor) => shopView(ctx, actor),
  redemptions: (ctx, actor) => listRedemptions(ctx, actor),
};

/** Every command the API runs; each checks the actor's role itself. */
const COMMANDS: { [N in CommandName]: Handler<CommandResult<Commands[N]['output']>> } = {
  'invite.create': createInvite,
  'invite.revoke': revokeInvite,
  'member.setRoles': setRoles,
  'member.remove': removeMember,
  'member.rename': rename,
  'settings.update': updateSettings,
  'habit.create': createHabit,
  'habit.update': updateHabit,
  'habit.resize': resizeHabit,
  'habit.dismissInvitation': dismissHabitInvitation,
  'habit.archive': archiveHabit,
  'habit.reactivate': reactivateHabit,
  'habit.delete': deleteHabit,
  'habit.reorder': reorderHabits,
  'habit.mark': markHabit,
  'habit.markMinimum': markHabitMinimum,
  'habit.unmark': unmarkHabit,
  'pause.start': startPause,
  'pause.end': endPause,
  'day.reviewYesterday': reviewYesterday,
  'reward.create': createReward,
  'reward.update': updateReward,
  'reward.delete': deleteReward,
  'reward.redeem': redeemReward,
};

/** A command's result plus whom to tell what changed. */
export type CommandOutcome = CommandResult<unknown> & { readonly notify?: readonly Notification[] };

/** Group topics reach every app; a member's own topics reach only that member's apps (ADR-008). */
export function notificationsFor(actorId: string, result: CommandResult<unknown>, extra: readonly Topic[] = []): Notification[] {
  if (!result.ok) return [];
  const changed = [...new Set([...result.changed, ...extra])];
  const group = changed.filter(isGroupTopic);
  const own = changed.filter((t) => !isGroupTopic(t));
  const notifications: Notification[] = [];
  if (group.length > 0) notifications.push({ to: 'all', topics: group });
  if (own.length > 0) notifications.push({ to: { memberId: actorId }, topics: own });
  for (const other of result.changedFor ?? []) notifications.push({ to: { memberId: other.memberId }, topics: other.topics });
  return notifications;
}

export class GroupService {
  private readonly ctx: Context;

  constructor(sql: Sql, clock: Clock, ids: IdGenerator) {
    this.ctx = { sql, clock, ids };
  }

  migrate(): void {
    migrate(this.ctx.sql);
  }

  signIn(profile: GoogleProfile, sessionHash: string, bootstrapAdminEmails: readonly string[]): SignInResult {
    return signIn(this.ctx, profile, sessionHash, bootstrapAdminEmails);
  }

  signOut(sessionHash: string): void {
    signOut(this.ctx, sessionHash);
  }

  memberForSession(sessionHash: string): Member | null {
    return memberForSession(this.ctx, sessionHash);
  }

  query(sessionHash: string, name: string, input: unknown): ApiResult<unknown> {
    const actor = this.memberForSession(sessionHash);
    if (!actor) return failure('unauthenticated');
    const handler = Object.hasOwn(QUERIES, name) ? QUERIES[name as QueryName] : undefined;
    if (!handler) return failure('not_found');
    const value = handler(this.ctx, actor, asInput(input));
    if (value instanceof QueryError) return failure(value.error);
    return value === null ? failure('forbidden') : { ok: true, value };
  }

  /**
   * Runs a command for the session's member. The device's zone travels in every command's body
   * (`timeZone`, ADR-009) and is stored first, in the same transaction.
   */
  command(sessionHash: string, name: string, input: unknown): CommandOutcome {
    const actor = this.memberForSession(sessionHash);
    if (!actor) return failure('unauthenticated');
    const handler = Object.hasOwn(COMMANDS, name) ? COMMANDS[name as CommandName] : undefined;
    if (!handler) return failure('not_found');
    const body = asInput(input);
    return this.ctx.sql.transaction((): CommandOutcome => {
      const zoneChanged = recordTimeZone(this.ctx, actor.id, body.timeZone);
      const result = handler(this.ctx, actor, body);
      if (!result.ok) return result;
      return { ...result, notify: notificationsFor(actor.id, result, zoneChanged ? ['settings', 'day'] : []) };
    });
  }

  /**
   * Runs the time-based jobs that are due (ADR-004: one cron, every few minutes; each job decides
   * whether it is due). Returns whom to tell what changed.
   */
  tick(): Notification[] {
    this.ctx.sql.run('DELETE FROM sessions WHERE expires_at <= ?', this.ctx.clock.now().toISOString());
    return closeDays(this.ctx).map((memberId): Notification => ({ to: { memberId }, topics: ['day'] }));
  }
}

function asInput(input: unknown): Input {
  return typeof input === 'object' && input !== null && !Array.isArray(input) ? (input as Input) : {};
}
