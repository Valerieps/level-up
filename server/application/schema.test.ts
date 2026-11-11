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
});
