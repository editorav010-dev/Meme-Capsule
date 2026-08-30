import type { D1Database } from "./d1r2";

let tablesInitialized = false;

/**
 * Ensures that meme_curation and meme_curation_final tables exist in D1 automatically.
 */
export async function ensureCurationTables(db: D1Database): Promise<void> {
  if (tablesInitialized) return;

  try {
    await db.exec(`
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
    `);
    tablesInitialized = true;
  } catch (err) {
    console.error("Warning: could not auto-create curation tables:", err);
  }
}
