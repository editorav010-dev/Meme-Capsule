/**
 * GET /api/cat/admin/force-removals
 * 
 * Superadmin view: list all force-removed memes with audit details.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { requireAuth } from "../../../_shared/catAuth";

interface ForceRemovalRow {
  id: string;
  meme_id: string;
  title: string | null;
  removed_by_name: string;
  reason: string | null;
  r2_deleted: number;
  r2_error: string | null;
  removed_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env, "superadmin");

    const { results } = await env.DB.prepare(
      `SELECT 
        id, meme_id, title, removed_by_name, reason, r2_deleted, r2_error, removed_at
       FROM meme_force_removals
       ORDER BY removed_at DESC
       LIMIT 1000`
    ).all<ForceRemovalRow>();

    return json({
      removals: results || []
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error retrieving force removals";
    return json({ error: msg }, { status: 500 });
  }
};
