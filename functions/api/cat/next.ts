/**
 * GET /api/cat/next
 * 
 * Returns the next uncategorised meme for the current user.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { requireAuth } from "../../_shared/catAuth";

interface NextMemeRow {
  id: string;
  image_url: string | null;
  title: string | null;
  storage_path: string | null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireAuth(request, env);
    const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    // Total active memes
    const totalResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes WHERE is_active = 1"
    ).first<{ cnt: number }>();
    const total = totalResult?.cnt ?? 0;

    // How many decided by this user
    const decidedResult = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM cat_decisions WHERE user_id = ?"
    ).bind(user.id).first<{ cnt: number }>();
    const position = (decidedResult?.cnt ?? 0) + 1;

    // Next uncategorised meme
    const nextMeme = await env.DB.prepare(`
      SELECT m.id, m.image_url, m.title, m.storage_path
      FROM memes m
      WHERE m.is_active = 1
        AND m.id NOT IN (
          SELECT meme_id FROM cat_decisions
          WHERE user_id = ?
        )
      ORDER BY m.random_key
      LIMIT 1
    `).bind(user.id).first<NextMemeRow>();

    if (!nextMeme) {
      return json({ meme: null });
    }

    const fullUrl = nextMeme.image_url || (nextMeme.storage_path && publicBase ? `${publicBase}/${nextMeme.storage_path.replace(/^\/+/, "")}` : "") || "";

    return json({
      meme: {
        id: nextMeme.id,
        image_url: fullUrl,
        title: nextMeme.title || "Untitled Meme",
        position: Math.min(position, total),
        total
      }
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error fetching next meme";
    return json({ error: msg }, { status: 500 });
  }
};
