-- ============================================================
-- Migration 004: Editorial Judgment & Multi-Dimensional Curation
-- Run: npx wrangler d1 execute meme-capsule-db --file=d1/migrations/004_curation.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS meme_curation (
  meme_id           TEXT PRIMARY KEY,
  corpus_status     TEXT NOT NULL CHECK (corpus_status IN ('keep', 'excluded', 'duplicate', 'review_later')),
  duplicate_of      TEXT,
  topics            TEXT NOT NULL DEFAULT '[]',        -- JSON array of up to 3 topics
  tone              TEXT,                              -- Single dominant tone
  humour_mechanisms TEXT NOT NULL DEFAULT '[]',        -- JSON array of up to 2 mechanisms
  curator_note      TEXT,
  reviewed_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (meme_id) REFERENCES memes(id)
);

CREATE INDEX IF NOT EXISTS idx_curation_status ON meme_curation(corpus_status);
CREATE INDEX IF NOT EXISTS idx_curation_tone ON meme_curation(tone);
CREATE INDEX IF NOT EXISTS idx_curation_reviewed ON meme_curation(reviewed_at);
