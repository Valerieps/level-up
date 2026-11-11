// The contract between the app and the server: query and command names, inputs and outputs.
// Types only. The server imports it with `import type`, so nothing here runs on either side.
import type { Role } from '../domain/group/roles';

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

/** Reads: `POST /api/query/<name>`. They never change anything. */
export interface Queries {
  me: { input: Record<string, never>; output: MeView };
  members: { input: Record<string, never>; output: MemberListItem[] };
  /** Admins only. */
  invites: { input: Record<string, never>; output: InviteView[] };
  settings: { input: Record<string, never>; output: SettingsView };
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
}

export type QueryName = keyof Queries;
export type CommandName = keyof Commands;

/**
 * What a live message says changed; the screens that show it refetch. A change to a member's own
 * data reaches only that member's apps (ADR-008). `day` means the member's day turned over.
 */
export type Topic = 'me' | 'members' | 'invites' | 'settings' | 'day';

export interface LiveMessage {
  readonly type: 'changed';
  readonly topics: readonly Topic[];
}

export type ApiError = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'conflict' | 'last_admin' | 'unavailable';

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError };
