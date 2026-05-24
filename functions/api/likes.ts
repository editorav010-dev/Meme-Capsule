import type { PagesFunction } from "../_shared/pages";
import { json, type Env } from "../_shared/d1r2";

/**
 * GET /api/likes?id=meme-001
 * Returns the current likes_count for a given meme ID.
 * If the meme doesn't exist in D1, returns 0.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "Missing id parameter" }, { status: 400 });
    }

    const record = await env.DB.prepare(
      "SELECT likes_count FROM memes WHERE id = ?"
    ).bind(id).first<{ likes_count: number }>();

    return json({ likes_count: record?.likes_count ?? 0 });
  } catch (err: any) {
    return json({ likes_count: 0 });
  }
};
