/**
 * GET /api/admin/analytics/rankings
 *
 * Full ranked list of all memes. Supports pagination, sorting, and filtering.
 * Cached in KV for 15 minutes (keyed by params).
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, requireAdmin, type Env } from "../../../_shared/d1r2";
import {
  getCached, setCache,
  rankingsCacheKey, RANKINGS_TTL
} from "../../../_shared/analyticsCache";

const SORTABLE_FIELDS = new Set([
  "engagement", "virality", "retention", "trending",
  "views", "likes", "shares", "downloads", "skip_rate", "avg_time"
]);

const SORT_MAP: Record<string, string> = {
  engagement: "engagement_score",
  virality: "virality_score",
  retention: "retention_score",
  trending: "trending_score",
  views: "view_count",
  likes: "like_count",
  shares: "share_count",
  downloads: "download_count",
  skip_rate: "skip_rate",
  avg_time: "avg_time_on_meme_ms"
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const sortBy = url.searchParams.get("sort_by") || "engagement";
  const order = url.searchParams.get("order") || "desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "50", 10)));
  const minViews = Math.max(0, parseInt(url.searchParams.get("min_views") || "0", 10));

  if (!SORTABLE_FIELDS.has(sortBy)) {
    return json({ error: `Invalid sort_by. Must be one of: ${[...SORTABLE_FIELDS].join(", ")}` }, { status: 400 });
  }

  if (order !== "asc" && order !== "desc") {
    return json({ error: "Invalid order. Must be 'asc' or 'desc'." }, { status: 400 });
  }

  const cacheParams = { sort_by: sortBy, order, page, per_page: perPage, min_views: minViews };

  // Check cache
  if (env.ANALYTICS_KV) {
    const cached = await getCached(env.ANALYTICS_KV, rankingsCacheKey(cacheParams));
    if (cached) return json(cached);
  }

  const dbSortCol = SORT_MAP[sortBy];
  const offset = (page - 1) * perPage;

  // Get total count
  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM meme_analytics WHERE view_count >= ?"
  ).bind(minViews).first<{ cnt: number }>();
  const total = countResult?.cnt ?? 0;

  // Get paginated results
  const { results } = await env.DB.prepare(`
    SELECT ma.*, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.view_count >= ?
    ORDER BY ma.${dbSortCol} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `).bind(minViews, perPage, offset).all();

  const memes = (results || []).map((row: Record<string, unknown>) => ({
    ...row,
    url: (row.image_url as string) || (row.storage_path as string) || ""
  }));

  const response = {
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
    sort_by: sortBy,
    memes
  };

  // Cache
  if (env.ANALYTICS_KV) {
    await setCache(env.ANALYTICS_KV, rankingsCacheKey(cacheParams), response, RANKINGS_TTL);
  }

  return json(response);
};
