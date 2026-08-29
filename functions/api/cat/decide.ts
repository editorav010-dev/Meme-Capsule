/**
 * POST /api/cat/decide
 * 
 * Records a categorisation decision for a meme by the current user
 * and recomputes the consensus across all judges.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { requireAuth } from "../../_shared/catAuth";
import { computeConsensus } from "../../_shared/catConsensus";

interface DecidePayload {
  meme_id?: string;
  category_id?: number; // 1-7 or 0 (skip)
  confidence?: number;  // 1-5, default 3
  notes?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireAuth(request, env);
    const body = (await request.json().catch(() => ({}))) as DecidePayload;

    const memeId = (body.meme_id || "").trim();
    if (!memeId) {
      return json({ error: "meme_id is required." }, { status: 400 });
    }

    const rawCategoryId = Number(body.category_id);
    if (isNaN(rawCategoryId) || rawCategoryId < 0 || rawCategoryId > 7) {
      return json({ error: "category_id must be between 0 (skip) and 7." }, { status: 400 });
    }

    const confidence = Math.min(5, Math.max(1, Number(body.confidence) || 3));
    const isSkip = rawCategoryId === 0;
    const categoryId = isSkip ? null : rawCategoryId;
    const skipped = isSkip ? 1 : 0;
    const notes = body.notes ? String(body.notes).slice(0, 500) : null;
    const now = new Date().toISOString();
    const decId = `dec-${crypto.randomUUID().slice(0, 8)}`;

    // 1. Insert or update decision
    await env.DB.prepare(`
      INSERT INTO cat_decisions (id, meme_id, user_id, category_id, confidence, skipped, notes, decided_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(meme_id, user_id) DO UPDATE SET
        category_id = excluded.category_id,
        confidence = excluded.confidence,
        skipped = excluded.skipped,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).bind(decId, memeId, user.id, categoryId, confidence, skipped, notes, now, now).run();

    // 2. Fetch all decisions for this meme to recompute consensus
    const { results: allDecisions } = await env.DB.prepare(
      "SELECT category_id, skipped FROM cat_decisions WHERE meme_id = ?"
    ).bind(memeId).all<{ category_id: number | null; skipped: number }>();

    const consensus = computeConsensus(allDecisions || []);

    // 3. Update cat_consensus table
    await env.DB.prepare(`
      INSERT INTO cat_consensus (meme_id, consensus_category, confidence_score, judge_count, vote_breakdown, is_resolved, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(meme_id) DO UPDATE SET
        consensus_category = excluded.consensus_category,
        confidence_score = excluded.confidence_score,
        judge_count = excluded.judge_count,
        vote_breakdown = excluded.vote_breakdown,
        is_resolved = excluded.is_resolved,
        last_updated = excluded.last_updated
    `).bind(
      memeId,
      consensus.consensus_category,
      consensus.confidence_score,
      (allDecisions || []).length,
      JSON.stringify(consensus.vote_breakdown),
      consensus.is_resolved ? 1 : 0,
      now
    ).run();

    // 4. Pre-fetch next meme ID for fast preloading
    const nextMeme = await env.DB.prepare(`
      SELECT m.id
      FROM memes m
      WHERE m.is_active = 1
        AND m.id NOT IN (
          SELECT meme_id FROM cat_decisions WHERE user_id = ?
        )
      ORDER BY m.random_key
      LIMIT 1
    `).bind(user.id).first<{ id: string }>();

    return json({
      success: true,
      next_meme_id: nextMeme?.id ?? null
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error recording decision";
    return json({ error: msg }, { status: 500 });
  }
};
