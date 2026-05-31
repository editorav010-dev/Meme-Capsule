/**
 * GET /api/admin/analytics/overview
 *
 * Top-level dashboard summary. Reads from app_global_stats and
 * meme_analytics for top memes and distribution data.
 * Cached in KV for 15 minutes.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, requireAdmin, type Env } from "../../../_shared/d1r2";
import {
  getCached, setCache,
  overviewCacheKey, OVERVIEW_TTL
} from "../../../_shared/analyticsCache";

interface MemeRankRow {
  meme_id: string;
  url: string;
  title: string;
  score: number;
  rank: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  // Check cache
  if (env.ANALYTICS_KV) {
    const cached = await getCached(env.ANALYTICS_KV, overviewCacheKey());
    if (cached) return json(cached);
  }

  // Global stats
  const { results: globalRows } = await env.DB.prepare(
    "SELECT stat_key, stat_value FROM app_global_stats"
  ).all<{ stat_key: string; stat_value: number }>();

  const globalMap = new Map<string, number>();
  for (const row of globalRows || []) {
    globalMap.set(row.stat_key, row.stat_value);
  }

  const lastAgg = globalMap.get("last_aggregation_run") ?? 0;

  // Top memes by various metrics
  const topByEngagement = await getTopMemes(env, "engagement_score", 5);
  const topByVirality = await getTopMemes(env, "virality_score", 5);
  const topByRetention = await getTopMemes(env, "retention_score", 5);
  const topByTrending = await getTopMemes(env, "trending_score", 5);
  const mostSkipped = await getTopMemes(env, "skip_rate", 5);

  // Distribution stats
  const distResult = await env.DB.prepare(`
    SELECT
      AVG(view_count) as avg_view_count,
      SUM(CASE WHEN view_count = 0 THEN 1 ELSE 0 END) as zero_views
    FROM meme_analytics
  `).first<{ avg_view_count: number; zero_views: number }>();

  const avgEngResult = await env.DB.prepare(`
    SELECT engagement_score FROM meme_analytics
    ORDER BY engagement_score
  `).all<{ engagement_score: number }>();

  const scores = (avgEngResult.results || []).map((r) => r.engagement_score);
  const medianEng = scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0;
  const avgEng = globalMap.get("avg_engagement_score") ?? 0;
  const aboveAvg = scores.filter((s) => s > avgEng).length;

  const response = {
    global: {
      total_memes: globalMap.get("total_memes") ?? 0,
      total_views: globalMap.get("total_views") ?? 0,
      total_likes: globalMap.get("total_likes") ?? 0,
      total_shares: globalMap.get("total_shares") ?? 0,
      total_downloads: globalMap.get("total_downloads") ?? 0,
      total_skips: globalMap.get("total_skips") ?? 0,
      total_unique_devices: globalMap.get("total_unique_devices") ?? 0,
      avg_engagement_score: avgEng,
      last_aggregated_at: lastAgg ? new Date(lastAgg).toISOString() : null
    },
    top_memes: {
      by_engagement: topByEngagement,
      by_virality: topByVirality,
      by_retention: topByRetention,
      by_trending: topByTrending,
      most_skipped: mostSkipped
    },
    distribution: {
      avg_view_count: distResult?.avg_view_count ?? 0,
      median_engagement_score: medianEng,
      memes_with_zero_views: distResult?.zero_views ?? 0,
      memes_above_avg_engagement: aboveAvg
    }
  };

  // Cache
  if (env.ANALYTICS_KV) {
    await setCache(env.ANALYTICS_KV, overviewCacheKey(), response, OVERVIEW_TTL);
  }

  return json(response);
};

async function getTopMemes(env: Env, metric: string, limit: number): Promise<MemeRankRow[]> {
  const { results } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.${metric} as score,
           m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.view_count > 0
    ORDER BY ma.${metric} DESC
    LIMIT ?
  `).bind(limit).all<{
    meme_id: string;
    score: number;
    image_url: string | null;
    storage_path: string | null;
    title: string | null;
  }>();

  return (results || []).map((r, i) => ({
    meme_id: r.meme_id,
    url: r.image_url || r.storage_path || "",
    title: r.title || "Untitled",
    score: r.score,
    rank: i + 1
  }));
}
