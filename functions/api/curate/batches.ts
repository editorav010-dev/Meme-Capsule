/**
 * GET /api/curate/batches
 * 
 * Returns ingestion batches for AI Judge curation with live progress metrics.
 * Accessible to authenticated judges and administrators.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, validateSession, type Env } from "../../_shared/d1r2";
import { hasIngestionSchema } from "../../_shared/ingestion";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const sessionUser = await validateSession(request, env);
    if (!sessionUser) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasIngestionSchema(env.DB))) {
      return json({ batches: [] });
    }

    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "50", 10)));

    // Aggregate batch metrics directly using indexed joins
    const { results } = await env.DB.prepare(`
      SELECT 
        b.id,
        b.status,
        b.created_at,
        b.total_items,
        b.total_bytes,
        COUNT(j.job_id) as total_jobs,
        SUM(CASE WHEN j.upload_state = 'uploaded' AND (j.duplicate_of_job_id IS NULL OR j.duplicate_of_job_id LIKE 'replace:%') THEN 1 ELSE 0 END) AS valid_drafts,
        SUM(CASE WHEN j.upload_state = 'failed' THEN 1 ELSE 0 END) AS failed_uploads,
        SUM(CASE WHEN e4.state = 'succeeded' THEN 1 ELSE 0 END) AS j4_completed,
        SUM(CASE WHEN e5.state = 'succeeded' THEN 1 ELSE 0 END) AS j5_completed,
        SUM(CASE WHEN e4.state = 'succeeded' AND e5.state = 'succeeded' THEN 1 ELSE 0 END) AS both_completed
      FROM ingestion_batches b
      LEFT JOIN ingestion_jobs j ON b.id = j.batch_id
      LEFT JOIN ingestion_ai_evaluations e4 ON j.job_id = e4.job_id AND e4.judge_key = 'judge4'
      LEFT JOIN ingestion_ai_evaluations e5 ON j.job_id = e5.job_id AND e5.judge_key = 'judge5'
      WHERE b.status != 'cancelled'
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT ?
    `).bind(limit).all();

    const batches = (results || []).map((row: any) => {
      const validDrafts = Number(row.valid_drafts || 0);
      const j4Completed = Number(row.j4_completed || 0);
      const j5Completed = Number(row.j5_completed || 0);
      const bothCompleted = Number(row.both_completed || 0);

      return {
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        total_items: Number(row.total_items || 0),
        total_bytes: Number(row.total_bytes || 0),
        valid_drafts: validDrafts,
        failed_uploads: Number(row.failed_uploads || 0),
        judge4: {
          completed: j4Completed,
          remaining: Math.max(0, validDrafts - j4Completed),
        },
        judge5: {
          completed: j5Completed,
          remaining: Math.max(0, validDrafts - j5Completed),
        },
        both_completed: bothCompleted,
        percent_complete: validDrafts > 0 ? Math.min(100, Math.round((bothCompleted / validDrafts) * 100)) : 0,
      };
    });

    return json({ batches });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching curation batches";
    return json({ error: message }, { status: 500 });
  }
};

