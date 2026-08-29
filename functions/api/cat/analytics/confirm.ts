/**
 * POST /api/cat/analytics/confirm
 * 
 * Allows superadmin to manually confirm or override the final category for a meme.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { requireAuth } from "../../../_shared/catAuth";

const CATEGORY_MAP: Record<number, string> = {
  1: "Dank",
  2: "Relatable",
  3: "Dark Humour",
  4: "Wholesome",
  5: "Cringe",
  6: "Political",
  7: "Cursed"
};

interface ConfirmPayload {
  meme_id?: string;
  final_category?: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env, "superadmin");
    const body = (await request.json().catch(() => ({}))) as ConfirmPayload;

    const memeId = (body.meme_id || "").trim();
    const finalCategory = Number(body.final_category);

    if (!memeId || isNaN(finalCategory) || finalCategory < 1 || finalCategory > 7) {
      return json({ error: "Valid meme_id and final_category (1-7) are required." }, { status: 400 });
    }

    const categoryLabel = CATEGORY_MAP[finalCategory] || "Unsorted";
    const now = new Date().toISOString();

    // 1. Update consensus table with confirmed final category
    await env.DB.prepare(`
      INSERT INTO cat_consensus (meme_id, consensus_category, confidence_score, is_resolved, final_category, last_updated)
      VALUES (?, ?, 1.0, 1, ?, ?)
      ON CONFLICT(meme_id) DO UPDATE SET
        final_category = excluded.final_category,
        is_resolved = 1,
        last_updated = excluded.last_updated
    `).bind(memeId, finalCategory, finalCategory, now).run();

    // 2. Also update main memes table category
    await env.DB.prepare(
      "UPDATE memes SET category = ? WHERE id = ?"
    ).bind(categoryLabel, memeId).run();

    return json({
      success: true,
      meme_id: memeId,
      final_category: finalCategory,
      category_label: categoryLabel
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error confirming final category";
    return json({ error: msg }, { status: 500 });
  }
};
