// The contract between the app and the server: query and command names, inputs and outputs.
// Types only. The server imports it with `import type`, so nothing here runs on either side.
import type { Day } from '../domain/day';
import type { Role } from '../domain/group/roles';
import type { Consistency } from '../domain/habits/consistency';
import type { Milestone, Track } from '../domain/habits/achievements';
import type { DayEntry } from '../domain/habits/day-log';
import type { OverallLevel } from '../domain/habits/heatmap';
import type { InvitationKind } from '../domain/habits/invitations';
import type { Difficulty, HabitState, Rule } from '../domain/habits/habit';

export interface MemberView {
  readonly id: string;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly roles: readonly Role[];
}

/** A row of the members screen: the e-mail only reaches admins. */
export interface MemberListItem extends MemberView {
  readonly email?: string;
}

export interface MeView extends MemberView {
  readonly email: string;
}

export type InviteState = 'pending' | 'accepted' | 'revoked';

export interface InviteView {
  readonly email: string;
  readonly state: InviteState;
  readonly invitedByName: string;
  readonly createdAt: string;
  readonly acceptedAt: string | null;
}

/** The member's day settings (ADR-009). The app computes "hoje" from them with `dayOf`. */
export interface SettingsView {
  /** Minutes after midnight when the member's day ends; 0 is midnight. */
  readonly dayTurnover: number;
  /** The IANA zone the server last heard from the member's device. */
  readonly timeZone: string;
}

export interface HabitView {
  readonly id: string;
  readonly name: string;
  readonly rule: Rule;
  readonly difficulty: Difficulty;
  /** Times per day; above 1 only for daily habits. */
  readonly dailyGoal: number;
  /** Weekday mask (bit 0 is Sunday); only for weekday habits. */
  readonly weekdays: number;
  readonly stars: number;
  readonly state: HabitState;
  readonly archivedOn: Day | null;
  /** The versão mínima's text; always null for free habits. */
  readonly minimum: string | null;
  /** A running pause of the app or of the habit: Hoje shows it at the end, as optional. */
  readonly paused: boolean;
  /** Streak, or Ritmo, Última vez and "Faz tempo", on the member's today. */
  readonly consistency: Consistency;
  /** The selo Automatizado: the habit mastered some patamar once. Permanent. */
  readonly automated: boolean;
  /** Whether the current patamar is mastered: "Subir a régua" may earn a star (`earnsStar`). */
  readonly tierMastered: boolean;
  /** The mastery window now: occurrences (or completions, for free habits) counted and needed. */
  readonly mastery: { readonly done: number; readonly needed: number };
  /** Every patamar the habit has had (`tierKey`), for `earnsStar`. */
  readonly tiers: readonly string[];
  /** The régua invitation the detail shows now; Hoje shows only an icon for `raise`. */
  readonly invitation: InvitationKind | null;
}

/**
 * A moment a command returns for the celebration layer (docs/spec/telas-e-feedback.md). Not
 * stored. Commands list them smallest first; a level passed comes apart, in `levelUp`.
 */
export type Celebration =
  /** A patamar mastered: the selo Automatizado (`firstTime` when the habit had none) and the prize. */
  | { readonly kind: 'mastered'; readonly habitId: string; readonly habitName: string; readonly gold: number; readonly firstTime: boolean }
  /** A milestone of a conquista track, with its prize. */
  | { readonly kind: 'achievement'; readonly track: Track; readonly milestone: number; readonly gold: number };

/** One conquista track on the Perfil. */
export interface TrackView {
  readonly track: Track;
  /** Habits ever automated, or the Total de Coragem. Only grows. */
  readonly count: number;
  readonly reached: readonly { readonly milestone: number; readonly reachedOn: Day; readonly gold: number }[];
  /** The next milestone and its prize; null when the track is complete. */
  readonly next: Milestone | null;
}

/** A pause still running: of the whole app (habitId null) or of one habit. */
export interface PauseView {
  readonly id: string;
  readonly habitId: string | null;
  readonly habitName: string | null;
  readonly fromDay: Day;
  /** The first day back; null when the pause has no deadline. */
  readonly untilDay: Day | null;
}

/** The pauses running today (Configurações, the Hoje banner and the pause button). */
export interface PausesView {
  readonly app: PauseView | null;
  readonly habits: readonly PauseView[];
}

/** Hoje: every active habit, in the member's order, with what was done on the member's day. */
export interface TodayView {
  readonly day: Day;
  readonly habits: readonly { readonly habit: HabitView; readonly entry: DayEntry }[];
}

/**
 * Revisar ontem: the habits that could have been done yesterday and were not. Empty when there is
 * nothing to review or the member already closed the review today.
 */
export interface YesterdayView {
  readonly day: Day;
  readonly habits: readonly { readonly habit: HabitView; readonly entry: DayEntry }[];
}

/** What closing Revisar ontem earned. */
export interface ReviewResult {
  readonly xp: number;
  readonly gold: number;
  /** The new level when the review passed one. */
  readonly levelUp: number | null;
  readonly celebrations: readonly Celebration[];
}

/** XP, gold and level (docs/spec/progressao.md). */
export interface ProgressView {
  readonly xpTotal: number;
  readonly gold: number;
  readonly level: number;
  readonly xpInLevel: number;
  readonly xpForNext: number;
}

/** What a tap on the marker did, for the feedback on screen. */
export interface MarkResult {
  readonly entry: DayEntry;
  /** The new level when this completion passed one. */
  readonly levelUp: number | null;
  /** Mastery and conquistas this completion reached, smallest first. */
  readonly celebrations: readonly Celebration[];
}

/** What a régua change did: the habit, whether it earned a star and the conquistas it reached. */
export interface ResizeResult {
  readonly habit: HabitView;
  readonly star: boolean;
  readonly celebrations: readonly Celebration[];
}

/** A heatmap marker: the day the habit mastered a patamar, or earned a star raising the bar. */
export type HeatmapMarker = 'mastered' | 'raised';

/**
 * One habit's heatmap over the last 12 months (`heatmapRange`). Only days with something to show
 * are listed; every other day is the neutral cell, with no sign of failure.
 */
export interface HabitHeatmapView {
  readonly from: Day;
  readonly to: Day;
  readonly days: readonly {
    readonly day: Day;
    /** 1 when done; the part of the goal reached, below 1; 0 for a day with only a marker. */
    readonly fraction: number;
    /** Done with the versão mínima: a lighter tone, still a done day. */
    readonly minimum: boolean;
    readonly markers: readonly HeatmapMarker[];
  }[];
}

/** The Perfil's heatmap: completions per day, archived habits included, deleted ones not. */
export interface OverallHeatmapView {
  readonly from: Day;
  readonly to: Day;
  /** Days with at least one completion. */
  readonly days: readonly { readonly day: Day; readonly completions: number; readonly level: OverallLevel }[];
}

/** The folha do dia: what was done that day and its milestones. */
export interface DaySheetView {
  readonly day: Day;
  /** Habits done that day, or with part of the goal reached, in the member's order. */
  readonly habits: readonly {
    readonly habitId: string;
    readonly habitName: string;
    readonly done: boolean;
    readonly minimum: boolean;
    readonly count: number;
    /** The habit's current goal; above 1 only for daily habits with a goal. */
    readonly dailyGoal: number;
  }[];
  readonly markers: readonly { readonly habitId: string; readonly habitName: string; readonly kind: HeatmapMarker }[];
  readonly achievements: readonly { readonly track: Track; readonly milestone: number; readonly gold: number }[];
}

export interface RewardView {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
}

/** A redemption, with the name and cost the reward had then. */
export interface RedemptionView {
  readonly id: string;
  readonly rewardId: string;
  readonly name: string;
  readonly cost: number;
  /** The member's day when it was redeemed. */
  readonly day: Day;
}

/** The Loja: the rewards, cheapest first, and the latest redemptions. */
export interface ShopView {
  readonly rewards: readonly RewardView[];
  /** The latest redemptions, newest first (`RECENT_REDEMPTIONS`). */
  readonly recent: readonly RedemptionView[];
  /** All redemptions ever: "Ver tudo" shows when it is above `recent.length`. */
  readonly redemptionCount: number;
}

export interface RewardInput {
  name: string;
  cost: number;
}

export interface NewHabitInput {
  name: string;
  rule: Rule;
  difficulty: Difficulty;
  dailyGoal?: number;
  weekdays?: number;
  /** Daily and weekday habits only; empty means none. */
  minimum?: string | null;
}

/** Reads: `POST /api/query/<name>`. They never change anything. */
export interface Queries {
  me: { input: Record<string, never>; output: MeView };
  members: { input: Record<string, never>; output: MemberListItem[] };
  /** Admins only. */
  invites: { input: Record<string, never>; output: InviteView[] };
  settings: { input: Record<string, never>; output: SettingsView };
  today: { input: Record<string, never>; output: TodayView };
  progress: { input: Record<string, never>; output: ProgressView };
  yesterday: { input: Record<string, never>; output: YesterdayView };
  /** One of the member's habits, active or archived. */
  habit: { input: { habitId: string }; output: HabitView };
  archivedHabits: { input: Record<string, never>; output: HabitView[] };
  pauses: { input: Record<string, never>; output: PausesView };
  /** The two conquista tracks: Automatizados, then Coragem. */
  achievements: { input: Record<string, never>; output: TrackView[] };
  /** One habit's heatmap, active or archived. */
  habitHeatmap: { input: { habitId: string }; output: HabitHeatmapView };
  /** The Perfil's heatmap. */
  heatmap: { input: Record<string, never>; output: OverallHeatmapView };
  /** The folha do dia, for any day up to today. */
  daySheet: { input: { day: Day }; output: DaySheetView };
  shop: { input: Record<string, never>; output: ShopView };
  /** "Ver tudo": every redemption, newest first. */
  redemptions: { input: Record<string, never>; output: RedemptionView[] };
}

/**
 * Writes: `POST /api/command/<name>`. Each runs alone, in one transaction. The app adds the
 * device's `timeZone` to every command's body (ADR-009); the server stores it on the member.
 */
export interface Commands {
  'invite.create': { input: { email: string }; output: InviteView };
  'invite.revoke': { input: { email: string }; output: null };
  'member.setRoles': { input: { memberId: string; roles: Role[] }; output: MemberView };
  /** Admins; never oneself, so the last admin stays. */
  'member.remove': { input: { memberId: string }; output: null };
  'member.rename': { input: { name: string }; output: MeView };
  /** Every field is optional; an empty input only records the device's zone. */
  'settings.update': { input: { dayTurnover?: number }; output: SettingsView };
  'habit.create': { input: NewHabitInput; output: HabitView };
  /**
   * Name, versão mínima and time rule. Changing to weekdays needs the days; size changes go through
   * the régua. A new rule restarts the streak; a free habit loses its versão mínima. Leaving
   * `minimum` out keeps it.
   */
  'habit.update': { input: { habitId: string; name: string; rule: Rule; weekdays?: number; minimum?: string | null }; output: HabitView };
  /**
   * Subir, baixar or ajustar a régua: the new size. A raise from a mastered patamar to a new one
   * earns an Estrela de Coragem (`earnsStar`); the mastery window restarts.
   */
  'habit.resize': { input: { habitId: string; difficulty: Difficulty; dailyGoal: number; weekdays: number }; output: ResizeResult };
  /** "Agora não" on a régua invitation. */
  'habit.dismissInvitation': { input: { habitId: string; kind: InvitationKind }; output: HabitView };
  'habit.archive': { input: { habitId: string }; output: HabitView };
  'habit.reactivate': { input: { habitId: string }; output: HabitView };
  /** Deletes the habit and its history; XP and gold already earned stay. */
  'habit.delete': { input: { habitId: string }; output: null };
  /**
   * The drag in Hoje: active habits in their new order. They swap among the places they already
   * take; every other habit keeps its place.
   */
  'habit.reorder': { input: { habitIds: string[] }; output: null };
  /** One tap on the marker, on the member's today. */
  'habit.mark': { input: { habitId: string }; output: MarkResult };
  /** The long press: the versão mínima completes today at once. */
  'habit.markMinimum': { input: { habitId: string }; output: MarkResult };
  /** Undoes today's completion, giving back exactly what it earned. */
  'habit.unmark': { input: { habitId: string }; output: null };
  /**
   * Pauses the whole app (no habitId) or one active habit, from today. `untilDay` is the first day
   * back (after today); null or absent means no deadline. One running pause per target.
   */
  'pause.start': { input: { habitId?: string; untilDay?: Day | null }; output: PauseView };
  /** "Voltar": today is still covered; the normal count starts tomorrow. */
  'pause.end': { input: { pauseId: string }; output: null };
  /** Closes Revisar ontem, completing yesterday the habits chosen there (none is fine). Once a day. */
  'day.reviewYesterday': { input: { habitIds: string[] }; output: ReviewResult };
  'reward.create': { input: RewardInput; output: RewardView };
  'reward.update': { input: RewardInput & { rewardId: string }; output: RewardView };
  /** Redemptions already made keep their name and cost. */
  'reward.delete': { input: { rewardId: string }; output: null };
  /** Debits the cost when the balance covers it (`conflict` when it does not); reusable. */
  'reward.redeem': { input: { rewardId: string }; output: { readonly redemption: RedemptionView; readonly gold: number } };
}

export type QueryName = keyof Queries;
export type CommandName = keyof Commands;

/**
 * What a live message says changed; the screens that show it refetch. A change to a member's own
 * data reaches only that member's apps (ADR-008). `day` means the member's day turned over.
 */
export type Topic = 'me' | 'members' | 'invites' | 'settings' | 'day' | 'habits' | 'progress' | 'pauses' | 'achievements' | 'shop';

export interface LiveMessage {
  readonly type: 'changed';
  readonly topics: readonly Topic[];
}

export type ApiError = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'conflict' | 'last_admin' | 'unavailable';

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError };
