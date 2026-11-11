import { describe, expect, it } from 'vitest';
import { memorySql } from '../testing/node-sql';
import { migrate, MIGRATIONS } from './schema';

describe('migrations', () => {
  it('give members from before migration 2 the default day settings', () => {
    const sql = memorySql();
    sql.run('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    for (const statement of MIGRATIONS[0]) sql.run(statement);
    sql.run("INSERT INTO schema_migrations VALUES (1, '2026-11-01')");
    sql.run("INSERT INTO members (id, email, name, joined_at) VALUES ('m1', 'ana@example.com', 'Ana', '2026-11-01')");

    migrate(sql);

    expect(sql.all('SELECT member_id, day_turnover, time_zone, last_closed_day FROM member_settings')).toEqual([
      { member_id: 'm1', day_turnover: 0, time_zone: 'America/Sao_Paulo', last_closed_day: null },
    ]);
  });

  it('run once each', () => {
    const sql = memorySql();
    migrate(sql);
    migrate(sql);
    expect(sql.all('SELECT version FROM schema_migrations')).toEqual(MIGRATIONS.map((_, i) => ({ version: i + 1 })));
  });

  it('give habits archived before migration 4 their archived stretch', () => {
    const sql = memorySql();
    sql.run('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    for (let v = 0; v < 3; v++) {
      for (const statement of MIGRATIONS[v]) sql.run(statement);
      sql.run('INSERT INTO schema_migrations VALUES (?, ?)', v + 1, '2026-11-01');
    }
    sql.run("INSERT INTO members (id, email, name, joined_at) VALUES ('m1', 'ana@example.com', 'Ana', '2026-11-01')");
    for (const [id, state, archived] of [
      ['h1', 'archived', '2026-11-05'],
      ['h2', 'active', null],
    ]) {
      sql.run(
        `INSERT INTO habits (id, member_id, name, rule, difficulty, position, state, tier_started_on, created_at, archived_on)
         VALUES (?, 'm1', 'Ler', 'daily', 'easy', 1, ?, '2026-11-01', '2026-11-01', ?)`,
        id,
        state,
        archived,
      );
    }

    migrate(sql);

    expect(sql.all('SELECT habit_id, kind, from_day, ended_on FROM pauses')).toEqual([
      { habit_id: 'h1', kind: 'archive', from_day: '2026-11-05', ended_on: null },
    ]);
    expect(sql.all('SELECT streak_carry FROM habits')).toEqual([{ streak_carry: 0 }, { streak_carry: 0 }]);
  });

  it('give habits from before migration 6 their current patamar', () => {
    const sql = memorySql();
    sql.run('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    for (let v = 0; v < 5; v++) {
      for (const statement of MIGRATIONS[v]) sql.run(statement);
      sql.run('INSERT INTO schema_migrations VALUES (?, ?)', v + 1, '2026-11-01');
    }
    sql.run("INSERT INTO members (id, email, name, joined_at) VALUES ('m1', 'ana@example.com', 'Ana', '2026-11-01')");
    for (const [id, rule, goal, weekdays] of [
      ['h1', 'daily', 3, 0],
      ['h2', 'weekdays', 1, 0b0101010],
      ['h3', 'free', 1, 0],
    ] as const) {
      sql.run(
        `INSERT INTO habits (id, member_id, name, rule, difficulty, daily_goal, weekdays, position, tier_started_on, created_at)
         VALUES (?, 'm1', 'Ler', ?, 'medium', ?, ?, 1, '2026-11-02', '2026-11-01')`,
        id,
        rule,
        goal,
        weekdays,
      );
    }

    migrate(sql);

    expect(sql.all('SELECT habit_id, tier, first_on, mastered_on FROM habit_tiers ORDER BY habit_id')).toEqual([
      { habit_id: 'h1', tier: 'medium:3:7', first_on: '2026-11-02', mastered_on: null },
      { habit_id: 'h2', tier: 'medium:1:3', first_on: '2026-11-02', mastered_on: null },
      { habit_id: 'h3', tier: 'medium:1:0', first_on: '2026-11-02', mastered_on: null },
    ]);
  });
});
