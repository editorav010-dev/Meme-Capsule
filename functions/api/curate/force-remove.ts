/**
 * POST /api/curate/force-remove
 *
 * Permanently deletes a non-meme / invalid image from R2 storage
 * and all D1 database tables so it completely vanishes from existence.
 *
 * Triggered by Shift+Delete / Shift+Backspace or the "FORCE REMOVE" button.
 * Non-undoable by design.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, handleD1Error, type Env } from "../../_shared/d1r2";
import { validateSession } from "../../_shared/catAuth";
import { ensureCurationTables } from "../../_shared/curateDb";

interface ForceRemovePayload {
  meme_id?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await validateSession(request, env);
    if (!sessionUser) {
      return json({ error: "Curator authentication required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ForceRemovePayload;
    const memeId = (body.meme_id || "").trim();

    if (!memeId) {
      return json({ error: "meme_id is required." }, { status: 400 });
    }

    // 1. Fetch meme storage_path and image_url
    const memeRow = await env.DB.prepare(
      "SELECT id, storage_path, image_url FROM memes WHERE id = ?"
    ).bind(memeId).first<{ id: string; storage_path: string | null; image_url: string | null }>();

    // 2. Delete file from R2 bucket
    const bucket = env.MEMES_BUCKET || (env as any).R2_BUCKET;
    if (bucket && memeRow) {
      const keysToDelete: string[] = [];

      if (memeRow.storage_path) {
        keysToDelete.push(memeRow.storage_path.replace(/^\/+/, ""));
      }

      // If storage_path was null, extract potential R2 key from image_url
      if (!memeRow.storage_path && memeRow.image_url) {
        try {
          const parsed = new URL(memeRow.image_url);
          const pathKey = parsed.pathname.replace(/^\/+/, "");
          if (pathKey) keysToDelete.push(pathKey);
        } catch {
          // image_url is not a full URL or is invalid
        }
      }

      for (const key of keysToDelete) {
        try {
          await bucket.delete(key);
        } catch (r2Err) {
          console.warn(`[force-remove] Could not delete R2 key ${key}:`, r2Err);
        }
      }
    }

    // 3. Atomically remove from all D1 tables
    const tablesToClean = [
      "meme_curation",
      "meme_curation_final",
      "ai_curation_predictions",
      "meme_events",
      "meme_analytics",
      "meme_daily_stats",
      "memes"
    ];

    const statements: D1PreparedStatement[] = [];
    for (const tbl of tablesToClean) {
      try {
        statements.push(env.DB.prepare(`DELETE FROM ${tbl} WHERE ${tbl === "memes" ? "id" : "meme_id"} = ?`).bind(memeId));
      } catch {
        // Table might not exist in some local environments
      }
    }

    if (statements.length > 0) {
      try {
        await env.DB.batch(statements);
      } catch (batchErr) {
        // If batch fails (e.g. optional table missing), delete individually from core tables
        await env.DB.prepare("DELETE FROM meme_curation WHERE meme_id = ?").bind(memeId).run().catch(() => {});
        await env.DB.prepare("DELETE FROM meme_curation_final WHERE meme_id = ?").bind(memeId).run().catch(() => {});
        await env.DB.prepare("DELETE FROM ai_curation_predictions WHERE meme_id = ?").bind(memeId).run().catch(() => {});
        await env.DB.prepare("DELETE FROM memes WHERE id = ?").bind(memeId).run().catch(() => {});
      }
    }

    return json({
      success: true,
      meme_id: memeId,
      message: `Meme ${memeId} permanently removed from R2 storage and database.`
    });
  } catch (err: unknown) {
    return handleD1Error(err, "Error executing force-remove");
  }
};
