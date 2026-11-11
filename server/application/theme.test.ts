import { beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';
import type { GoogleProfile } from './members';
import type { Sql } from './ports';

const profile = (email: string, name: string): GoogleProfile => ({ sub: `sub:${email}`, email, name, picture: null });

let sql: Sql;
let service: GroupService;
let ana: string;
let carla: string;

beforeEach(() => {
  sql = memorySql();
  service = new GroupService(sql, fixedClock('2026-11-11T12:00:00Z'), sequentialIds());
  service.migrate();
  service.signIn(profile('ana@example.com', 'Ana'), 'h-ana', ['ana@example.com']);
  service.command('h-ana', 'invite.create', { email: 'carla@example.com' });
  service.signIn(profile('carla@example.com', 'Carla'), 'h-carla', []);
  ana = 'h-ana';
  carla = 'h-carla';
});

describe("the member's theme (ADR-012)", () => {
  it('starts at the default, Ameixa', () => {
    expect(service.query(ana, 'theme', {})).toEqual({ ok: true, value: { theme: 'ameixa' } });
  });

  it('takes only an id the app ships', () => {
    expect(service.command(ana, 'theme.set', { theme: 'ameixa' })).toMatchObject({ ok: true, value: { theme: 'ameixa' } });
    for (const theme of ['nope', '', 42, null, undefined, 'AMEIXA', 'toString']) {
      expect(service.command(ana, 'theme.set', { theme })).toEqual({ ok: false, error: 'invalid' });
    }
  });

  it("is private: a member's change reaches only that member's apps and leaves the others' theme", () => {
    const anaId = (service.query(ana, 'me', {}) as { value: { id: string } }).value.id;
    expect(service.command(ana, 'theme.set', { theme: 'ameixa' })).toMatchObject({ notify: [{ to: { memberId: anaId }, topics: ['theme'] }] });
    // A theme the app stopped shipping reads as the default, for that member only.
    sql.run("UPDATE member_settings SET theme = 'retired' WHERE member_id = ?", anaId);
    expect(service.query(ana, 'theme', {})).toEqual({ ok: true, value: { theme: 'ameixa' } });
    expect(service.query(carla, 'theme', {})).toEqual({ ok: true, value: { theme: 'ameixa' } });
  });

  it('needs a session', () => {
    expect(service.query('h-nobody', 'theme', {})).toEqual({ ok: false, error: 'unauthenticated' });
    expect(service.command('h-nobody', 'theme.set', { theme: 'ameixa' })).toEqual({ ok: false, error: 'unauthenticated' });
  });
});
