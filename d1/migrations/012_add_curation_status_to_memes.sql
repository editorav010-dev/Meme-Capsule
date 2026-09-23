-- ============================================================
-- Migration 012: Add curation_status to memes Table
--
-- Explicitly partitions the memes corpus into 3 clear categories:
-- 1. curation_status = 'keep'     (111 memes, status = 'active',   is_active = 1) -> Public Capsule
-- 2. curation_status = 'excluded' (53 memes,  status = 'archived', is_active = 0) -> Superadmin Rejected
-- 3. curation_status IS NULL      (4,947 memes, status = 'archived', is_active = 0) -> Uncurated Backlog
-- ============================================================

-- 1. Add curation_status column
ALTER TABLE memes ADD COLUMN curation_status TEXT DEFAULT NULL;

-- 2. Populate authoritative decisions from meme_curation_final
UPDATE memes
SET curation_status = 'keep'
WHERE id IN (
  SELECT meme_id FROM meme_curation_final WHERE corpus_status = 'keep'
);

UPDATE memes
SET curation_status = 'excluded'
WHERE id IN (
  SELECT meme_id FROM meme_curation_final WHERE corpus_status = 'excluded'
);
