/**
 * POST /api/admin/analytics/recalculate
 *
 * Manual trigger for the aggregation pipeline.
 * Protected by ADMIN_API_TOKEN. Runs the same logic as the scheduled worker.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, requireAdmin, type Env } from "../../../_shared/d1r2";
import {
  computeAllMetrics,
  assignRanks,
  type RawMemeAggregation
} from "../../../_shared/analyticsFormulas";
import { bustAnalyticsCache } from "../../../_shared/analyticsCache";

const BATCH_WRITE_SIZE = 100;

const AGGREGATION_SQL = `
SELECT
  meme_id,
  COUNT(*) as total_events,
  SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
  SUM(CASE WHEN event_type = 'like' THEN 1 ELSE 0 END) as likes,
  SUM(CASE WHEN event_type = 'unlike' THEN 1 ELSE 0 END) as unlikes,
  SUM(CASE WHEN event_type = 'share' THEN 1 ELSE 0 END) as shares,
  SUM(CASE WHEN event_type = 'download' THEN 1 ELSE 0 END) as downloads,
  SUM(CASE WHEN event_type = 'skip' THEN 1 ELSE 0 END) as skips,
  SUM(CASE WHEN event_type = 'long_view' THEN 1 ELSE 0 END) as long_views,
  SUM(CASE WHEN event_type = 're_fetch' THEN 1 ELSE 0 END) as re_fetches,
  AVG(CASE WHEN event_type = 'view' THEN time_on_meme_ms ELSE NULL END) as avg_time_ms,
  MAX(CASE WHEN event_type = 'view' THEN time_on_meme_ms ELSE 0 END) as max_time_ms,
  COUNT(DISTINCT device_id) as unique_viewers,
  MIN(timestamp) as first_seen,
  MAX(timestamp) as last_seen
FROM meme_events
GROUP BY meme_id
`;

interface AggRow {
  meme_id: string;
  views: number;
  likes: number;
  unlikes: number;
  shares: number;
  downloads: number;
  skips: number;
  long_views: number;
  re_fetches: number;
  avg_time_ms: number | null;
  max_time_ms: number;
  unique_viewers: number;
  first_seen: number | null;
  last_seen: number | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    // 1. Aggregate raw events
    const { results: rawRows } = await env.DB.prepare(AGGREGATION_SQL).all<AggRow>();

    if (!rawRows || rawRows.length === 0) {
      return json({ success: true, message: "No events to aggregate.", processed: 0 });
    }

    // 2. Compute metrics
    const rawAggregations: RawMemeAggregation[] = rawRows.map((row) => ({
      meme_id: row.meme_id,
      views: row.views ?? 0,
      likes: row.likes ?? 0,
      unlikes: row.unlikes ?? 0,
      shares: row.shares ?? 0,
      downloads: row.downloads ?? 0,
      skips: row.skips ?? 0,
      long_views: row.long_views ?? 0,
      re_fetches: row.re_fetches ?? 0,
      avg_time_ms: row.avg_time_ms,
      max_time_ms: row.max_time_ms ?? 0,
      unique_viewers: row.unique_viewers ?? 0,
      first_seen: row.first_seen,
      last_seen: row.last_seen
    }));

    const computedMemes = rawAggregations.map((raw) => ({
      meme_id: raw.meme_id,
      ...computeAllMetrics(raw)
    }));

    // 3. Assign ranks
    const rankedMemes = assignRanks(computedMemes);

    // 4. Write to meme_analytics in batches
    let processed = 0;
    for (let i = 0; i < rankedMemes.length; i += BATCH_WRITE_SIZE) {
      const batch = rankedMemes.slice(i, i + BATCH_WRITE_SIZE);
      const statements = batch.map((m) =>
        env.DB.prepare(
          `INSERT OR REPLACE INTO meme_analytics (
            meme_id, view_count, unique_viewer_count, like_count, unlike_count,
            net_like_count, share_count, download_count, skip_count, long_view_count,
            re_fetch_count, avg_time_on_meme_ms, max_time_on_meme_ms,
            engagement_score, virality_score, retention_score,
            skip_rate, like_rate, share_rate, download_rate,
            overall_rank, like_rank, share_rank, virality_rank,
            retention_rank, engagement_rank, trending_score, trending_rank,
            first_seen_at, last_seen_at, last_aggregated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          m.meme_id, m.view_count, m.unique_viewer_count, m.like_count, m.unlike_count,
          m.net_like_count, m.share_count, m.download_count, m.skip_count, m.long_view_count,
          m.re_fetch_count, m.avg_time_on_meme_ms, m.max_time_on_meme_ms,
          m.engagement_score, m.virality_score, m.retention_score,
          m.skip_rate, m.like_rate, m.share_rate, m.download_rate,
          m.overall_rank, m.like_rank, m.share_rank, m.virality_rank,
          m.retention_rank, m.engagement_rank, m.trending_score, m.trending_rank,
          m.first_seen_at, m.last_seen_at, m.last_aggregated_at
        )
      );
      await env.DB.batch(statements);
      processed += batch.length;
    }

    // 5. Update global stats
    const now = Date.now();
    const totalViews = rankedMemes.reduce((s, m) => s + m.view_count, 0);
    const totalLikes = rankedMemes.reduce((s, m) => s + m.like_count, 0);
    const totalShares = rankedMemes.reduce((s, m) => s + m.share_count, 0);
    const totalDownloads = rankedMemes.reduce((s, m) => s + m.download_count, 0);
    const totalSkips = rankedMemes.reduce((s, m) => s + m.skip_count, 0);

    const devicesResult = await env.DB.prepare(
      "SELECT COUNT(DISTINCT device_id) as cnt FROM meme_events"
    ).first<{ cnt: number }>();
    const memesResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes WHERE is_active = 1"
    ).first<{ cnt: number }>();
    const eventsResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM meme_events"
    ).first<{ cnt: number }>();

    const globalStats: [string, number][] = [
      ["total_memes", memesResult?.cnt ?? 0],
      ["total_events", eventsResult?.cnt ?? 0],
      ["total_views", totalViews],
      ["total_likes", totalLikes],
      ["total_shares", totalShares],
      ["total_downloads", totalDownloads],
      ["total_skips", totalSkips],
      ["total_unique_devices", devicesResult?.cnt ?? 0],
      ["last_aggregation_run", now]
    ];

    const globalStatements = globalStats.map(([key, value]) =>
      env.DB.prepare(
        "INSERT OR REPLACE INTO app_global_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)"
      ).bind(key, value, now)
    );
    await env.DB.batch(globalStatements);

    // 6. Bust cache
    if (env.ANALYTICS_KV) {
      await bustAnalyticsCache(env.ANALYTICS_KV);
    }

    const duration = Date.now() - startTime;

    return json({
      success: true,
      message: `Aggregation complete. ${processed} memes processed in ${duration}ms.`,
      processed,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Recalculate error:", message);
    return json({ error: message }, { status: 500 });
  }
};
