-- ============================================================
-- Migration 011: Force Removals Audit Table
-- Run: npx wrangler d1 execute meme-capsule-db --file=d1/migrations/011_force_removals.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS meme_force_removals (
  id             TEXT PRIMARY KEY DEFAULT ('frm-' || hex(randomblob(6))),
  meme_id        TEXT NOT NULL UNIQUE,
  title          TEXT,
  image_url      TEXT,
  storage_path   TEXT,
  r2_key         TEXT,
  removed_by     TEXT NOT NULL,
  removed_by_name TEXT,
  reason         TEXT,
  r2_deleted     INTEGER NOT NULL DEFAULT 0,
  r2_error       TEXT,
  removed_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  r2_deleted_at  TEXT,
  FOREIGN KEY (meme_id) REFERENCES memes(id),
  FOREIGN KEY (removed_by) REFERENCES cat_users(id)
);

CREATE INDEX IF NOT EXISTS idx_force_removals_removed_at ON meme_force_removals(removed_at);
CREATE INDEX IF NOT EXISTS idx_force_removals_removed_by ON meme_force_removals(removed_by);
CREATE INDEX IF NOT EXISTS idx_force_removals_meme_id ON meme_force_removals(meme_id);
