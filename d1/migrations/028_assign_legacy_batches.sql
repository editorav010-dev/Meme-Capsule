-- Migration 028: Assign Legacy Batches to Pre-Migration Memes
-- Groups legacy memes (those without batch associations in ingestion_jobs)
-- into synthetic batches (max 1000 items each) to enable batch-based tracking
-- across the entire historical collection without altering statuses or reviews.

-- 1. Create synthetic legacy batches
INSERT OR IGNORE INTO ingestion_batches (id, idempotency_key, actor_id, actor_name, status, total_items)
VALUES 
  ('legacy-batch-1', 'legacy-batch-1-key', 'system', 'Legacy Batch 1 (1-1000)', 'complete', 1000),
  ('legacy-batch-2', 'legacy-batch-2-key', 'system', 'Legacy Batch 2 (1001-2000)', 'complete', 1000),
  ('legacy-batch-3', 'legacy-batch-3-key', 'system', 'Legacy Batch 3 (2001-3000)', 'complete', 1000),
  ('legacy-batch-4', 'legacy-batch-4-key', 'system', 'Legacy Batch 4 (3001-4000)', 'complete', 1000),
  ('legacy-batch-5', 'legacy-batch-5-key', 'system', 'Legacy Batch 5 (4001+)', 'complete', 560);

-- 2. Create synthetic ingestion jobs for legacy memes
-- Mapping unbatched memes to the new synthetic batches based on uploaded_at order
INSERT OR IGNORE INTO ingestion_jobs (
  job_id,
  idempotency_key,
  batch_id,
  meme_id,
  original_filename,
  title,
  content_hash,
  byte_size,
  mime_type,
  media_type,
  upload_state,
  state,
  storage_path
)
SELECT 
  'job-legacy-' || m.id,
  'key-legacy-' || m.id,
  CASE 
    WHEN (ROW_NUMBER() OVER (ORDER BY m.uploaded_at ASC, m.id ASC)) <= 1000 THEN 'legacy-batch-1'
    WHEN (ROW_NUMBER() OVER (ORDER BY m.uploaded_at ASC, m.id ASC)) <= 2000 THEN 'legacy-batch-2'
    WHEN (ROW_NUMBER() OVER (ORDER BY m.uploaded_at ASC, m.id ASC)) <= 3000 THEN 'legacy-batch-3'
    WHEN (ROW_NUMBER() OVER (ORDER BY m.uploaded_at ASC, m.id ASC)) <= 4000 THEN 'legacy-batch-4'
    ELSE 'legacy-batch-5'
  END AS batch_id,
  m.id,
  COALESCE(m.id || '.jpg', 'legacy.jpg'),
  COALESCE(m.title, m.id),
  'legacy-hash-' || m.id,
  0,
  'image/jpeg',
  'image',
  'uploaded',
  CASE WHEN m.status = 'draft' THEN 'queued' ELSE 'human_ready' END,
  COALESCE(m.storage_path, m.image_url)
FROM memes m
WHERE m.id NOT IN (SELECT meme_id FROM ingestion_jobs);

-- 3. Sync exact item counts for each legacy batch
UPDATE ingestion_batches
SET total_items = (SELECT COUNT(*) FROM ingestion_jobs WHERE batch_id = ingestion_batches.id)
WHERE id LIKE 'legacy-batch-%';
