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

describe('the starting theme an admin picks in the invite', () => {
  it('is where a newcomer starts, and they may change it', () => {
    expect(service.command(ana, 'invite.create', { email: 'dani@example.com', theme: 'ocarina' })).toMatchObject({
      ok: true,
      value: { email: 'dani@example.com', theme: 'ocarina' },
    });
    service.signIn(profile('dani@example.com', 'Dani'), 'h-dani', []);
    expect(service.query('h-dani', 'theme', {})).toEqual({ ok: true, value: { theme: 'ocarina' } });
    expect(service.command('h-dani', 'theme.set', { theme: 'stardew' })).toMatchObject({ ok: true });
    expect(service.query('h-dani', 'theme', {})).toEqual({ ok: true, value: { theme: 'stardew' } });
  });

  it('is the default without a pick, and an id the app does not ship is invalid', () => {
    expect(service.command(ana, 'invite.create', { email: 'dani@example.com' })).toMatchObject({ ok: true, value: { theme: 'ameixa' } });
    expect(service.command(ana, 'invite.create', { email: 'eve@example.com', theme: 'retired' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('does not override the theme of someone coming back', () => {
    expect(service.command(carla, 'theme.set', { theme: 'uppertale' })).toMatchObject({ ok: true });
    const carlaId = (service.query(carla, 'me', {}) as { value: { id: string } }).value.id;
    expect(service.command(ana, 'member.remove', { memberId: carlaId })).toMatchObject({ ok: true });
    service.command(ana, 'invite.create', { email: 'carla@example.com', theme: 'ocarina' });
    service.signIn(profile('carla@example.com', 'Carla'), 'h-carla-2', []);
    expect(service.query('h-carla-2', 'theme', {})).toEqual({ ok: true, value: { theme: 'uppertale' } });
  });
});
