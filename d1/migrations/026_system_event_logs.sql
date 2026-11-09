-- Migration 026: Create system_event_logs table for central automation telemetry
-- Supports AI Curation, Bulk Upload, Google Drive Cron, and Background sync tracking.

CREATE TABLE IF NOT EXISTS system_event_logs (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  workflow     TEXT NOT NULL,         -- 'ai_curation' | 'bulk_upload' | 'gdrive_ingestion' | 'deduplication'
  severity     TEXT NOT NULL,         -- 'info' | 'warning' | 'error' | 'fatal'
  actor        TEXT NOT NULL,         -- 'judge4' | 'judge5' | 'cron_worker' | 'admin' | 'browser_runner'
  batch_id     TEXT,
  item_id      TEXT,
  provider     TEXT,
  model        TEXT,
  status_code  INTEGER,
  message      TEXT NOT NULL,
  details_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_system_logs_workflow_created 
ON system_event_logs (workflow, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_severity 
ON system_event_logs (severity, created_at DESC);
