import type { D1Database } from "./d1r2";

let tablesInitialized = false;

// SHA-256 of "changeme123"
const DEFAULT_PASS_HASH = "494a715f7e9b4071aca61bac42ca858a309524e5864f0920030862a4ae7589be";

/**
 * Ensures that all necessary tables and default judge accounts exist in D1 automatically.
 */
export async function ensureCurationTables(db: D1Database): Promise<void> {
  if (tablesInitialized) return;

  try {
    await db.exec(`
      -- 1. Judge Users Table
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

      -- 2. Sessions Table
      CREATE TABLE IF NOT EXISTS cat_sessions (
        token       TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        expires_at  TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES cat_users(id)
      );

      -- 3. Default Judge & Superadmin Accounts
      INSERT OR IGNORE INTO cat_users (id, username, display_name, password_hash, role, is_active)
      VALUES 
        ('user-superadmin', 'superadmin', 'Super Admin', '${DEFAULT_PASS_HASH}', 'superadmin', 1),
        ('user-judge1',     'judge1',     'Judge One',    '${DEFAULT_PASS_HASH}', 'judge',      1),
        ('user-judge2',     'judge2',     'Judge Two',    '${DEFAULT_PASS_HASH}', 'judge',      1),
        ('user-judge3',     'judge3',     'Judge Three',  '${DEFAULT_PASS_HASH}', 'judge',      1);

      -- 4. Multi-User Meme Curation Table
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

      -- 5. Super Admin Authoritative Resolution Table
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

      -- 6. Indexes
      CREATE INDEX IF NOT EXISTS idx_curation_meme_id ON meme_curation(meme_id);
      CREATE INDEX IF NOT EXISTS idx_curation_user_id ON meme_curation(user_id);
      CREATE INDEX IF NOT EXISTS idx_curation_status ON meme_curation(corpus_status);
      CREATE INDEX IF NOT EXISTS idx_curation_final_status ON meme_curation_final(corpus_status);
    `);
    tablesInitialized = true;
  } catch (err) {
    console.error("Warning: could not auto-initialize tables:", err);
  }
}
