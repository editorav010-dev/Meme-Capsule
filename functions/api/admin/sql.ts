/**
 * POST /api/admin/sql
 *
 * Executes raw SQL queries against the D1 database.
 * Extremely powerful. Restricted to admin tokens.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, requireAdmin, type Env } from "../../_shared/d1r2";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authError = requireAdmin(request, env);
  if (authError) return authError;

  let query: string;
  try {
    const body = await request.json() as { query?: string };
    if (!body.query || typeof body.query !== "string") {
      return json({ success: false, error: "Missing or invalid 'query' field in request body." }, { status: 400 });
    }
    query = body.query.trim();
  } catch (err) {
    return json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (query.length === 0) {
    return json({ success: false, error: "Query cannot be empty." }, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(query).all();
    return json({
      success: true,
      results: result.results,
      meta: result.meta
    });
  } catch (err: any) {
    // Return SQLite errors cleanly instead of throwing a 500
    return json({
      success: false,
      error: err.message || "Database execution failed."
    });
  }
};
