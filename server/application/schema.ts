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
  // 4: phase 1b. Pauses (of the app or of a habit) and the time a habit spends archived, which
  // freezes its streak like a pause; the streak a habit carries across a régua change (ADR-011).
  // Habits archived before this get their archived stretch.
  [
    `ALTER TABLE habits ADD COLUMN streak_carry INTEGER NOT NULL DEFAULT 0`,
    `CREATE TABLE pauses (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      habit_id TEXT REFERENCES habits(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'pause',
      from_day TEXT NOT NULL,
      until_day TEXT,
      ended_on TEXT
    )`,
    `CREATE INDEX pauses_member ON pauses(member_id)`,
    `INSERT INTO pauses (id, member_id, habit_id, kind, from_day)
     SELECT 'archive-' || id, member_id, id, 'archive', archived_on FROM habits WHERE state = 'archived' AND archived_on IS NOT NULL`,
  ],
  // 5: the day each member last closed Revisar ontem (docs/spec/registrar-o-dia.md).
  [`ALTER TABLE member_settings ADD COLUMN yesterday_reviewed_on TEXT`],
  // 6: phase 1c. Every patamar a habit had and whether it was mastered (stars, Prêmio de Domínio);
  // the selo and the current patamar's mastery on the habit; the régua invitations dismissed; the
  // conquistas reached and the two track counts, which only grow; the heatmap markers. Existing
  // habits get their current patamar, keyed like tierKey() in src/domain/habits/regua.ts.
  [
    `ALTER TABLE habits ADD COLUMN automated_on TEXT`,
    `ALTER TABLE habits ADD COLUMN tier_mastered_on TEXT`,
    `CREATE TABLE habit_tiers (
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      tier TEXT NOT NULL,
      first_on TEXT NOT NULL,
      mastered_on TEXT,
      PRIMARY KEY (habit_id, tier)
    )`,
    `INSERT INTO habit_tiers (habit_id, tier, first_on)
     SELECT id, difficulty || ':' || daily_goal || ':' || CASE rule
       WHEN 'daily' THEN 7
       WHEN 'free' THEN 0
       ELSE (weekdays & 1) + ((weekdays >> 1) & 1) + ((weekdays >> 2) & 1) + ((weekdays >> 3) & 1)
          + ((weekdays >> 4) & 1) + ((weekdays >> 5) & 1) + ((weekdays >> 6) & 1)
     END, tier_started_on FROM habits`,
    `CREATE TABLE invitations (
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      dismissed_on TEXT NOT NULL,
      PRIMARY KEY (habit_id, kind)
    )`,
    `CREATE TABLE achievements (
      member_id TEXT NOT NULL REFERENCES members(id),
      track TEXT NOT NULL,
      milestone INTEGER NOT NULL,
      reached_on TEXT NOT NULL,
      gold INTEGER NOT NULL,
      PRIMARY KEY (member_id, track, milestone)
    )`,
    `CREATE TABLE milestones (
      member_id TEXT NOT NULL REFERENCES members(id),
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      kind TEXT NOT NULL
    )`,
    `CREATE INDEX milestones_member ON milestones(member_id, day)`,
    `ALTER TABLE progress ADD COLUMN automated_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE progress ADD COLUMN courage_total INTEGER NOT NULL DEFAULT 0`,
  ],
  // 7: phase 1d. The Loja's rewards and every redemption, which copies the reward's name and cost
  // and survives its edit or deletion (so no foreign key to rewards).
  [
    `CREATE TABLE rewards (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      name TEXT NOT NULL,
      cost INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX rewards_member ON rewards(member_id)`,
    `CREATE TABLE redemptions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      reward_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cost INTEGER NOT NULL,
      day TEXT NOT NULL,
      at TEXT NOT NULL
    )`,
    `CREATE INDEX redemptions_member ON redemptions(member_id, at)`,
  ],
  // 8: each member's visual theme (ADR-012). Existing members get the default, Ameixa.
  [`ALTER TABLE member_settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'ameixa'`],
  // 9: the theme an invitee starts with, picked by the admin who invites (docs/spec/temas.md).
  [`ALTER TABLE invites ADD COLUMN theme TEXT NOT NULL DEFAULT 'ameixa'`],
  // 10: the feedback switches (docs/spec/telas-e-feedback.md): vibration on, sound off.
  [
    `ALTER TABLE member_settings ADD COLUMN vibration INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE member_settings ADD COLUMN sound INTEGER NOT NULL DEFAULT 0`,
  ],
  // 11: what the short moments need to happen once (docs/spec/telas-e-feedback.md "Momentos
  // novos"): the member's primeiro passo (members who already completed something had theirs) and
  // last dia fechado; each habit's best streak, the day it was raised and the last recorde shown.
  // A null best is measured from the history on the next completion, silently.
  [
    `ALTER TABLE member_settings ADD COLUMN first_step_on TEXT`,
    `ALTER TABLE member_settings ADD COLUMN day_closed_on TEXT`,
    `UPDATE member_settings SET first_step_on =
       (SELECT MIN(day) FROM completions WHERE completions.member_id = member_settings.member_id AND completions.done = 1)`,
    `ALTER TABLE habits ADD COLUMN best_streak INTEGER`,
    `ALTER TABLE habits ADD COLUMN best_streak_on TEXT`,
    `ALTER TABLE habits ADD COLUMN record_on TEXT`,
  ],
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
