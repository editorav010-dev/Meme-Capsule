/**
 * GET /api/cat/me
 * 
 * Returns the current authenticated user's profile and progress metrics.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { requireAuth } from "../../_shared/catAuth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireAuth(request, env);

    const totalResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes WHERE is_active = 1"
    ).first<{ cnt: number }>();
    const totalMemes = totalResult?.cnt ?? 0;

    const statsResult = await env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN skipped = 0 THEN 1 ELSE 0 END) as categorised,
        SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) as skipped
      FROM cat_decisions
      WHERE user_id = ?
    `).bind(user.id).first<{ categorised: number | null; skipped: number | null }>();

    const categorised = statsResult?.categorised ?? 0;
    const skipped = statsResult?.skipped ?? 0;
    const decidedTotal = categorised + skipped;
    const remaining = Math.max(0, totalMemes - decidedTotal);
    const percentComplete = totalMemes > 0 ? Math.min(100, Math.round((decidedTotal / totalMemes) * 100)) : 0;

    return json({
      user,
      progress: {
        total_memes: totalMemes,
        categorised,
        skipped,
        remaining,
        percent_complete: percentComplete
      }
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error retrieving user";
    return json({ error: msg }, { status: 500 });
  }
};
