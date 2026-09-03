-- Migration 006: Judge AI Model Presets
-- Enables individual judges to save and manage custom AI vision model configurations privately.

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

CREATE INDEX IF NOT EXISTS idx_judge_ai_presets_user ON cat_judge_ai_presets(user_id);
