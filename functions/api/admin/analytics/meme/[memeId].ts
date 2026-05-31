/**
 * GET /api/admin/analytics/meme/:memeId
 *
 * Full detailed analytics for a single meme.
 * Includes all meme_analytics fields, 30-day trend data,
 * percentile rankings, and raw event breakdown.
 * NOT cached — always returns fresh data.
 */

import type { PagesFunction } from "../../../../_shared/pages";
import { json, requireAdmin, type Env } from "../../../../_shared/d1r2";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const memeId = params.memeId as string;
  if (!memeId) {
    return json({ error: "memeId parameter is required." }, { status: 400 });
  }

  // Get analytics data
  const analytics = await env.DB.prepare(
    "SELECT * FROM meme_analytics WHERE meme_id = ?"
  ).bind(memeId).first();

  if (!analytics) {
    return json({ error: "No analytics data found for this meme." }, { status: 404 });
  }

  // Get meme metadata
  const meme = await env.DB.prepare(
    "SELECT id, title, image_url, storage_path, category, status FROM memes WHERE id = ?"
  ).bind(memeId).first<{
    id: string;
    title: string | null;
    image_url: string | null;
    storage_path: string | null;
    category: string | null;
    status: string | null;
  }>();

  // Get last 30 days of daily stats
  const { results: dailyStats } = await env.DB.prepare(`
    SELECT date, views, likes, shares, downloads, skips, long_views
    FROM meme_daily_stats
    WHERE meme_id = ?
    ORDER BY date DESC
    LIMIT 30
  `).bind(memeId).all<{
    date: string;
    views: number;
    likes: number;
    shares: number;
    downloads: number;
    skips: number;
    long_views: number;
  }>();

  // Compute percentile rankings
  const totalMemes = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM meme_analytics WHERE view_count > 0"
  ).first<{ cnt: number }>();
  const total = totalMemes?.cnt ?? 1;

  const engagementPercentile = await getPercentile(env, "engagement_score", analytics.engagement_score as number, total);
  const viralityPercentile = await getPercentile(env, "virality_score", analytics.virality_score as number, total);
  const retentionPercentile = await getPercentile(env, "retention_score", analytics.retention_score as number, total);
  const trendingPercentile = await getPercentile(env, "trending_score", analytics.trending_score as number, total);

  // Raw event type breakdown
  const { results: eventBreakdown } = await env.DB.prepare(`
    SELECT event_type, COUNT(*) as count
    FROM meme_events
    WHERE meme_id = ?
    GROUP BY event_type
  `).bind(memeId).all<{ event_type: string; count: number }>();

  const eventCounts: Record<string, number> = {};
  for (const row of eventBreakdown || []) {
    eventCounts[row.event_type] = row.count;
  }

  return json({
    meme: {
      id: meme?.id || memeId,
      title: meme?.title || "Untitled",
      url: meme?.image_url || meme?.storage_path || "",
      category: meme?.category || "Unsorted",
      status: meme?.status || "unknown"
    },
    analytics,
    daily_stats: (dailyStats || []).reverse(), // chronological order
    percentiles: {
      engagement: engagementPercentile,
      virality: viralityPercentile,
      retention: retentionPercentile,
      trending: trendingPercentile
    },
    event_breakdown: eventCounts
  });
};

async function getPercentile(
  env: Env,
  metric: string,
  value: number,
  total: number
): Promise<number> {
  const result = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM meme_analytics WHERE ${metric} < ? AND view_count > 0`
  ).bind(value).first<{ cnt: number }>();
  const below = result?.cnt ?? 0;
  return Math.round((below / Math.max(total, 1)) * 100);
}
