-- ==============================================================================
-- MEME CAPSULE COMPLETE ALL-IN-ONE DATABASE SETUP SCRIPT
-- Paste this script into your Cloudflare Admin Dashboard "SQL Query" tab and run.
-- ==============================================================================

-- 1. Judge & Admin Users Table
CREATE TABLE IF NOT EXISTS cat_users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('judge', 'superadmin')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT
);

-- 2. Sessions Table (8-hour token auth)
CREATE TABLE IF NOT EXISTS cat_sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at  TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES cat_users(id)
);

-- 3. Seed Default Judge & Superadmin Accounts (Password: changeme123)
-- SHA-256 hash of "changeme123" is 494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be
INSERT OR IGNORE INTO cat_users (id, username, display_name, password_hash, role, is_active)
VALUES 
  ('user-superadmin', 'superadmin', 'Super Admin', '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'superadmin', 1),
  ('user-judge1',     'judge1',     'Judge One',    '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'judge',      1),
  ('user-judge2',     'judge2',     'Judge Two',    '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'judge',      1),
  ('user-judge3',     'judge3',     'Judge Three',  '494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be', 'judge',      1);

-- 4. Multi-User Meme Curation Decisions Table
CREATE TABLE IF NOT EXISTS meme_curation (
  id                TEXT PRIMARY KEY DEFAULT ('cur-' || hex(randomblob(6))),
  meme_id           TEXT NOT NULL,
  user_id           TEXT NOT NULL DEFAULT 'curator-1',
  user_name         TEXT NOT NULL DEFAULT 'Curator',
  corpus_status     TEXT NOT NULL CHECK (corpus_status IN ('keep', 'excluded', 'duplicate', 'review_later')),
  duplicate_of      TEXT,
  topics            TEXT NOT NULL DEFAULT '[]',
  tone              TEXT,
  humour_mechanisms TEXT NOT NULL DEFAULT '[]',
  curator_note      TEXT,
  reviewed_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(meme_id, user_id),
  FOREIGN KEY (meme_id) REFERENCES memes(id)
);

-- 5. Super Admin Authoritative Consensus & Resolution Table
CREATE TABLE IF NOT EXISTS meme_curation_final (
  meme_id           TEXT PRIMARY KEY,
  corpus_status     TEXT NOT NULL CHECK (corpus_status IN ('keep', 'excluded', 'duplicate', 'review_later')),
  duplicate_of      TEXT,
  topics            TEXT NOT NULL DEFAULT '[]',
  tone              TEXT,
  humour_mechanisms TEXT NOT NULL DEFAULT '[]',
  curator_note      TEXT,
  resolved_by       TEXT NOT NULL DEFAULT 'superadmin',
  resolved_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (meme_id) REFERENCES memes(id)
);

-- 6. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_curation_meme_id ON meme_curation(meme_id);
CREATE INDEX IF NOT EXISTS idx_curation_user_id ON meme_curation(user_id);
CREATE INDEX IF NOT EXISTS idx_curation_status ON meme_curation(corpus_status);
CREATE INDEX IF NOT EXISTS idx_curation_tone ON meme_curation(tone);
CREATE INDEX IF NOT EXISTS idx_curation_reviewed ON meme_curation(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_curation_final_status ON meme_curation_final(corpus_status);
CREATE INDEX IF NOT EXISTS idx_curation_final_resolved_at ON meme_curation_final(resolved_at);
