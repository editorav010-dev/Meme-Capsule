-- ============================================================
-- Migration 003: Multi-User Meme Categorisation System
-- Run: npx wrangler d1 execute meme-capsule-db --file=d1/migrations/003_categorisation.sql
-- ============================================================

-- Admin users table
-- Populated manually by the super admin, never via a registration form
CREATE TABLE IF NOT EXISTS cat_users (
  id            TEXT PRIMARY KEY DEFAULT ('user-' || hex(randomblob(4))),
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,  -- SHA-256 hash stored as text
  role          TEXT NOT NULL DEFAULT 'judge',  -- 'judge' or 'superadmin'
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT
);

-- Session tokens — issued on login, expire after 8 hours
CREATE TABLE IF NOT EXISTS cat_sessions (
  token         TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES cat_users(id)
);

CREATE INDEX IF NOT EXISTS idx_cat_sessions_user_id ON cat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_sessions_expires ON cat_sessions(expires_at);

-- Individual categorisation decisions
-- One row per user per meme — a user can recategorise, updating their row
CREATE TABLE IF NOT EXISTS cat_decisions (
  id          TEXT PRIMARY KEY DEFAULT ('dec-' || hex(randomblob(6))),
  meme_id     TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  category_id INTEGER CHECK (category_id BETWEEN 1 AND 7),
  confidence  INTEGER NOT NULL DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  skipped     INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  decided_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(meme_id, user_id),
  FOREIGN KEY (meme_id) REFERENCES memes(id),
  FOREIGN KEY (user_id) REFERENCES cat_users(id)
);

CREATE INDEX IF NOT EXISTS idx_cat_decisions_meme_id   ON cat_decisions(meme_id);
CREATE INDEX IF NOT EXISTS idx_cat_decisions_user_id   ON cat_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_decisions_category  ON cat_decisions(category_id);
CREATE INDEX IF NOT EXISTS idx_cat_decisions_skipped   ON cat_decisions(skipped);

-- Consensus results — computed by the analytics system
-- Updated whenever a meme gets a new decision
CREATE TABLE IF NOT EXISTS cat_consensus (
  meme_id           TEXT PRIMARY KEY,
  consensus_category INTEGER,         -- NULL if no majority yet
  confidence_score   REAL DEFAULT 0,  -- 0-1, how strongly judges agree
  judge_count        INTEGER DEFAULT 0,
  vote_breakdown     TEXT DEFAULT '{}', -- JSON: {1: count, 2: count, ...}
  is_resolved        INTEGER DEFAULT 0, -- 1 when all judges have voted
  final_category     INTEGER,          -- manually confirmed by superadmin
  last_updated       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (meme_id) REFERENCES memes(id)
);

-- Insert the initial seed users with default SHA-256 hash for 'changeme123'
-- Hash of 'changeme123' = 494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be
INSERT OR IGNORE INTO cat_users (username, display_name, password_hash, role) VALUES
  ('superadmin', 'Super Admin',  '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'superadmin'),
  ('judge1',     'Judge One',    '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'judge'),
  ('judge2',     'Judge Two',    '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'judge'),
  ('judge3',     'Judge Three',  '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'judge');
