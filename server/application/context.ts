import type { ApiError, Topic } from '../../src/application/api-contract';
import type { Clock, IdGenerator, Sql } from './ports';

/** What every use case gets: the database, the time and new ids. */
export interface Context {
  readonly sql: Sql;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

/** Topics whose open screens must refetch, on one member's apps or on everyone's (ADR-008). */
export interface Notification {
  readonly to: 'all' | { readonly memberId: string };
  readonly topics: readonly Topic[];
}

/** Topics that changed for a member other than the one who ran the command. */
export interface OtherMemberChange {
  readonly memberId: string;
  readonly topics: readonly Topic[];
}

/**
 * A command's result. On success: the topics it changed (group topics reach every app, the
 * others only the actor's own), the topics it changed for other members, and the members whose
 * live connections must close now because they lost access.
 */
export type CommandResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly changed: readonly Topic[];
      readonly changedFor?: readonly OtherMemberChange[];
      readonly disconnect?: readonly string[];
    }
  | { readonly ok: false; readonly error: ApiError };

export const failure = (error: ApiError) => ({ ok: false, error }) as const;

export function nowIso(ctx: Context): string {
  return ctx.clock.now().toISOString();
}

/** A query's specific failure; returning null from a query still means `forbidden`. */
export class QueryError {
  constructor(readonly error: ApiError) {}
}
