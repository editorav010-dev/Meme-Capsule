/**
 * POST /api/admin/analytics/reset
 *
 * Resets all analytics data in D1 database:
 * - Deletes all rows from meme_events
 * - Deletes all rows from meme_analytics
 * - Deletes all rows from meme_daily_stats
 * - Reinitializes app_global_stats back to default zeros
 * - Flushes the Cloudflare KV cache
 *
 * NOTE: The memes table (metadata) and R2 storage assets remain completely untouched.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, requireAdmin, type Env } from "../../../_shared/d1r2";
import { bustAnalyticsCache } from "../../../_shared/analyticsCache";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    // 1. Get count of active memes for global stats baseline
    const memesCountResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes WHERE is_active = 1"
    ).first<{ cnt: number }>();
    const totalMemes = memesCountResult?.cnt ?? 0;

    const now = Date.now();

    // 2. Execute deletion and reinitialization statements in a batch transaction
    const statements = [
      env.DB.prepare("DELETE FROM meme_events"),
      env.DB.prepare("DELETE FROM meme_analytics"),
      env.DB.prepare("DELETE FROM meme_daily_stats"),
      env.DB.prepare("DELETE FROM app_global_stats"),
      env.DB.prepare(
        `INSERT INTO app_global_stats (stat_key, stat_value, updated_at) VALUES
          ('total_memes', ?, ?),
          ('total_events', 0, ?),
          ('total_views', 0, ?),
          ('total_likes', 0, ?),
          ('total_shares', 0, ?),
          ('total_downloads', 0, ?),
          ('total_skips', 0, ?),
          ('total_unique_devices', 0, ?),
          ('avg_session_length_ms', 0, ?),
          ('most_active_hour', 0, ?),
          ('last_aggregation_run', 0, ?)`
      ).bind(
        totalMemes, now,
        now,
        now,
        now,
        now,
        now,
        now,
        now,
        now,
        now,
        now
      )
    ];

    await env.DB.batch(statements);

    // 3. Invalidate KV cache
    if (env.ANALYTICS_KV) {
      await bustAnalyticsCache(env.ANALYTICS_KV);
    }

    const duration = Date.now() - startTime;

    return json({
      success: true,
      message: `Analytics reset successfully in ${duration}ms. All events, scores, and rankings cleared.`,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Analytics reset error:", message);
    return json({ error: message }, { status: 500 });
  }
};
