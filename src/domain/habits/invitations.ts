// The régua invitations (docs/spec/regua.md): subir a régua when the patamar is mastered, ajustar a
// régua when a habit weighs too much. Computed on every read from the history and the last
// dismissal; only the dismissal is stored.
import { addDays, type Day } from '../day';
import type { HabitHistory } from './consistency';
import { isScheduledOn } from './habit';
import { recentOccurrences } from './mastery';

export type InvitationKind = 'raise' | 'adjust';

export const INVITATION_KINDS: readonly InvitationKind[] = ['raise', 'adjust'];

/** A dismissed raise invitation comes back after this many more scheduled days (or completions). */
export const RAISE_RETURN = 14;
/** The adjust invitation looks at the last 8 scheduled occurrences … */
export const ADJUST_WINDOW = 8;
/** … and shows when fewer than half of them were done. */
export const ADJUST_DONE_BELOW = 0.5;
/** Only for habits at least 4 weeks old. */
export const ADJUST_MIN_AGE_DAYS = 28;
/** Never during a pause nor in the 7 days after it. */
export const ADJUST_PAUSE_QUIET_DAYS = 7;
/** A dismissed adjust invitation comes back after 4 weeks. */
export const ADJUST_RETURN_DAYS = 28;

export interface InvitationInput {
  readonly history: HabitHistory;
  /** The day the habit was created, on the member's calendar. */
  readonly createdOn: Day;
  /** Whether the current patamar is mastered. */
  readonly tierMastered: boolean;
  /** Whether "Subir a régua" has any option for the habit. */
  readonly canRaise: boolean;
  /** Whether a pause (of the app or of the habit, not an archived stretch) covers `day`. */
  readonly isPausedOn: (day: Day) => boolean;
  /** The last "Agora não" of each kind, if any. */
  readonly dismissedOn: Readonly<Partial<Record<InvitationKind, Day>>>;
}

/** Scheduled, not frozen days after `from` up to today; for free habits, completions. */
function progressSince(history: HabitHistory, from: Day, today: Day): number {
  let count = 0;
  for (let day = addDays(from, 1); day <= today; day = addDays(day, 1)) {
    if (history.shape.rule === 'free') {
      if (history.doneDays.has(day)) count++;
    } else if (isScheduledOn(history.shape, day) && (!history.isFrozen(day) || history.doneDays.has(day))) count++;
  }
  return count;
}

function raiseInvitation(input: InvitationInput, today: Day): boolean {
  if (!input.tierMastered || !input.canRaise) return false;
  const dismissed = input.dismissedOn.raise;
  // A dismissal from an earlier patamar does not hold back the new one's invitation.
  if (dismissed === undefined || dismissed < input.history.windowStart) return true;
  return progressSince(input.history, dismissed, today) >= RAISE_RETURN;
}

function adjustInvitation(input: InvitationInput, today: Day): boolean {
  const { history } = input;
  if (history.shape.rule === 'free') return false;
  if (addDays(input.createdOn, ADJUST_MIN_AGE_DAYS) > today) return false;
  const dismissed = input.dismissedOn.adjust;
  if (dismissed !== undefined && addDays(dismissed, ADJUST_RETURN_DAYS) > today) return false;
  for (let back = 0; back <= ADJUST_PAUSE_QUIET_DAYS; back++) if (input.isPausedOn(addDays(today, -back))) return false;
  const occurrences = recentOccurrences(history, today, ADJUST_WINDOW);
  if (occurrences.length < ADJUST_WINDOW) return false;
  const done = occurrences.filter((day) => history.doneDays.has(day)).length;
  return done < ADJUST_WINDOW * ADJUST_DONE_BELOW;
}

/** The one invitation the habit's detail shows now: with the patamar mastered, only the raise. */
export function invitationOn(input: InvitationInput, today: Day): InvitationKind | null {
  if (input.tierMastered) return raiseInvitation(input, today) ? 'raise' : null;
  return adjustInvitation(input, today) ? 'adjust' : null;
}
