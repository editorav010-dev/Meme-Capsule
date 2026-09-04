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

      -- 6. Judge AI Presets Table (Isolated per judge)
      CREATE TABLE IF NOT EXISTS cat_judge_ai_presets (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        preset_name TEXT NOT NULL,
        provider    TEXT NOT NULL,
        base_url    TEXT NOT NULL,
        api_key     TEXT NOT NULL,
        model       TEXT NOT NULL,
        settings    TEXT NOT NULL DEFAULT '{}',
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        FOREIGN KEY (user_id) REFERENCES cat_users(id) ON DELETE CASCADE
      );

      -- 7. Indexes
      CREATE INDEX IF NOT EXISTS idx_curation_meme_id ON meme_curation(meme_id);
      CREATE INDEX IF NOT EXISTS idx_curation_user_id ON meme_curation(user_id);
      CREATE INDEX IF NOT EXISTS idx_curation_status ON meme_curation(corpus_status);
      CREATE INDEX IF NOT EXISTS idx_curation_final_status ON meme_curation_final(corpus_status);
      CREATE INDEX IF NOT EXISTS idx_judge_ai_presets_user ON cat_judge_ai_presets(user_id);
    `);
    tablesInitialized = true;
  } catch (err) {
    console.error("Warning: could not auto-initialize tables:", err);
  }

}

export async function ensureAIPredictionTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_curation_predictions (
      meme_id           TEXT PRIMARY KEY,
      storage_path      TEXT,
      image_url         TEXT,
      corpus_status     TEXT,
      topics            TEXT NOT NULL DEFAULT '[]',
      tone              TEXT,
      humour_mechanisms TEXT NOT NULL DEFAULT '[]',
      confidence        REAL NOT NULL DEFAULT 0,
      reasoning         TEXT,
      model             TEXT,
      tokens_used       INTEGER NOT NULL DEFAULT 0,
      processing_ms     INTEGER NOT NULL DEFAULT 0,
      raw_response      TEXT,
      error             TEXT,
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (meme_id) REFERENCES memes(id)
    )
  `).run();

  try {
    await db.prepare("ALTER TABLE ai_curation_predictions ADD COLUMN corpus_status TEXT").run();
  } catch (error) {
    if (!(error instanceof Error) || !/duplicate column name|already exists/i.test(error.message)) {
      throw error;
    }
  }
}
