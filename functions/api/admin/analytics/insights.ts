/**
 * GET /api/admin/analytics/insights
 *
 * Pre-computed actionable insights. Surfaces observations like
 * top performers, rising memes, hidden gems, worst performers, stale memes.
 * Cached in KV for 30 minutes.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, requireAdmin, type Env } from "../../../_shared/d1r2";
import {
  getCached, setCache,
  insightsCacheKey, INSIGHTS_TTL
} from "../../../_shared/analyticsCache";

interface Insight {
  type: "top_performer" | "rising" | "declining" | "hidden_gem" | "worst_performer" | "stale" | "viral_spike";
  meme_id: string;
  url: string;
  title: string;
  message: string;
  metric: string;
  value: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  // Check cache
  if (env.ANALYTICS_KV) {
    const cached = await getCached(env.ANALYTICS_KV, insightsCacheKey());
    if (cached) return json(cached);
  }

  const insights: Insight[] = [];

  // Get total meme count for percentile calculations
  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM meme_analytics WHERE view_count > 0"
  ).first<{ cnt: number }>();
  const totalMemes = countResult?.cnt ?? 0;

  if (totalMemes === 0) {
    return json({ insights: [] });
  }

  // Top 1% threshold for engagement
  const top1Idx = Math.max(0, Math.floor(totalMemes * 0.01));
  const top1Result = await env.DB.prepare(`
    SELECT engagement_score FROM meme_analytics
    WHERE view_count > 0
    ORDER BY engagement_score DESC
    LIMIT 1 OFFSET ?
  `).bind(top1Idx).first<{ engagement_score: number }>();
  const top1Threshold = top1Result?.engagement_score ?? 100;

  // top_performer: engagement_score in top 1%
  const { results: topPerformers } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.engagement_score, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.engagement_score >= ? AND ma.view_count > 0
    ORDER BY ma.engagement_score DESC
    LIMIT 5
  `).bind(top1Threshold).all<{
    meme_id: string;
    engagement_score: number;
    image_url: string | null;
    storage_path: string | null;
    title: string | null;
  }>();

  for (const row of topPerformers || []) {
    insights.push({
      type: "top_performer",
      meme_id: row.meme_id,
      url: row.image_url || row.storage_path || "",
      title: row.title || "Untitled",
      message: `Top 1% engagement — score of ${row.engagement_score.toFixed(1)}`,
      metric: "engagement_score",
      value: row.engagement_score
    });
  }

  // hidden_gem: high engagement (top 20%) but low views (bottom 30%)
  const top20Idx = Math.max(0, Math.floor(totalMemes * 0.20));
  const top20Result = await env.DB.prepare(`
    SELECT engagement_score FROM meme_analytics
    WHERE view_count > 0
    ORDER BY engagement_score DESC
    LIMIT 1 OFFSET ?
  `).bind(top20Idx).first<{ engagement_score: number }>();
  const top20Threshold = top20Result?.engagement_score ?? 50;

  const bottom30Idx = Math.max(0, Math.floor(totalMemes * 0.30));
  const bottom30Result = await env.DB.prepare(`
    SELECT view_count FROM meme_analytics
    WHERE view_count > 0
    ORDER BY view_count ASC
    LIMIT 1 OFFSET ?
  `).bind(bottom30Idx).first<{ view_count: number }>();
  const bottom30Threshold = bottom30Result?.view_count ?? 10;

  const { results: hiddenGems } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.engagement_score, ma.view_count, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.engagement_score >= ? AND ma.view_count <= ? AND ma.view_count > 0
    ORDER BY ma.engagement_score DESC
    LIMIT 5
  `).bind(top20Threshold, bottom30Threshold).all<{
    meme_id: string;
    engagement_score: number;
    view_count: number;
    image_url: string | null;
    storage_path: string | null;
    title: string | null;
  }>();

  for (const row of hiddenGems || []) {
    insights.push({
      type: "hidden_gem",
      meme_id: row.meme_id,
      url: row.image_url || row.storage_path || "",
      title: row.title || "Untitled",
      message: `High engagement (${row.engagement_score.toFixed(1)}) but only ${row.view_count} views — underseen quality meme`,
      metric: "engagement_score",
      value: row.engagement_score
    });
  }

  // worst_performer: skip_rate > 0.6 and view_count > 50
  const { results: worstPerformers } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.skip_rate, ma.view_count, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.skip_rate > 0.6 AND ma.view_count > 50
    ORDER BY ma.skip_rate DESC
    LIMIT 5
  `).all<{
    meme_id: string;
    skip_rate: number;
    view_count: number;
    image_url: string | null;
    storage_path: string | null;
    title: string | null;
  }>();

  for (const row of worstPerformers || []) {
    insights.push({
      type: "worst_performer",
      meme_id: row.meme_id,
      url: row.image_url || row.storage_path || "",
      title: row.title || "Untitled",
      message: `${(row.skip_rate * 100).toFixed(0)}% skip rate with ${row.view_count} views — users are rejecting this meme immediately`,
      metric: "skip_rate",
      value: row.skip_rate
    });
  }

  // stale: no events in 7 days but 100+ historical views
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const { results: staleMemes } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.view_count, ma.last_seen_at, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.view_count >= 100 AND (ma.last_seen_at IS NULL OR ma.last_seen_at < ?)
    ORDER BY ma.view_count DESC
    LIMIT 5
  `).bind(sevenDaysAgo).all<{
    meme_id: string;
    view_count: number;
    last_seen_at: number | null;
    image_url: string | null;
    storage_path: string | null;
    title: string | null;
  }>();

  for (const row of staleMemes || []) {
    const daysSince = row.last_seen_at
      ? Math.floor((Date.now() - row.last_seen_at) / (24 * 60 * 60 * 1000))
      : 999;
    insights.push({
      type: "stale",
      meme_id: row.meme_id,
      url: row.image_url || row.storage_path || "",
      title: row.title || "Untitled",
      message: `${row.view_count} historical views but no activity in ${daysSince} days`,
      metric: "last_seen_at",
      value: daysSince
    });
  }

  const response = { insights };

  // Cache
  if (env.ANALYTICS_KV) {
    await setCache(env.ANALYTICS_KV, insightsCacheKey(), response, INSIGHTS_TTL);
  }

  return json(response);
};
