var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _shared/fallbackMemes.ts
var seeds = [
  {
    id: "meme-001",
    lines: ["I opened the app", "for one meme", "three shares later"],
    category: "Quick Laughs",
    tags: ["share", "loop"],
    rarity: "Common",
    palette: { bg: "#fff8e7", panel: "#ffffff", ink: "#16120f", accent: "#ffcc4d" }
  },
  {
    id: "meme-002",
    lines: ["Brain at 2 AM", "new app idea", "no budget, full confidence"],
    category: "Builder Mood",
    tags: ["startup", "late-night"],
    rarity: "Rare",
    palette: { bg: "#e9f7ff", panel: "#f8fdff", ink: "#10202b", accent: "#42b8dd" }
  },
  {
    id: "meme-009",
    lines: ["Admin curation", "no random scraping", "taste has entered chat"],
    category: "Curation",
    tags: ["curated", "quality"],
    rarity: "Legendary",
    palette: { bg: "#fff6e9", panel: "#16120f", ink: "#fff8e7", accent: "#ffcc4d" }
  },
  {
    id: "meme-015",
    lines: ["No comments section", "no drama", "just the meme"],
    category: "Minimalism",
    tags: ["clean", "simple"],
    rarity: "Legendary",
    palette: { bg: "#f7f7f7", panel: "#ffffff", ink: "#151515", accent: "#ff5f5f" }
  }
];
var escapeSvg = /* @__PURE__ */ __name((value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"), "escapeSvg");
var svgMeme = /* @__PURE__ */ __name((seed) => {
  const [headline = "", punchline = "", footnote = ""] = seed.lines;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${seed.palette.bg}"/><rect x="126" y="180" width="828" height="720" rx="48" fill="${seed.palette.panel}"/><rect x="186" y="238" width="708" height="18" rx="9" fill="${seed.palette.accent}"/><text x="540" y="390" text-anchor="middle" font-size="80" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">${escapeSvg(headline)}</text><text x="540" y="524" text-anchor="middle" font-size="108" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">${escapeSvg(punchline)}</text><text x="540" y="654" text-anchor="middle" font-size="48" font-family="Arial, Helvetica, sans-serif" font-weight="800" fill="${seed.palette.ink}" opacity="0.82">${escapeSvg(footnote)}</text><rect x="372" y="738" width="336" height="84" rx="42" fill="${seed.palette.accent}"/><text x="540" y="795" text-anchor="middle" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="${seed.palette.ink}">CURATED CHAOS</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}, "svgMeme");
var fallbackMemes = seeds.map((seed) => ({
  id: seed.id,
  url: svgMeme(seed),
  category: seed.category,
  tags: seed.tags,
  rarity: seed.rarity,
  uploaded_at: "2026-05-02T00:00:00.000Z",
  share_text: `${seed.lines[0]} - ${seed.lines[1]}`,
  rights_note: "original-starter-pack"
}));
var randomFallbackMeme = /* @__PURE__ */ __name(() => fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)], "randomFallbackMeme");
var dailyFallbackMeme = /* @__PURE__ */ __name(() => {
  const now = /* @__PURE__ */ new Date();
  const dayStamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return fallbackMemes[Math.floor(dayStamp / 864e5) % fallbackMemes.length];
}, "dailyFallbackMeme");

// _shared/d1r2.ts
var jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
var json = /* @__PURE__ */ __name((body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    ...jsonHeaders,
    ...init.headers
  }
}), "json");
var requireAdmin = /* @__PURE__ */ __name((request, env) => {
  if (!env.ADMIN_API_TOKEN) {
    return json({ error: "ADMIN_API_TOKEN is not configured." }, { status: 503 });
  }
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const headerToken = request.headers.get("X-Admin-Token") || "";
  if (bearer !== env.ADMIN_API_TOKEN && headerToken !== env.ADMIN_API_TOKEN) {
    return json({ error: "Unauthorized admin request." }, { status: 401 });
  }
  return null;
}, "requireAdmin");
var parseTags = /* @__PURE__ */ __name((raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}, "parseTags");
var toPublicUrl = /* @__PURE__ */ __name((env, storagePath) => {
  const base = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  const trimmedPath = storagePath.replace(/^\/+/, "");
  return base ? `${base}/${trimmedPath}` : "";
}, "toPublicUrl");
var normalizeRow = /* @__PURE__ */ __name((env, row) => ({
  id: row.id,
  title: row.title || void 0,
  url: row.image_url || (row.storage_path ? toPublicUrl(env, row.storage_path) : ""),
  storage_path: row.storage_path || void 0,
  source_link: row.source_link || row.image_url || row.storage_path || void 0,
  category: row.category || "Unsorted",
  tags: parseTags(row.tags),
  rarity: row.rarity || "Common",
  status: row.status || "active",
  media_type: row.media_type || "image",
  input_method: row.input_method || "url",
  uploaded_at: row.uploaded_at || (/* @__PURE__ */ new Date()).toISOString(),
  share_text: row.share_text || "Spawned from Meme Capsule",
  rights_note: row.rights_note || void 0,
  likes_count: row.likes_count ?? 0
}), "normalizeRow");
var getRandomMeme = /* @__PURE__ */ __name(async (env) => {
  const randomKey = Math.random();
  const { results } = await env.DB.prepare(
    `SELECT * FROM memes
     WHERE is_active = 1 AND status = 'active' AND random_key >= ?
     ORDER BY random_key ASC LIMIT 1`
  ).bind(randomKey).all();
  let row = results[0];
  if (!row) {
    const wrap = await env.DB.prepare(
      `SELECT * FROM memes
       WHERE is_active = 1 AND status = 'active'
       ORDER BY random_key ASC LIMIT 1`
    ).all();
    row = wrap.results[0];
  }
  if (!row) return null;
  const meme = normalizeRow(env, row);
  return meme.url ? meme : null;
}, "getRandomMeme");
var getDailyMeme = /* @__PURE__ */ __name(async (env) => {
  const { results } = await env.DB.prepare(
    `SELECT * FROM memes
     WHERE is_active = 1 AND status = 'active'
     ORDER BY uploaded_at DESC LIMIT 50`
  ).all();
  if (results.length === 0) return null;
  const now = /* @__PURE__ */ new Date();
  const dayStamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const row = results[Math.floor(dayStamp / 864e5) % results.length];
  const meme = normalizeRow(env, row);
  return meme.url ? meme : null;
}, "getDailyMeme");
var randomMemeOrFallback = /* @__PURE__ */ __name(async (env) => {
  try {
    return await getRandomMeme(env) || randomFallbackMeme();
  } catch {
    return randomFallbackMeme();
  }
}, "randomMemeOrFallback");
var dailyMemeOrFallback = /* @__PURE__ */ __name(async (env) => {
  try {
    return await getDailyMeme(env) || dailyFallbackMeme();
  } catch {
    return dailyFallbackMeme();
  }
}, "dailyMemeOrFallback");

// api/admin/analytics/meme/[memeId].ts
var onRequestGet = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;
  const memeId = params.memeId;
  if (!memeId) {
    return json({ error: "memeId parameter is required." }, { status: 400 });
  }
  const analytics = await env.DB.prepare(
    "SELECT * FROM meme_analytics WHERE meme_id = ?"
  ).bind(memeId).first();
  if (!analytics) {
    return json({ error: "No analytics data found for this meme." }, { status: 404 });
  }
  const meme = await env.DB.prepare(
    "SELECT id, title, image_url, storage_path, category, status FROM memes WHERE id = ?"
  ).bind(memeId).first();
  const { results: dailyStats } = await env.DB.prepare(`
    SELECT date, views, likes, shares, downloads, skips, long_views
    FROM meme_daily_stats
    WHERE meme_id = ?
    ORDER BY date DESC
    LIMIT 30
  `).bind(memeId).all();
  const totalMemes = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM meme_analytics WHERE view_count > 0"
  ).first();
  const total = totalMemes?.cnt ?? 1;
  const engagementPercentile = await getPercentile(env, "engagement_score", analytics.engagement_score, total);
  const viralityPercentile = await getPercentile(env, "virality_score", analytics.virality_score, total);
  const retentionPercentile = await getPercentile(env, "retention_score", analytics.retention_score, total);
  const trendingPercentile = await getPercentile(env, "trending_score", analytics.trending_score, total);
  const { results: eventBreakdown } = await env.DB.prepare(`
    SELECT event_type, COUNT(*) as count
    FROM meme_events
    WHERE meme_id = ?
    GROUP BY event_type
  `).bind(memeId).all();
  const eventCounts = {};
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
    daily_stats: (dailyStats || []).reverse(),
    // chronological order
    percentiles: {
      engagement: engagementPercentile,
      virality: viralityPercentile,
      retention: retentionPercentile,
      trending: trendingPercentile
    },
    event_breakdown: eventCounts
  });
}, "onRequestGet");
async function getPercentile(env, metric, value, total) {
  const result = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM meme_analytics WHERE ${metric} < ? AND view_count > 0`
  ).bind(value).first();
  const below = result?.cnt ?? 0;
  return Math.round(below / Math.max(total, 1) * 100);
}
__name(getPercentile, "getPercentile");

// _shared/analyticsCache.ts
var OVERVIEW_TTL = 900;
var RANKINGS_TTL = 900;
var INSIGHTS_TTL = 1800;
var TRENDS_TTL = 900;
var CACHE_PREFIX = "analytics:";
var overviewCacheKey = /* @__PURE__ */ __name(() => `${CACHE_PREFIX}overview`, "overviewCacheKey");
var rankingsCacheKey = /* @__PURE__ */ __name((params) => `${CACHE_PREFIX}rankings:${params.sort_by}:${params.order}:${params.page}:${params.per_page}:${params.min_views}`, "rankingsCacheKey");
var insightsCacheKey = /* @__PURE__ */ __name(() => `${CACHE_PREFIX}insights`, "insightsCacheKey");
var trendsCacheKey = /* @__PURE__ */ __name((days) => `${CACHE_PREFIX}trends:${days}`, "trendsCacheKey");
var getCached = /* @__PURE__ */ __name(async (kv, key) => {
  try {
    const raw = await kv.get(key, "text");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}, "getCached");
var setCache = /* @__PURE__ */ __name(async (kv, key, data, ttlSeconds) => {
  try {
    await kv.put(key, JSON.stringify(data), {
      expirationTtl: ttlSeconds
    });
  } catch {
    console.error(`Cache write failed for key: ${key}`);
  }
}, "setCache");
var bustAnalyticsCache = /* @__PURE__ */ __name(async (kv) => {
  const knownKeys = [
    overviewCacheKey(),
    insightsCacheKey(),
    // Bust trend caches for common day ranges
    trendsCacheKey(7),
    trendsCacheKey(30),
    trendsCacheKey(90)
  ];
  try {
    const listed = await kv.list({ prefix: `${CACHE_PREFIX}rankings:` });
    for (const key of listed.keys) {
      knownKeys.push(key.name);
    }
  } catch {
  }
  await Promise.allSettled(
    knownKeys.map((key) => kv.delete(key))
  );
}, "bustAnalyticsCache");

// api/admin/analytics/insights.ts
var onRequestGet2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;
  if (env.ANALYTICS_KV) {
    const cached = await getCached(env.ANALYTICS_KV, insightsCacheKey());
    if (cached) return json(cached);
  }
  const insights = [];
  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM meme_analytics WHERE view_count > 0"
  ).first();
  const totalMemes = countResult?.cnt ?? 0;
  if (totalMemes === 0) {
    return json({ insights: [] });
  }
  const top1Idx = Math.max(0, Math.floor(totalMemes * 0.01));
  const top1Result = await env.DB.prepare(`
    SELECT engagement_score FROM meme_analytics
    WHERE view_count > 0
    ORDER BY engagement_score DESC
    LIMIT 1 OFFSET ?
  `).bind(top1Idx).first();
  const top1Threshold = top1Result?.engagement_score ?? 100;
  const { results: topPerformers } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.engagement_score, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.engagement_score >= ? AND ma.view_count > 0
    ORDER BY ma.engagement_score DESC
    LIMIT 5
  `).bind(top1Threshold).all();
  for (const row of topPerformers || []) {
    insights.push({
      type: "top_performer",
      meme_id: row.meme_id,
      url: row.image_url || row.storage_path || "",
      title: row.title || "Untitled",
      message: `Top 1% engagement \u2014 score of ${row.engagement_score.toFixed(1)}`,
      metric: "engagement_score",
      value: row.engagement_score
    });
  }
  const top20Idx = Math.max(0, Math.floor(totalMemes * 0.2));
  const top20Result = await env.DB.prepare(`
    SELECT engagement_score FROM meme_analytics
    WHERE view_count > 0
    ORDER BY engagement_score DESC
    LIMIT 1 OFFSET ?
  `).bind(top20Idx).first();
  const top20Threshold = top20Result?.engagement_score ?? 50;
  const bottom30Idx = Math.max(0, Math.floor(totalMemes * 0.3));
  const bottom30Result = await env.DB.prepare(`
    SELECT view_count FROM meme_analytics
    WHERE view_count > 0
    ORDER BY view_count ASC
    LIMIT 1 OFFSET ?
  `).bind(bottom30Idx).first();
  const bottom30Threshold = bottom30Result?.view_count ?? 10;
  const { results: hiddenGems } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.engagement_score, ma.view_count, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.engagement_score >= ? AND ma.view_count <= ? AND ma.view_count > 0
    ORDER BY ma.engagement_score DESC
    LIMIT 5
  `).bind(top20Threshold, bottom30Threshold).all();
  for (const row of hiddenGems || []) {
    insights.push({
      type: "hidden_gem",
      meme_id: row.meme_id,
      url: row.image_url || row.storage_path || "",
      title: row.title || "Untitled",
      message: `High engagement (${row.engagement_score.toFixed(1)}) but only ${row.view_count} views \u2014 underseen quality meme`,
      metric: "engagement_score",
      value: row.engagement_score
    });
  }
  const { results: worstPerformers } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.skip_rate, ma.view_count, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.skip_rate > 0.6 AND ma.view_count > 50
    ORDER BY ma.skip_rate DESC
    LIMIT 5
  `).all();
  for (const row of worstPerformers || []) {
    insights.push({
      type: "worst_performer",
      meme_id: row.meme_id,
      url: row.image_url || row.storage_path || "",
      title: row.title || "Untitled",
      message: `${(row.skip_rate * 100).toFixed(0)}% skip rate with ${row.view_count} views \u2014 users are rejecting this meme immediately`,
      metric: "skip_rate",
      value: row.skip_rate
    });
  }
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
  const { results: staleMemes } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.view_count, ma.last_seen_at, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.view_count >= 100 AND (ma.last_seen_at IS NULL OR ma.last_seen_at < ?)
    ORDER BY ma.view_count DESC
    LIMIT 5
  `).bind(sevenDaysAgo).all();
  for (const row of staleMemes || []) {
    const daysSince = row.last_seen_at ? Math.floor((Date.now() - row.last_seen_at) / (24 * 60 * 60 * 1e3)) : 999;
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
  if (env.ANALYTICS_KV) {
    await setCache(env.ANALYTICS_KV, insightsCacheKey(), response, INSIGHTS_TTL);
  }
  return json(response);
}, "onRequestGet");

// api/admin/analytics/overview.ts
var onRequestGet3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;
  if (env.ANALYTICS_KV) {
    const cached = await getCached(env.ANALYTICS_KV, overviewCacheKey());
    if (cached) return json(cached);
  }
  const { results: globalRows } = await env.DB.prepare(
    "SELECT stat_key, stat_value FROM app_global_stats"
  ).all();
  const globalMap = /* @__PURE__ */ new Map();
  for (const row of globalRows || []) {
    globalMap.set(row.stat_key, row.stat_value);
  }
  const lastAgg = globalMap.get("last_aggregation_run") ?? 0;
  const topByEngagement = await getTopMemes(env, "engagement_score", 5);
  const topByVirality = await getTopMemes(env, "virality_score", 5);
  const topByRetention = await getTopMemes(env, "retention_score", 5);
  const topByTrending = await getTopMemes(env, "trending_score", 5);
  const mostSkipped = await getTopMemes(env, "skip_rate", 5);
  const distResult = await env.DB.prepare(`
    SELECT
      AVG(view_count) as avg_view_count,
      SUM(CASE WHEN view_count = 0 THEN 1 ELSE 0 END) as zero_views
    FROM meme_analytics
  `).first();
  const avgEngResult = await env.DB.prepare(`
    SELECT engagement_score FROM meme_analytics
    ORDER BY engagement_score
  `).all();
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
  if (env.ANALYTICS_KV) {
    await setCache(env.ANALYTICS_KV, overviewCacheKey(), response, OVERVIEW_TTL);
  }
  return json(response);
}, "onRequestGet");
async function getTopMemes(env, metric, limit) {
  const { results } = await env.DB.prepare(`
    SELECT ma.meme_id, ma.${metric} as score,
           m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.view_count > 0
    ORDER BY ma.${metric} DESC
    LIMIT ?
  `).bind(limit).all();
  return (results || []).map((r, i) => ({
    meme_id: r.meme_id,
    url: r.image_url || r.storage_path || "",
    title: r.title || "Untitled",
    score: r.score,
    rank: i + 1
  }));
}
__name(getTopMemes, "getTopMemes");

// api/admin/analytics/rankings.ts
var SORTABLE_FIELDS = /* @__PURE__ */ new Set([
  "engagement",
  "virality",
  "retention",
  "trending",
  "views",
  "likes",
  "shares",
  "downloads",
  "skip_rate",
  "avg_time"
]);
var SORT_MAP = {
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
var onRequestGet4 = /* @__PURE__ */ __name(async ({ request, env }) => {
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
  if (env.ANALYTICS_KV) {
    const cached = await getCached(env.ANALYTICS_KV, rankingsCacheKey(cacheParams));
    if (cached) return json(cached);
  }
  const dbSortCol = SORT_MAP[sortBy];
  const offset = (page - 1) * perPage;
  const countResult = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM meme_analytics WHERE view_count >= ?"
  ).bind(minViews).first();
  const total = countResult?.cnt ?? 0;
  const { results } = await env.DB.prepare(`
    SELECT ma.*, m.image_url, m.storage_path, m.title
    FROM meme_analytics ma
    LEFT JOIN memes m ON m.id = ma.meme_id
    WHERE ma.view_count >= ?
    ORDER BY ma.${dbSortCol} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `).bind(minViews, perPage, offset).all();
  const memes = (results || []).map((row) => ({
    ...row,
    url: row.image_url || row.storage_path || ""
  }));
  const response = {
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
    sort_by: sortBy,
    memes
  };
  if (env.ANALYTICS_KV) {
    await setCache(env.ANALYTICS_KV, rankingsCacheKey(cacheParams), response, RANKINGS_TTL);
  }
  return json(response);
}, "onRequestGet");

// _shared/analyticsFormulas.ts
var clamp01 = /* @__PURE__ */ __name((n) => Math.max(0, Math.min(1, n)), "clamp01");
var skipRate = /* @__PURE__ */ __name((skipCount, viewCount) => clamp01(skipCount / Math.max(viewCount, 1)), "skipRate");
var likeRate = /* @__PURE__ */ __name((likeCount, viewCount) => clamp01(likeCount / Math.max(viewCount, 1)), "likeRate");
var shareRate = /* @__PURE__ */ __name((shareCount, viewCount) => clamp01(shareCount / Math.max(viewCount, 1)), "shareRate");
var downloadRate = /* @__PURE__ */ __name((downloadCount, viewCount) => clamp01(downloadCount / Math.max(viewCount, 1)), "downloadRate");
var longViewRate = /* @__PURE__ */ __name((longViewCount, viewCount) => clamp01(longViewCount / Math.max(viewCount, 1)), "longViewRate");
var reFetchRate = /* @__PURE__ */ __name((reFetchCount, viewCount) => clamp01(reFetchCount / Math.max(viewCount, 1)), "reFetchRate");
var engagementScore = /* @__PURE__ */ __name((likes, shares, downloads, longViews, reFetches, views) => {
  const lr = likeRate(likes, views);
  const sr = shareRate(shares, views);
  const dr = downloadRate(downloads, views);
  const lvr = longViewRate(longViews, views);
  const rfr = reFetchRate(reFetches, views);
  return (lr * 0.3 + sr * 0.25 + dr * 0.2 + lvr * 0.15 + rfr * 0.1) * 100;
}, "engagementScore");
var viralityScore = /* @__PURE__ */ __name((shares, downloads, likes, views) => {
  return (shares * 3 + downloads * 2 + likes * 1) / Math.max(views, 1) * 100;
}, "viralityScore");
var retentionScore = /* @__PURE__ */ __name((avgTimeMs, skips, views) => {
  const sr = skipRate(skips, views);
  const raw = avgTimeMs / 15e3 * (1 - sr) * 100;
  return Math.max(0, Math.min(100, raw));
}, "retentionScore");
var trendingScore = /* @__PURE__ */ __name((engScore, lastSeenTimestamp, nowMs) => {
  if (!lastSeenTimestamp) return 0;
  const hoursSinceLastSeen = (nowMs - lastSeenTimestamp) / (1e3 * 60 * 60);
  const lambda = 5e-3;
  const decayFactor = Math.exp(-lambda * Math.max(0, hoursSinceLastSeen));
  return engScore * decayFactor;
}, "trendingScore");
var computeAllMetrics = /* @__PURE__ */ __name((raw) => {
  const nowMs = Date.now();
  const avgTime = raw.avg_time_ms ?? 0;
  const engagement = engagementScore(
    raw.likes,
    raw.shares,
    raw.downloads,
    raw.long_views,
    raw.re_fetches,
    raw.views
  );
  return {
    view_count: raw.views,
    unique_viewer_count: raw.unique_viewers,
    like_count: raw.likes,
    unlike_count: raw.unlikes,
    net_like_count: Math.max(0, raw.likes - raw.unlikes),
    share_count: raw.shares,
    download_count: raw.downloads,
    skip_count: raw.skips,
    long_view_count: raw.long_views,
    re_fetch_count: raw.re_fetches,
    avg_time_on_meme_ms: avgTime,
    max_time_on_meme_ms: raw.max_time_ms,
    engagement_score: engagement,
    virality_score: viralityScore(raw.shares, raw.downloads, raw.likes, raw.views),
    retention_score: retentionScore(avgTime, raw.skips, raw.views),
    skip_rate: skipRate(raw.skips, raw.views),
    like_rate: likeRate(raw.likes, raw.views),
    share_rate: shareRate(raw.shares, raw.views),
    download_rate: downloadRate(raw.downloads, raw.views),
    trending_score: trendingScore(engagement, raw.last_seen, nowMs),
    first_seen_at: raw.first_seen,
    last_seen_at: raw.last_seen,
    last_aggregated_at: nowMs
  };
}, "computeAllMetrics");
var assignRanks = /* @__PURE__ */ __name((memes) => {
  const ranked = memes.map((m) => ({
    ...m,
    overall_rank: 0,
    like_rank: 0,
    share_rank: 0,
    virality_rank: 0,
    retention_rank: 0,
    engagement_rank: 0,
    trending_rank: 0
  }));
  const sortAndAssign = /* @__PURE__ */ __name((arr, key, rankKey) => {
    const sorted = [...arr].sort(
      (a, b) => b[key] - a[key]
    );
    const idToRank = /* @__PURE__ */ new Map();
    sorted.forEach((m, i) => idToRank.set(m.meme_id, i + 1));
    for (const m of arr) {
      m[rankKey] = idToRank.get(m.meme_id) ?? arr.length;
    }
  }, "sortAndAssign");
  sortAndAssign(ranked, "engagement_score", "engagement_rank");
  sortAndAssign(ranked, "engagement_score", "overall_rank");
  sortAndAssign(ranked, "like_count", "like_rank");
  sortAndAssign(ranked, "share_count", "share_rank");
  sortAndAssign(ranked, "virality_score", "virality_rank");
  sortAndAssign(ranked, "retention_score", "retention_rank");
  sortAndAssign(ranked, "trending_score", "trending_rank");
  return ranked;
}, "assignRanks");

// api/admin/analytics/recalculate.ts
var BATCH_WRITE_SIZE = 100;
var AGGREGATION_SQL = `
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
var onRequestPost = /* @__PURE__ */ __name(async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;
  const startTime = Date.now();
  try {
    const { results: rawRows } = await env.DB.prepare(AGGREGATION_SQL).all();
    if (!rawRows || rawRows.length === 0) {
      return json({ success: true, message: "No events to aggregate.", processed: 0 });
    }
    const rawAggregations = rawRows.map((row) => ({
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
    const rankedMemes = assignRanks(computedMemes);
    let processed = 0;
    for (let i = 0; i < rankedMemes.length; i += BATCH_WRITE_SIZE) {
      const batch = rankedMemes.slice(i, i + BATCH_WRITE_SIZE);
      const statements = batch.map(
        (m) => env.DB.prepare(
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
          m.meme_id,
          m.view_count,
          m.unique_viewer_count,
          m.like_count,
          m.unlike_count,
          m.net_like_count,
          m.share_count,
          m.download_count,
          m.skip_count,
          m.long_view_count,
          m.re_fetch_count,
          m.avg_time_on_meme_ms,
          m.max_time_on_meme_ms,
          m.engagement_score,
          m.virality_score,
          m.retention_score,
          m.skip_rate,
          m.like_rate,
          m.share_rate,
          m.download_rate,
          m.overall_rank,
          m.like_rank,
          m.share_rank,
          m.virality_rank,
          m.retention_rank,
          m.engagement_rank,
          m.trending_score,
          m.trending_rank,
          m.first_seen_at,
          m.last_seen_at,
          m.last_aggregated_at
        )
      );
      await env.DB.batch(statements);
      processed += batch.length;
    }
    const now = Date.now();
    const totalViews = rankedMemes.reduce((s, m) => s + m.view_count, 0);
    const totalLikes = rankedMemes.reduce((s, m) => s + m.like_count, 0);
    const totalShares = rankedMemes.reduce((s, m) => s + m.share_count, 0);
    const totalDownloads = rankedMemes.reduce((s, m) => s + m.download_count, 0);
    const totalSkips = rankedMemes.reduce((s, m) => s + m.skip_count, 0);
    const devicesResult = await env.DB.prepare(
      "SELECT COUNT(DISTINCT device_id) as cnt FROM meme_events"
    ).first();
    const memesResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes WHERE is_active = 1"
    ).first();
    const eventsResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM meme_events"
    ).first();
    const globalStats = [
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
    const globalStatements = globalStats.map(
      ([key, value]) => env.DB.prepare(
        "INSERT OR REPLACE INTO app_global_stats (stat_key, stat_value, updated_at) VALUES (?, ?, ?)"
      ).bind(key, value, now)
    );
    await env.DB.batch(globalStatements);
    if (env.ANALYTICS_KV) {
      await bustAnalyticsCache(env.ANALYTICS_KV);
    }
    const duration = Date.now() - startTime;
    return json({
      success: true,
      message: `Aggregation complete. ${processed} memes processed in ${duration}ms.`,
      processed,
      duration_ms: duration,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Recalculate error:", message);
    return json({ error: message }, { status: 500 });
  }
}, "onRequestPost");

// api/admin/analytics/trends.ts
var onRequestGet5 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;
  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "30", 10)));
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
  `).bind(days).all();
  const response = {
    days,
    trends: results || []
  };
  if (env.ANALYTICS_KV) {
    await setCache(env.ANALYTICS_KV, trendsCacheKey(days), response, TRENDS_TTL);
  }
  return json(response);
}, "onRequestGet");

// api/admin/memes.ts
var idPattern = /^[a-z0-9][a-z0-9-_]{2,80}$/i;
var allowedRarity = /* @__PURE__ */ new Set(["Common", "Rare", "Legendary"]);
var allowedStatus = /* @__PURE__ */ new Set(["active", "draft", "archived"]);
var allowedMediaType = /* @__PURE__ */ new Set(["image", "video"]);
var allowedInputMethod = /* @__PURE__ */ new Set(["url", "upload", "google-drive", "seed"]);
var sanitizeTags = /* @__PURE__ */ __name((tags) => Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12) : [], "sanitizeTags");
var toD1Row = /* @__PURE__ */ __name((meme) => {
  const id = String(meme.id || "").trim();
  if (!idPattern.test(id)) {
    throw new Error("Meme ID must be 3-80 characters and use letters, numbers, hyphens, or underscores.");
  }
  const storagePath = meme.storage_path?.trim() || "";
  const imageUrl = meme.url?.trim() || "";
  if (!storagePath && !imageUrl) {
    throw new Error("A meme needs either a direct URL or an R2 storage path.");
  }
  if (!storagePath && imageUrl.startsWith("data:")) {
    throw new Error("Data URLs cannot be saved to metadata. Upload the file first.");
  }
  const status = allowedStatus.has(String(meme.status)) ? meme.status : "draft";
  const mediaType = allowedMediaType.has(String(meme.media_type)) ? meme.media_type : "image";
  const inputMethod = allowedInputMethod.has(String(meme.input_method)) ? meme.input_method : "url";
  const rarity = allowedRarity.has(String(meme.rarity)) ? meme.rarity : "Common";
  return {
    id,
    title: String(meme.title || id).trim() || id,
    image_url: storagePath ? null : imageUrl,
    storage_path: storagePath || null,
    source_link: meme.source_link?.trim() || imageUrl || storagePath,
    category: meme.category?.trim() || "Unsorted",
    tags: JSON.stringify(sanitizeTags(meme.tags)),
    rarity,
    status,
    media_type: mediaType,
    input_method: inputMethod,
    is_active: status === "active" ? 1 : 0,
    rights_note: meme.rights_note?.trim() || "reviewed",
    share_text: meme.share_text?.trim() || meme.title?.trim() || "Spawned from Meme Capsule",
    random_key: Math.random()
  };
}, "toD1Row");
var parsePayload = /* @__PURE__ */ __name(async (request) => {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}, "parsePayload");
var onRequestGet6 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;
  const { results } = await env.DB.prepare(
    "SELECT * FROM memes ORDER BY uploaded_at DESC"
  ).all();
  return json({
    memes: results.map((row) => normalizeRow(env, row)),
    config: {
      hasR2PublicUrl: Boolean(env.R2_PUBLIC_URL),
      hasDatabase: Boolean(env.DB)
    }
  });
}, "onRequestGet");
var onRequestPost2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;
  try {
    const payload = await parsePayload(request);
    const row = toD1Row(payload.meme || {});
    await env.DB.prepare(
      `INSERT INTO memes (id, title, image_url, storage_path, source_link, category, tags, rarity, status, media_type, input_method, is_active, rights_note, share_text, random_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      row.id,
      row.title,
      row.image_url,
      row.storage_path,
      row.source_link,
      row.category,
      row.tags,
      row.rarity,
      row.status,
      row.media_type,
      row.input_method,
      row.is_active,
      row.rights_note,
      row.share_text,
      row.random_key
    ).run();
    const { results } = await env.DB.prepare(
      "SELECT * FROM memes WHERE id = ?"
    ).bind(row.id).all();
    return json({ meme: normalizeRow(env, results[0]) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to save meme." }, { status: 400 });
  }
}, "onRequestPost");
var onRequestPatch = /* @__PURE__ */ __name(async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;
  try {
    const payload = await parsePayload(request);
    const originalId = payload.originalId?.trim();
    if (!originalId) {
      throw new Error("originalId is required to update a meme.");
    }
    const row = toD1Row(payload.meme || {});
    await env.DB.prepare(
      `UPDATE memes SET
        id = ?, title = ?, image_url = ?, storage_path = ?, source_link = ?,
        category = ?, tags = ?, rarity = ?, status = ?, media_type = ?,
        input_method = ?, is_active = ?, rights_note = ?, share_text = ?, random_key = ?
       WHERE id = ?`
    ).bind(
      row.id,
      row.title,
      row.image_url,
      row.storage_path,
      row.source_link,
      row.category,
      row.tags,
      row.rarity,
      row.status,
      row.media_type,
      row.input_method,
      row.is_active,
      row.rights_note,
      row.share_text,
      row.random_key,
      originalId
    ).run();
    const { results } = await env.DB.prepare(
      "SELECT * FROM memes WHERE id = ?"
    ).bind(row.id).all();
    if (!results[0]) {
      return json({ error: "No meme was updated." }, { status: 404 });
    }
    return json({ meme: normalizeRow(env, results[0]) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to update meme." }, { status: 400 });
  }
}, "onRequestPatch");
var onRequestDelete = /* @__PURE__ */ __name(async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;
  try {
    const payload = await parsePayload(request);
    const id = payload.id?.trim();
    if (!id) {
      throw new Error("id is required to archive a meme.");
    }
    await env.DB.prepare(
      "UPDATE memes SET status = 'archived', is_active = 0 WHERE id = ?"
    ).bind(id).run();
    const { results } = await env.DB.prepare(
      "SELECT * FROM memes WHERE id = ?"
    ).bind(id).all();
    return json({ meme: normalizeRow(env, results[0]) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to archive meme." }, { status: 400 });
  }
}, "onRequestDelete");

// api/admin/sync-r2.ts
var onRequestPost3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;
  try {
    const bucket = env.MEMES_BUCKET;
    const db = env.DB;
    const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
    const allObjects = [];
    let cursor;
    let listAttempts = 0;
    do {
      const options = { limit: 500 };
      if (cursor) options.cursor = cursor;
      const listed = await bucket.list(options);
      for (const obj of listed.objects) {
        allObjects.push({
          key: obj.key,
          uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString() : void 0
        });
      }
      cursor = listed.truncated ? listed.cursor : void 0;
      listAttempts++;
      if (listAttempts > 20) break;
    } while (cursor);
    const mediaExtensions = /* @__PURE__ */ new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".avif",
      ".svg",
      ".bmp",
      ".mp4",
      ".webm",
      ".mov",
      ".avi",
      ".mkv"
    ]);
    const mediaObjects = allObjects.filter((obj) => {
      const dotIndex = obj.key.lastIndexOf(".");
      if (dotIndex === -1) return false;
      const ext = obj.key.slice(dotIndex).toLowerCase();
      return mediaExtensions.has(ext);
    });
    const { results: existingRows } = await db.prepare("SELECT storage_path FROM memes WHERE storage_path IS NOT NULL").all();
    const existingPaths = new Set(existingRows.map((r) => r.storage_path));
    const { results: existingUrls } = await db.prepare("SELECT image_url FROM memes WHERE image_url IS NOT NULL").all();
    const existingUrlSet = new Set(existingUrls.map((r) => r.image_url));
    const missing = mediaObjects.filter((obj) => {
      const fullUrl = publicBase ? `${publicBase}/${obj.key}` : obj.key;
      return !existingPaths.has(obj.key) && !existingUrlSet.has(fullUrl);
    });
    let synced = 0;
    const syncedFiles = [];
    const errors = [];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const obj of missing) {
      try {
        const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
        const isVideo = [".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext);
        const mediaType = isVideo ? "video" : "image";
        const filename = obj.key.split("/").pop() || obj.key;
        const cleanName = filename.replace(/^[a-f0-9-]{36,}-?/i, "").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || filename.replace(/\.[^.]+$/, "");
        const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        const fullUrl = publicBase ? `${publicBase}/${obj.key}` : "";
        const id = crypto.randomUUID();
        await db.prepare(
          `INSERT INTO memes (id, title, image_url, storage_path, source_link, category, tags, rarity, status, media_type, input_method, is_active, uploaded_at, share_text, shown_count, share_count, random_key)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          title,
          fullUrl,
          obj.key,
          filename,
          "Synced",
          "[]",
          "Common",
          "active",
          mediaType,
          "upload",
          // use 'upload' — valid CHECK constraint value
          1,
          obj.uploaded || now,
          "Spawned from Meme Capsule",
          0,
          0,
          Math.random()
        ).run();
        synced++;
        syncedFiles.push(obj.key);
      } catch (insertError) {
        errors.push(`${obj.key}: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
      }
    }
    return json({
      message: `Synced ${synced} new files from R2 to D1.`,
      totalR2Files: mediaObjects.length,
      alreadyInD1: mediaObjects.length - missing.length,
      newlySynced: synced,
      syncedFiles,
      ...errors.length > 0 ? { errors } : {}
    });
  } catch (error) {
    return json(
      {
        error: "R2 sync failed",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}, "onRequestPost");

// api/admin/upload.ts
var sanitizeFileName = /* @__PURE__ */ __name((name) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "meme-file", "sanitizeFileName");
var mediaTypeFromMime = /* @__PURE__ */ __name((mimeType) => mimeType.startsWith("video/") ? "video" : "image", "mediaTypeFromMime");
var onRequestPost4 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string" || !file.name) {
    return json({ error: "Upload requires a file field." }, { status: 400 });
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return json({ error: "Only image and video files are supported." }, { status: 400 });
  }
  const now = /* @__PURE__ */ new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const path = `${year}/${month}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  await env.MEMES_BUCKET.put(path, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });
  const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  const publicUrl = publicBase ? `${publicBase}/${path}` : path;
  return json({
    url: publicUrl,
    storage_path: path,
    source_link: file.name,
    media_type: mediaTypeFromMime(file.type)
  });
}, "onRequestPost");

// api/daily-meme.ts
var onRequestGet7 = /* @__PURE__ */ __name(async ({ env }) => {
  const meme = await dailyMemeOrFallback(env);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  return json({ meme, date: today });
}, "onRequestGet");

// api/events.ts
var VALID_EVENT_TYPES = /* @__PURE__ */ new Set([
  "view",
  "like",
  "unlike",
  "share",
  "download",
  "skip",
  "long_view",
  "re_fetch"
]);
var HEX_64_RE = /^[0-9a-f]{64}$/i;
var UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var MAX_BATCH_SIZE = 200;
var MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1e3;
var RATE_LIMIT_WINDOW_SECONDS = 60;
var RATE_LIMIT_MAX_REQUESTS = 10;
var validateBatch = /* @__PURE__ */ __name((body, nowMs) => {
  if (!body.device_id || !HEX_64_RE.test(body.device_id)) {
    return "device_id must be a 64-character hex string (SHA-256).";
  }
  if (!body.session_id || !UUID_V4_RE.test(body.session_id)) {
    return "session_id must be a valid UUID v4.";
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return "events array is required and must not be empty.";
  }
  if (body.events.length > MAX_BATCH_SIZE) {
    return `events array exceeds maximum batch size of ${MAX_BATCH_SIZE}.`;
  }
  for (let i = 0; i < body.events.length; i++) {
    const evt = body.events[i];
    if (!evt.meme_id || typeof evt.meme_id !== "string") {
      return `events[${i}].meme_id is missing or invalid.`;
    }
    if (!VALID_EVENT_TYPES.has(evt.event_type)) {
      return `events[${i}].event_type "${evt.event_type}" is not a valid event type.`;
    }
    if (typeof evt.timestamp !== "number") {
      return `events[${i}].timestamp is missing.`;
    }
    const drift = Math.abs(evt.timestamp - nowMs);
    if (drift > MAX_CLOCK_SKEW_MS) {
      return `events[${i}].timestamp is more than 24 hours from server time (clock skew).`;
    }
  }
  return null;
}, "validateBatch");
var checkRateLimit = /* @__PURE__ */ __name(async (kv, deviceId) => {
  if (!kv) return true;
  const key = `ratelimit:events:${deviceId}`;
  const currentStr = await kv.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;
  if (current >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  await kv.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS
  });
  return true;
}, "checkRateLimit");
var onRequestPost5 = /* @__PURE__ */ __name(async ({ request, env }) => {
  try {
    const body = await request.json();
    const nowMs = Date.now();
    const validationError = validateBatch(body, nowMs);
    if (validationError) {
      return json({ error: validationError }, { status: 400 });
    }
    const allowed = await checkRateLimit(env.ANALYTICS_KV, body.device_id);
    if (!allowed) {
      return json(
        { error: "Rate limit exceeded. Max 10 batch requests per minute per device." },
        { status: 429 }
      );
    }
    const statements = body.events.map(
      (evt) => env.DB.prepare(
        `INSERT OR IGNORE INTO meme_events
         (meme_id, event_type, session_id, device_id, time_on_meme_ms, timestamp, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        evt.meme_id,
        evt.event_type,
        body.session_id,
        body.device_id,
        evt.time_on_meme_ms || 0,
        evt.timestamp,
        evt.sequence || 0
      )
    );
    const results = await env.DB.batch(statements);
    let inserted = 0;
    for (const result of results) {
      if (result.meta?.changes && result.meta.changes > 0) {
        inserted++;
      }
    }
    const rejected = body.events.length - inserted;
    return json({
      received: body.events.length,
      inserted,
      rejected
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Event ingestion error:", message);
    return json({ error: message }, { status: 500 });
  }
}, "onRequestPost");

// api/like.ts
var onRequestPost6 = /* @__PURE__ */ __name(async ({ request, env }) => {
  try {
    const payload = await request.json();
    const { id, action } = payload;
    if (!id || action !== "like" && action !== "unlike") {
      return json({ error: "Invalid parameters" }, { status: 400 });
    }
    const existing = await env.DB.prepare(
      "SELECT id, likes_count FROM memes WHERE id = ?"
    ).bind(id).first();
    let newCount;
    if (existing) {
      if (action === "like") {
        await env.DB.prepare(
          "UPDATE memes SET likes_count = likes_count + 1 WHERE id = ?"
        ).bind(id).run();
        newCount = existing.likes_count + 1;
      } else {
        await env.DB.prepare(
          "UPDATE memes SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END WHERE id = ?"
        ).bind(id).run();
        newCount = Math.max(0, existing.likes_count - 1);
      }
    } else {
      newCount = action === "like" ? 1 : 0;
      await env.DB.prepare(
        `INSERT INTO memes (id, title, image_url, category, status, is_active, likes_count, input_method)
         VALUES (?, ?, ?, 'Unsorted', 'active', 0, ?, 'seed')`
      ).bind(id, `Tracked: ${id}`, `fallback://${id}`, newCount).run();
    }
    return json({ success: true, likes_count: newCount });
  } catch (err) {
    console.error("Like endpoint error:", err);
    return json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "onRequestPost");

// api/likes.ts
var onRequestGet8 = /* @__PURE__ */ __name(async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return json({ error: "Missing id parameter" }, { status: 400 });
    }
    const record = await env.DB.prepare(
      "SELECT likes_count FROM memes WHERE id = ?"
    ).bind(id).first();
    return json({ likes_count: record?.likes_count ?? 0 });
  } catch (err) {
    return json({ likes_count: 0 });
  }
}, "onRequestGet");

// api/random-meme.ts
var onRequestGet9 = /* @__PURE__ */ __name(async ({ env }) => {
  const meme = await randomMemeOrFallback(env);
  return json({ meme });
}, "onRequestGet");

// ../.wrangler/tmp/pages-32gY2D/functionsRoutes-0.6256028295481245.mjs
var routes = [
  {
    routePath: "/api/admin/analytics/meme/:memeId",
    mountPath: "/api/admin/analytics/meme",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/admin/analytics/insights",
    mountPath: "/api/admin/analytics",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/admin/analytics/overview",
    mountPath: "/api/admin/analytics",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/admin/analytics/rankings",
    mountPath: "/api/admin/analytics",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/admin/analytics/recalculate",
    mountPath: "/api/admin/analytics",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/admin/analytics/trends",
    mountPath: "/api/admin/analytics",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/admin/memes",
    mountPath: "/api/admin",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/admin/memes",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/admin/memes",
    mountPath: "/api/admin",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/admin/memes",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/admin/sync-r2",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/admin/upload",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/daily-meme",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/events",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/like",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/likes",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/random-meme",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  }
];

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
