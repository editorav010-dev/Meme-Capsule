/**
 * /api/admin/system-logs
 *
 * Central operational telemetry for background automation workflows:
 * - AI Curation (Circuit breaker trips, fatal model retirements, skipped items)
 * - Bulk Ingestion & Batch uploads
 * - Google Drive Sync Cron
 * - Conflict resolution and database sync
 *
 * Strictly adheres to Cloudflare Free Tier resource budgets:
 * - Zero writes on routine successes (evaluations are recorded in curation tables)
 * - Automatic log retention pruning (prunes records older than 14 days)
 * - Indexed queries by workflow and severity
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { validateSession } from "../../_shared/catAuth";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

async function checkAuth(request: Request, env: Env) {
  const sessionUser = await validateSession(request, env);
  const authHeader = request.headers.get("Authorization");
  const adminToken = env.ADMIN_API_TOKEN;
  const isAdminToken = Boolean(authHeader && adminToken && authHeader === `Bearer ${adminToken}`);
  const isCurator = Boolean(sessionUser);

  const originHeader = request.headers.get("Origin") || "";
  const refererHeader = request.headers.get("Referer") || "";
  const requestHost = new URL(request.url).host;
  const isSameOrigin =
    (originHeader && originHeader.includes(requestHost)) ||
    (refererHeader && refererHeader.includes(requestHost));

  return { isAuthorized: isCurator || isAdminToken || isSameOrigin, sessionUser, isAdminToken };
}

async function ensureTable(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS system_event_logs (
      id           TEXT PRIMARY KEY,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      workflow     TEXT NOT NULL,
      severity     TEXT NOT NULL,
      actor        TEXT NOT NULL,
      batch_id     TEXT,
      item_id      TEXT,
      provider     TEXT,
      model        TEXT,
      status_code  INTEGER,
      message      TEXT NOT NULL,
      details_json TEXT
    );
  `).run().catch(() => undefined);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await checkAuth(request, env);
  if (!auth.isAuthorized) {
    return json({ error: "Unauthorized access to system logs" }, { status: 401, headers: CORS_HEADERS });
  }

  await ensureTable(env);

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
  const workflow = url.searchParams.get("workflow") || "";
  const severity = url.searchParams.get("severity") || "";
  const batchId = url.searchParams.get("batch_id") || "";

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (workflow) {
    whereClauses.push("workflow = ?");
    params.push(workflow);
  }
  if (severity) {
    whereClauses.push("severity = ?");
    params.push(severity);
  }
  if (batchId) {
    whereClauses.push("batch_id = ?");
    params.push(batchId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  try {
    // 1. Fetch paginated records
    const listRes = await env.DB.prepare(`
      SELECT * FROM system_event_logs
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all<any>();

    // 2. Fetch summary statistics
    const statsRes = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_matching,
        SUM(CASE WHEN severity IN ('error', 'fatal') AND created_at >= datetime('now', '-24 hours') THEN 1 ELSE 0 END) as errors_24h,
        SUM(CASE WHEN severity = 'fatal' THEN 1 ELSE 0 END) as fatal_count
      FROM system_event_logs
      ${whereSql}
    `).bind(...params).first<{ total_matching: number; errors_24h: number; fatal_count: number }>();

    return json({
      logs: listRes.results || [],
      total: statsRes?.total_matching || 0,
      errors_24h: statsRes?.errors_24h || 0,
      fatal_count: statsRes?.fatal_count || 0,
      limit,
      offset
    }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    return json({ logs: [], total: 0, errors_24h: 0, fatal_count: 0, error: String(err) }, { headers: CORS_HEADERS });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await checkAuth(request, env);
  if (!auth.isAuthorized) {
    return json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  await ensureTable(env);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const id = `log-${crypto.randomUUID()}`;
  const workflow = (body.workflow || "ai_curation").trim();
  const severity = (body.severity || "info").trim();
  const actor = (body.actor || auth.sessionUser?.username || "system").trim();
  const batchId = body.batch_id || null;
  const itemId = body.item_id || null;
  const provider = body.provider || null;
  const model = body.model || null;
  const statusCode = typeof body.status_code === "number" ? body.status_code : null;
  const message = (body.message || "Automation event").slice(0, 500);

  // Sanitize details: strip secrets, tokens, passwords
  const rawDetails = body.details || body.details_json || {};
  let sanitizedDetails = typeof rawDetails === "object" ? { ...rawDetails } : { text: String(rawDetails) };
  if (typeof sanitizedDetails === "object") {
    delete sanitizedDetails.apiKey;
    delete sanitizedDetails.api_key;
    delete sanitizedDetails.token;
    delete sanitizedDetails.password;
    delete sanitizedDetails.authorization;
  }
  const detailsJson = JSON.stringify(sanitizedDetails).slice(0, 4000);

  try {
    await env.DB.prepare(`
      INSERT INTO system_event_logs (
        id, workflow, severity, actor, batch_id, item_id,
        provider, model, status_code, message, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, workflow, severity, actor, batchId, itemId,
      provider, model, statusCode, message, detailsJson
    ).run();

    // 5% chance to run automatic 14-day pruning
    if (Math.random() < 0.05) {
      void env.DB.prepare(`
        DELETE FROM system_event_logs
        WHERE created_at < datetime('now', '-14 days')
      `).run().catch(() => undefined);
    }

    return json({ success: true, id }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    return json({ error: "Failed to insert event log", details: String(err) }, { status: 500, headers: CORS_HEADERS });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await checkAuth(request, env);
  if (!auth.isAuthorized) {
    return json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  await ensureTable(env);

  const url = new URL(request.url);
  const olderThanDays = parseInt(url.searchParams.get("older_than_days") || "0", 10);
  const batchId = url.searchParams.get("batch_id") || "";

  try {
    if (olderThanDays > 0) {
      await env.DB.prepare(`
        DELETE FROM system_event_logs
        WHERE created_at < datetime('now', '-' || ? || ' days')
      `).bind(olderThanDays).run();
    } else if (batchId) {
      await env.DB.prepare(`
        DELETE FROM system_event_logs
        WHERE batch_id = ?
      `).bind(batchId).run();
    } else {
      // Clear all
      await env.DB.prepare(`DELETE FROM system_event_logs`).run();
    }

    return json({ success: true }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    return json({ error: "Failed to purge logs", details: String(err) }, { status: 500, headers: CORS_HEADERS });
  }
};
