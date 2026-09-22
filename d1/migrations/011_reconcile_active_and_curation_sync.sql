-- ============================================================
-- Migration 011: Reconcile Authoritative Active State and Curation Sync
-- 
-- Guarantees that:
-- 1. memes.status = 'active' strictly mirrors meme_curation_final.corpus_status = 'keep'
-- 2. memes.is_active is 100% synchronized with status (1 for active, 0 for archived/draft)
-- 3. All non-finalized or excluded memes are archived (ineligible for public spawn)
-- ============================================================

-- 1. Ensure all memes resolved as 'keep' by Superadmin are active and is_active = 1
UPDATE memes
SET status = 'active', is_active = 1
WHERE id IN (
  SELECT meme_id FROM meme_curation_final WHERE corpus_status = 'keep'
);

-- 2. Ensure all memes resolved as 'excluded', 'duplicate', or 'review_later' by Superadmin are archived and is_active = 0
UPDATE memes
SET status = 'archived', is_active = 0
WHERE id IN (
  SELECT meme_id FROM meme_curation_final WHERE corpus_status IN ('excluded', 'duplicate', 'review_later')
);

-- 3. Ensure all uncurated memes (not in meme_curation_final and not draft) are archived and is_active = 0
UPDATE memes
SET status = 'archived', is_active = 0
WHERE id NOT IN (
  SELECT meme_id FROM meme_curation_final
) AND status != 'draft';

-- 4. Clean up any status <-> is_active drift across the entire corpus
UPDATE memes SET is_active = 1 WHERE status = 'active';
UPDATE memes SET is_active = 0 WHERE status != 'active';
