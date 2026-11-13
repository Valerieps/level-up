// The member's feedback switches (docs/spec/telas-e-feedback.md "Movimento, vibração e som"):
// vibration and sound. Per account, like the theme, and private: no input names a member, and the
// change reaches only the member's own apps.
import type { FeedbackView } from '../../src/application/api-contract';
import { failure, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { ensureSettings } from './settings';

function read(ctx: Context, memberId: string): FeedbackView {
  ensureSettings(ctx, memberId);
  const [row] = ctx.sql.all<{ vibration: number; sound: number }>('SELECT vibration, sound FROM member_settings WHERE member_id = ?', memberId);
  return { vibration: row.vibration === 1, sound: row.sound === 1 };
}

export function getFeedback(ctx: Context, actor: Member): FeedbackView {
  return read(ctx, actor.id);
}

/** Either switch, or both. A switch that is present but not a boolean is `invalid`, and nothing changes. */
export function setFeedback(ctx: Context, actor: Member, input: { vibration?: unknown; sound?: unknown }): CommandResult<FeedbackView> {
  const { vibration, sound } = input;
  if ((vibration !== undefined && typeof vibration !== 'boolean') || (sound !== undefined && typeof sound !== 'boolean')) return failure('invalid');
  ensureSettings(ctx, actor.id);
  if (vibration !== undefined) ctx.sql.run('UPDATE member_settings SET vibration = ? WHERE member_id = ?', vibration ? 1 : 0, actor.id);
  if (sound !== undefined) ctx.sql.run('UPDATE member_settings SET sound = ? WHERE member_id = ?', sound ? 1 : 0, actor.id);
  return { ok: true, value: read(ctx, actor.id), changed: ['feedback'] };
}
