-- Migration 027: Remove Judge 5 Completely and Rename Judge 4 to AI Judge
-- Purges all records and references to Judge 5 across all tables.
-- Updates user-judge4 to username 'ai-judge' and display name 'AI Judge' (password hash untouched).
-- Promotes any draft memes where Judge 4 already succeeded to archived / human_ready.

-- 1. Update user-judge4 identity
UPDATE cat_users 
SET username = 'ai-judge', display_name = 'AI Judge' 
WHERE id = 'user-judge4';

-- 2. Completely remove Judge 5 data across all tables
DELETE FROM cat_judge_ai_presets WHERE user_id = 'user-judge5';
DELETE FROM meme_curation WHERE user_id = 'user-judge5' OR user_name = 'Judge Five';
DELETE FROM ingestion_ai_evaluations WHERE judge_key = 'judge5';
DELETE FROM meme_force_removals WHERE removed_by = 'user-judge5';
DELETE FROM cat_sessions WHERE user_id = 'user-judge5';
DELETE FROM cat_users WHERE id = 'user-judge5' OR username = 'judge5';

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
