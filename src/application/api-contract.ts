// The contract between the app and the server: query and command names, inputs and outputs.
// Types only. The server imports it with `import type`, so nothing here runs on either side.
import type { Day } from '../domain/day';
import type { Role } from '../domain/group/roles';
import type { Consistency } from '../domain/habits/consistency';
import type { DayEntry } from '../domain/habits/day-log';
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
  /** Subir or baixar a régua: the new size. */
  'habit.resize': { input: { habitId: string; difficulty: Difficulty; dailyGoal: number; weekdays: number }; output: HabitView };
  'habit.archive': { input: { habitId: string }; output: HabitView };
  'habit.reactivate': { input: { habitId: string }; output: HabitView };
  /** Deletes the habit and its history; XP and gold already earned stay. */
  'habit.delete': { input: { habitId: string }; output: null };
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
}

export type QueryName = keyof Queries;
export type CommandName = keyof Commands;

/**
 * What a live message says changed; the screens that show it refetch. A change to a member's own
 * data reaches only that member's apps (ADR-008). `day` means the member's day turned over.
 */
export type Topic = 'me' | 'members' | 'invites' | 'settings' | 'day' | 'habits' | 'progress' | 'pauses';

export interface LiveMessage {
  readonly type: 'changed';
  readonly topics: readonly Topic[];
}

export type ApiError = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'conflict' | 'last_admin' | 'unavailable';

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError };
