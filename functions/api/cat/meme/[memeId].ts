/**
 * GET /api/cat/meme/:memeId
 * 
 * Returns full details of a specific meme, its consensus status, and judge decisions.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { requireAuth } from "../../../_shared/catAuth";

interface MemeRow {
  id: string;
  title: string | null;
  image_url: string | null;
  storage_path: string | null;
}

interface ConsensusRow {
  consensus_category: number | null;
  confidence_score: number;
  vote_breakdown: string;
  is_resolved: number;
  final_category: number | null;
}

interface DecisionRow {
  user_id: string;
  display_name: string;
  category_id: number | null;
  confidence: number;
  skipped: number;
  notes: string | null;
  decided_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const memeId = String(params.memeId || "");
    const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    if (!memeId) {
      return json({ error: "memeId parameter is required." }, { status: 400 });
    }

    const meme = await env.DB.prepare(
      "SELECT id, title, image_url, storage_path FROM memes WHERE id = ?"
    ).bind(memeId).first<MemeRow>();

    if (!meme) {
      return json({ error: "Meme not found." }, { status: 404 });
    }

    const fullUrl = meme.image_url || (meme.storage_path && publicBase ? `${publicBase}/${meme.storage_path.replace(/^\/+/, "")}` : "") || "";

    const consensusRow = await env.DB.prepare(
      "SELECT consensus_category, confidence_score, vote_breakdown, is_resolved, final_category FROM cat_consensus WHERE meme_id = ?"
    ).bind(memeId).first<ConsensusRow>();

    let breakdown: Record<number, number> = {};
    if (consensusRow?.vote_breakdown) {
      try {
        breakdown = JSON.parse(consensusRow.vote_breakdown);
      } catch {
        breakdown = {};
      }
    }

    const { results: decisionRows } = await env.DB.prepare(`
      SELECT 
        d.user_id,
        u.display_name,
        d.category_id,
        d.confidence,
        d.skipped,
        d.notes,
        d.decided_at
      FROM cat_decisions d
      JOIN cat_users u ON d.user_id = u.id
      WHERE d.meme_id = ?
      ORDER BY d.decided_at ASC
    `).bind(memeId).all<DecisionRow>();

    return json({
      meme: {
        id: meme.id,
        title: meme.title || "Untitled Meme",
        image_url: fullUrl,
        storage_path: meme.storage_path || ""
      },
      consensus: consensusRow ? {
        consensus_category: consensusRow.consensus_category,
        confidence_score: consensusRow.confidence_score,
        vote_breakdown: breakdown,
        is_resolved: Boolean(consensusRow.is_resolved),
        final_category: consensusRow.final_category
      } : null,
      decisions: (decisionRows || []).map((d) => ({
        user_id: d.user_id,
        display_name: d.display_name,
        category_id: d.category_id,
        confidence: d.confidence,
        skipped: Boolean(d.skipped),
        notes: d.notes,
        decided_at: d.decided_at
      }))
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error retrieving meme detail";
    return json({ error: msg }, { status: 500 });
  }
};
