-- ============================================================
-- Migration 002: Analytics System
-- Run: npx wrangler d1 execute meme-capsule-db --file=d1/migrations/002_analytics.sql
-- ============================================================

-- NOTE: The existing memes table columns `shown_count`, `share_count`, and
-- `likes_count` are now LEGACY. They will NOT be updated by the analytics
-- system. The aggregation worker will seed initial values from them on first
-- run, then all new data flows through meme_events → meme_analytics.

-- ============================================================
-- Table: meme_events (raw event log — optimised for write performance)
-- ============================================================
CREATE TABLE IF NOT EXISTS meme_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  meme_id         TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN ('view', 'like', 'unlike', 'share', 'download', 'skip', 'long_view', 're_fetch')),
  session_id      TEXT NOT NULL,
  device_id       TEXT NOT NULL,
  time_on_meme_ms INTEGER DEFAULT 0,
  timestamp       INTEGER NOT NULL,
  sequence        INTEGER DEFAULT 0,
  FOREIGN KEY (meme_id) REFERENCES memes(id)
);

-- Deduplication constraint: same device, same meme, same event type, same
-- sequence within a session cannot be inserted twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_meme_events_dedup
  ON meme_events(device_id, meme_id, event_type, session_id, sequence);

CREATE INDEX IF NOT EXISTS idx_meme_events_meme_id ON meme_events(meme_id);
CREATE INDEX IF NOT EXISTS idx_meme_events_event_type ON meme_events(event_type);
CREATE INDEX IF NOT EXISTS idx_meme_events_timestamp ON meme_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_meme_events_device_id ON meme_events(device_id);

-- ============================================================
-- Table: meme_analytics (pre-aggregated — fast reads for dashboard)
-- Only the aggregation worker writes to this table.
-- ============================================================
CREATE TABLE IF NOT EXISTS meme_analytics (
  meme_id               TEXT PRIMARY KEY,
  view_count            INTEGER DEFAULT 0,
  unique_viewer_count   INTEGER DEFAULT 0,
  like_count            INTEGER DEFAULT 0,
  unlike_count          INTEGER DEFAULT 0,
  net_like_count        INTEGER DEFAULT 0,
  share_count           INTEGER DEFAULT 0,
  download_count        INTEGER DEFAULT 0,
  skip_count            INTEGER DEFAULT 0,
  long_view_count       INTEGER DEFAULT 0,
  re_fetch_count        INTEGER DEFAULT 0,
  avg_time_on_meme_ms   REAL DEFAULT 0,
  max_time_on_meme_ms   INTEGER DEFAULT 0,
  engagement_score      REAL DEFAULT 0,
  virality_score        REAL DEFAULT 0,
  retention_score       REAL DEFAULT 0,
  skip_rate             REAL DEFAULT 0,
  like_rate             REAL DEFAULT 0,
  share_rate            REAL DEFAULT 0,
  download_rate         REAL DEFAULT 0,
  overall_rank          INTEGER DEFAULT 0,
  like_rank             INTEGER DEFAULT 0,
  share_rank            INTEGER DEFAULT 0,
  virality_rank         INTEGER DEFAULT 0,
  retention_rank        INTEGER DEFAULT 0,
  engagement_rank       INTEGER DEFAULT 0,
  trending_score        REAL DEFAULT 0,
  trending_rank         INTEGER DEFAULT 0,
  first_seen_at         INTEGER,
  last_seen_at          INTEGER,
  last_aggregated_at    INTEGER,
  FOREIGN KEY (meme_id) REFERENCES memes(id)
);

-- Performance indexes for sorted dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_engagement ON meme_analytics(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_virality ON meme_analytics(virality_score DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_trending ON meme_analytics(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_retention ON meme_analytics(retention_score DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_views ON meme_analytics(view_count DESC);

-- ============================================================
-- Table: meme_daily_stats (day-by-day per meme — for trend charts)
-- ============================================================
CREATE TABLE IF NOT EXISTS meme_daily_stats (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  meme_id     TEXT NOT NULL,
  date        TEXT NOT NULL,
  views       INTEGER DEFAULT 0,
  likes       INTEGER DEFAULT 0,
  shares      INTEGER DEFAULT 0,
  downloads   INTEGER DEFAULT 0,
  skips       INTEGER DEFAULT 0,
  long_views  INTEGER DEFAULT 0,
  UNIQUE(meme_id, date),
  FOREIGN KEY (meme_id) REFERENCES memes(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_meme_id ON meme_daily_stats(meme_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON meme_daily_stats(date);

-- ============================================================
-- Table: app_global_stats (app-wide aggregate metrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_global_stats (
  stat_key    TEXT PRIMARY KEY,
  stat_value  REAL NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- Insert initial rows
INSERT OR IGNORE INTO app_global_stats (stat_key, stat_value, updated_at) VALUES
  ('total_memes', 0, 0),
  ('total_events', 0, 0),
  ('total_views', 0, 0),
  ('total_likes', 0, 0),
  ('total_shares', 0, 0),
  ('total_downloads', 0, 0),
  ('total_skips', 0, 0),
  ('total_unique_devices', 0, 0),
  ('avg_session_length_ms', 0, 0),
  ('most_active_hour', 0, 0),
  ('last_aggregation_run', 0, 0);
