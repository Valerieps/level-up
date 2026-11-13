import { beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';
import type { GoogleProfile } from './members';
import type { Sql } from './ports';
import { migrate, MIGRATIONS } from './schema';

const profile = (email: string, name: string): GoogleProfile => ({ sub: `sub:${email}`, email, name, picture: null });

let service: GroupService;
const ana = 'h-ana';
const carla = 'h-carla';

beforeEach(() => {
  service = new GroupService(memorySql(), fixedClock('2026-11-13T12:00:00Z'), sequentialIds());
  service.migrate();
  service.signIn(profile('ana@example.com', 'Ana'), ana, ['ana@example.com']);
  service.command(ana, 'invite.create', { email: 'carla@example.com' });
  service.signIn(profile('carla@example.com', 'Carla'), carla, []);
});

describe("the member's feedback switches", () => {
  it('start with vibration on and sound off', () => {
    expect(service.query(ana, 'feedback', {})).toEqual({ ok: true, value: { vibration: true, sound: false } });
  });

  it('change one at a time or both, and stay', () => {
    expect(service.command(ana, 'feedback.set', { sound: true })).toMatchObject({ ok: true, value: { vibration: true, sound: true } });
    expect(service.command(ana, 'feedback.set', { vibration: false })).toMatchObject({ ok: true, value: { vibration: false, sound: true } });
    expect(service.command(ana, 'feedback.set', { vibration: true, sound: false })).toMatchObject({ ok: true, value: { vibration: true, sound: false } });
    expect(service.command(ana, 'feedback.set', {})).toMatchObject({ ok: true, value: { vibration: true, sound: false } });
    expect(service.query(ana, 'feedback', {})).toEqual({ ok: true, value: { vibration: true, sound: false } });
  });

  it('take only booleans, and change nothing otherwise', () => {
    for (const value of [1, 0, 'true', null, {}]) {
      expect(service.command(ana, 'feedback.set', { sound: value, vibration: false })).toEqual({ ok: false, error: 'invalid' });
      expect(service.command(ana, 'feedback.set', { vibration: value })).toEqual({ ok: false, error: 'invalid' });
    }
    expect(service.query(ana, 'feedback', {})).toEqual({ ok: true, value: { vibration: true, sound: false } });
  });

  it("are private: a member's change reaches only that member's apps", () => {
    const anaId = (service.query(ana, 'me', {}) as { value: { id: string } }).value.id;
    expect(service.command(ana, 'feedback.set', { sound: true })).toMatchObject({ notify: [{ to: { memberId: anaId }, topics: ['feedback'] }] });
    expect(service.query(carla, 'feedback', {})).toEqual({ ok: true, value: { vibration: true, sound: false } });
  });

  it('need a session', () => {
    expect(service.query('h-nobody', 'feedback', {})).toEqual({ ok: false, error: 'unauthenticated' });
    expect(service.command('h-nobody', 'feedback.set', { sound: true })).toEqual({ ok: false, error: 'unauthenticated' });
  });
});

describe('migration 10', () => {
  it('gives members from before it vibration on and sound off', () => {
    const sql: Sql = memorySql();
    sql.run('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    for (let v = 0; v < 9; v++) {
      for (const statement of MIGRATIONS[v]) sql.run(statement);
      sql.run('INSERT INTO schema_migrations VALUES (?, ?)', v + 1, '2026-11-01');
    }
    sql.run("INSERT INTO members (id, email, name, joined_at) VALUES ('m1', 'ana@example.com', 'Ana', '2026-11-01')");
    sql.run("INSERT INTO member_settings (member_id, day_turnover, time_zone) VALUES ('m1', 0, 'America/Sao_Paulo')");

    migrate(sql);

    expect(sql.all('SELECT member_id, vibration, sound FROM member_settings')).toEqual([{ member_id: 'm1', vibration: 1, sound: 0 }]);
  });
});
