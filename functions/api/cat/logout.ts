/**
 * POST /api/cat/logout
 * 
 * Invalidates the current user session token.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { requireAuth } from "../../_shared/catAuth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);

    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.slice(7).trim();

    if (token) {
      await env.DB.prepare("DELETE FROM cat_sessions WHERE token = ?").bind(token).run();
    }

    return json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Logout error";
    return json({ error: msg }, { status: 500 });
  }
};
