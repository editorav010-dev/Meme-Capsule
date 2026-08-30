-- ============================================================
-- Migration 005: Super Admin Final Curation Consensus & Resolution Table
-- Run: npx wrangler d1 execute meme-capsule-db --file=d1/migrations/005_curation_final.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS meme_curation_final (
  meme_id           TEXT PRIMARY KEY,
  corpus_status     TEXT NOT NULL CHECK (corpus_status IN ('keep', 'excluded', 'duplicate', 'review_later')),
  duplicate_of      TEXT,
  topics            TEXT NOT NULL DEFAULT '[]',        -- Final JSON array of up to 3 topics
  tone              TEXT,                              -- Final single dominant tone
  humour_mechanisms TEXT NOT NULL DEFAULT '[]',        -- Final JSON array of up to 2 mechanisms
  curator_note      TEXT,
  resolved_by       TEXT NOT NULL DEFAULT 'superadmin',
  resolved_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (meme_id) REFERENCES memes(id)
);

CREATE INDEX IF NOT EXISTS idx_curation_final_status ON meme_curation_final(corpus_status);
CREATE INDEX IF NOT EXISTS idx_curation_final_resolved_at ON meme_curation_final(resolved_at);
