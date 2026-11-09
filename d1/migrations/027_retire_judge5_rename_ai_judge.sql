-- Migration 027: Retire Judge 5 and Rename Judge 4 to AI Judge
-- Retires Judge 5 from active curation while preserving all historical audit records.
-- Updates user-judge4 to username 'ai-judge' and display name 'AI Judge' (password hash untouched).
-- Promotes any draft memes where Judge 4 already succeeded to archived / human_ready.

-- 1. Update user-judge4 identity
UPDATE cat_users 
SET username = 'ai-judge', display_name = 'AI Judge' 
WHERE id = 'user-judge4';

-- 2. Retire user-judge5 by setting is_active = 0 (prevents login, keeps foreign key references intact)
UPDATE cat_users 
SET is_active = 0 
WHERE id = 'user-judge5';

-- 3. Promote any existing intake jobs where Judge 4 succeeded to human_ready
UPDATE ingestion_jobs 
SET state = 'human_ready' 
WHERE state = 'queued' 
  AND job_id IN (
    SELECT job_id FROM ingestion_ai_evaluations 
    WHERE judge_key = 'judge4' AND state = 'succeeded'
  );

-- 4. Promote corresponding memes from draft to archived so human judges can curate them immediately
UPDATE memes 
SET status = 'archived' 
WHERE status = 'draft' 
  AND id IN (
    SELECT meme_id FROM ingestion_jobs WHERE state = 'human_ready'
  );
