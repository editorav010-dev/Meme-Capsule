/**
 * GET /api/admin/analytics/trends
 *
 * App-wide daily trend data for the last N days.
 * Returns aggregate views, likes, shares, downloads, skips per day.
 * Cached in KV for 15 minutes.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, requireAdmin, type Env } from "../../../_shared/d1r2";
import {
  getCached, setCache,
  trendsCacheKey, TRENDS_TTL
} from "../../../_shared/analyticsCache";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "30", 10)));

  // Check cache
  if (env.ANALYTICS_KV) {
    const cached = await getCached(env.ANALYTICS_KV, trendsCacheKey(days));
    if (cached) return json(cached);
  }

  const { results } = await env.DB.prepare(`
    SELECT
      date,
      SUM(views) as total_views,
      SUM(likes) as total_likes,
      SUM(shares) as total_shares,
      SUM(downloads) as total_downloads,
      SUM(skips) as total_skips,
      SUM(long_views) as total_long_views
    FROM meme_daily_stats
    WHERE date >= date('now', '-' || ? || ' days')
    GROUP BY date
    ORDER BY date ASC
  `).bind(days).all<{
    date: string;
    total_views: number;
    total_likes: number;
    total_shares: number;
    total_downloads: number;
    total_skips: number;
    total_long_views: number;
  }>();

  const response = {
    days,
    trends: results || []
  };

  // Cache
  if (env.ANALYTICS_KV) {
    await setCache(env.ANALYTICS_KV, trendsCacheKey(days), response, TRENDS_TTL);
  }

  return json(response);
};
