// Domínio, Estrelas de Coragem and conquistas on the server (docs/spec/streak-e-dominio.md,
// regua.md, conquistas.md). Called inside the command that caused them, so everything they write
// joins its transaction. Only the actor's own rows (ADR-008).
import type { Celebration, TrackView } from '../../src/application/api-contract';
import type { Day } from '../../src/domain/day';
import { nextMilestone, reachedMilestones, TRACKS, type Track } from '../../src/domain/habits/achievements';
import type { Difficulty } from '../../src/domain/habits/habit';
import type { InvitationKind } from '../../src/domain/habits/invitations';
import { masteryOn, masteryPrize, type MasteryHistory } from '../../src/domain/habits/mastery';
import type { Context } from './context';
import type { Member } from './members';
import { addProgress, bumpTrack, trackCounts } from './progress';

/** What mastering needs to know about the habit. */
export interface MasteryHabit {
  readonly id: string;
  readonly name: string;
  readonly difficulty: Difficulty;
  readonly stars: number;
  readonly tierKey: string;
  readonly tierMastered: boolean;
  readonly automated: boolean;
}

/** The patamares each of the member's habits had, by habit id. */
export function tiersOf(ctx: Context, memberId: string, habitId?: string): Map<string, string[]> {
  const rows = habitId
    ? ctx.sql.all<{ habit_id: string; tier: string }>('SELECT habit_id, tier FROM habit_tiers WHERE habit_id = ? ORDER BY first_on', habitId)
    : ctx.sql.all<{ habit_id: string; tier: string }>(
        'SELECT habit_tiers.habit_id, habit_tiers.tier FROM habit_tiers JOIN habits ON habits.id = habit_tiers.habit_id WHERE habits.member_id = ? ORDER BY habit_tiers.first_on',
        memberId,
      );
  const tiers = new Map<string, string[]>();
  for (const row of rows) tiers.set(row.habit_id, [...(tiers.get(row.habit_id) ?? []), row.tier]);
  return tiers;
}

/** Records that the habit reached a patamar, once. */
export function recordTier(ctx: Context, habitId: string, tierKey: string, day: Day): void {
  ctx.sql.run('INSERT OR IGNORE INTO habit_tiers (habit_id, tier, first_on) VALUES (?, ?, ?)', habitId, tierKey, day);
}

/** The last "Agora não" of each invitation, by habit id. */
export function dismissalsOf(ctx: Context, memberId: string): Map<string, Partial<Record<InvitationKind, Day>>> {
  const rows = ctx.sql.all<{ habit_id: string; kind: InvitationKind; dismissed_on: Day }>(
    'SELECT invitations.* FROM invitations JOIN habits ON habits.id = invitations.habit_id WHERE habits.member_id = ?',
    memberId,
  );
  const dismissals = new Map<string, Partial<Record<InvitationKind, Day>>>();
  for (const row of rows) dismissals.set(row.habit_id, { ...dismissals.get(row.habit_id), [row.kind]: row.dismissed_on });
  return dismissals;
}

export function dismissInvitation(ctx: Context, habitId: string, kind: InvitationKind, day: Day): void {
  ctx.sql.run(
    'INSERT INTO invitations (habit_id, kind, dismissed_on) VALUES (?, ?, ?) ON CONFLICT (habit_id, kind) DO UPDATE SET dismissed_on = excluded.dismissed_on',
    habitId,
    kind,
    day,
  );
}

function addMarker(ctx: Context, memberId: string, habitId: string, day: Day, kind: 'mastered' | 'raised'): void {
  ctx.sql.run('INSERT INTO milestones (member_id, habit_id, day, kind) VALUES (?, ?, ?, ?)', memberId, habitId, day, kind);
}

/** Records the milestones a track count reached and pays their gold, each once. */
function reachAchievements(ctx: Context, memberId: string, track: Track, count: number, day: Day): Celebration[] {
  const celebrations: Celebration[] = [];
  for (const milestone of reachedMilestones(track, count)) {
    const [had] = ctx.sql.all('SELECT 1 FROM achievements WHERE member_id = ? AND track = ? AND milestone = ?', memberId, track, milestone.milestone);
    if (had) continue;
    ctx.sql.run(
      'INSERT INTO achievements (member_id, track, milestone, reached_on, gold) VALUES (?, ?, ?, ?, ?)',
      memberId,
      track,
      milestone.milestone,
      day,
      milestone.gold,
    );
    addProgress(ctx, memberId, 0, milestone.gold);
    celebrations.push({ kind: 'achievement', track, milestone: milestone.milestone, gold: milestone.gold });
  }
  return celebrations;
}

/**
 * After a completion: when the window reaches mastery of a patamar not mastered yet, records it,
 * gives the selo, pays the Prêmio de Domínio (once per patamar) and the Automatizados milestones.
 * Undoing a completion later takes none of it back.
 */
export function checkMastery(ctx: Context, actor: Member, habit: MasteryHabit, history: MasteryHistory, today: Day): Celebration[] {
  if (habit.tierMastered || !masteryOn(history, today).reached) return [];
  ctx.sql.run('UPDATE habits SET tier_mastered_on = ? WHERE id = ?', today, habit.id);
  const [tier] = ctx.sql.all<{ mastered_on: Day | null }>('SELECT mastered_on FROM habit_tiers WHERE habit_id = ? AND tier = ?', habit.id, habit.tierKey);
  // Back on a patamar mastered before: the invitation to raise returns, the prize does not.
  if (tier && tier.mastered_on !== null) return [];
  if (tier) ctx.sql.run('UPDATE habit_tiers SET mastered_on = ? WHERE habit_id = ? AND tier = ?', today, habit.id, habit.tierKey);
  else ctx.sql.run('INSERT INTO habit_tiers (habit_id, tier, first_on, mastered_on) VALUES (?, ?, ?, ?)', habit.id, habit.tierKey, today, today);
  addMarker(ctx, actor.id, habit.id, today, 'mastered');

  const gold = masteryPrize(habit.difficulty, habit.stars);
  addProgress(ctx, actor.id, 0, gold);
  const celebrations: Celebration[] = [{ kind: 'mastered', habitId: habit.id, habitName: habit.name, gold, firstTime: !habit.automated }];
  if (!habit.automated) {
    ctx.sql.run('UPDATE habits SET automated_on = ? WHERE id = ?', today, habit.id);
    celebrations.push(...reachAchievements(ctx, actor.id, 'automated', bumpTrack(ctx, actor.id, 'automated_count'), today));
  }
  return celebrations;
}

/** An Estrela de Coragem earned raising the bar: the star, the marker and the Coragem milestones. */
export function giveStar(ctx: Context, actor: Member, habitId: string, today: Day): Celebration[] {
  ctx.sql.run('UPDATE habits SET stars = stars + 1 WHERE id = ?', habitId);
  addMarker(ctx, actor.id, habitId, today, 'raised');
  return reachAchievements(ctx, actor.id, 'courage', bumpTrack(ctx, actor.id, 'courage_total'), today);
}

export function listAchievements(ctx: Context, actor: Member): TrackView[] {
  const counts = trackCounts(ctx, actor.id);
  const rows = ctx.sql.all<{ track: Track; milestone: number; reached_on: Day; gold: number }>(
    'SELECT track, milestone, reached_on, gold FROM achievements WHERE member_id = ? ORDER BY milestone',
    actor.id,
  );
  return TRACKS.map((track) => {
    const count = track === 'automated' ? counts.automated : counts.courage;
    return {
      track,
      count,
      reached: rows.filter((r) => r.track === track).map((r) => ({ milestone: r.milestone, reachedOn: r.reached_on, gold: r.gold })),
      next: nextMilestone(track, count),
    };
  });
}
