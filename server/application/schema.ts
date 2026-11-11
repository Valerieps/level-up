// The group's database (docs/ARQUITETURA.md). Migrations run in order, once each, when the
// Durable Object starts. Never edit a migration that has shipped: add the next one.
import type { Sql } from './ports';

export const MIGRATIONS: readonly (readonly string[])[] = [
  // 1: members, their sessions and the invites.
  [
    `CREATE TABLE members (
      id TEXT PRIMARY KEY,
      google_sub TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      photo_url TEXT,
      roles TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      joined_at TEXT NOT NULL,
      removed_at TEXT
    )`,
    `CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`,
    `CREATE INDEX sessions_member ON sessions(member_id)`,
    `CREATE TABLE invites (
      email TEXT PRIMARY KEY,
      invited_by TEXT NOT NULL REFERENCES members(id),
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted_at TEXT,
      revoked_at TEXT
    )`,
  ],
  // 2: each member's day (ADR-009). Members from before get the defaults.
  [
    `CREATE TABLE member_settings (
      member_id TEXT PRIMARY KEY REFERENCES members(id),
      day_turnover INTEGER NOT NULL DEFAULT 0,
      time_zone TEXT NOT NULL,
      last_closed_day TEXT
    )`,
    `INSERT INTO member_settings (member_id, day_turnover, time_zone) SELECT id, 0, 'America/Sao_Paulo' FROM members`,
  ],
  // 3: habits, what was done each day and each member's XP and gold (phase 1a).
  [
    `CREATE TABLE habits (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      name TEXT NOT NULL,
      rule TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      daily_goal INTEGER NOT NULL DEFAULT 1,
      weekdays INTEGER NOT NULL DEFAULT 0,
      minimum TEXT,
      stars INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL,
      state TEXT NOT NULL DEFAULT 'active',
      tier_started_on TEXT NOT NULL,
      created_at TEXT NOT NULL,
      archived_on TEXT
    )`,
    `CREATE INDEX habits_member ON habits(member_id, state, position)`,
    `CREATE TABLE completions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0,
      minimum INTEGER NOT NULL DEFAULT 0,
      xp INTEGER NOT NULL DEFAULT 0,
      gold INTEGER NOT NULL DEFAULT 0,
      UNIQUE (habit_id, day)
    )`,
    `CREATE INDEX completions_member_day ON completions(member_id, day)`,
    `CREATE TABLE progress (
      member_id TEXT PRIMARY KEY REFERENCES members(id),
      xp_total INTEGER NOT NULL DEFAULT 0,
      gold INTEGER NOT NULL DEFAULT 0
    )`,
  ],
  // 4: the day each member last closed Revisar ontem (docs/spec/registrar-o-dia.md).
  [`ALTER TABLE member_settings ADD COLUMN yesterday_reviewed_on TEXT`],
];

export function migrate(sql: Sql): void {
  sql.run('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const [{ current }] = sql.all<{ current: number | null }>('SELECT MAX(version) AS current FROM schema_migrations');
  for (let version = (current ?? 0) + 1; version <= MIGRATIONS.length; version++) {
    sql.transaction(() => {
      for (const statement of MIGRATIONS[version - 1]) sql.run(statement);
      sql.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', version, new Date().toISOString());
    });
  }
}
