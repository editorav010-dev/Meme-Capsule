/**
 * POST /api/cat/admin/reset
 * 
 * Resets categorisation decisions for a specific user or meme.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { requireAuth } from "../../../_shared/catAuth";
import { computeConsensus } from "../../../_shared/catConsensus";

interface ResetPayload {
  type?: "user" | "meme";
  id?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env, "superadmin");
    const body = (await request.json().catch(() => ({}))) as ResetPayload;

    const resetType = body.type;
    const targetId = (body.id || "").trim();

    if (!resetType || !targetId || !["user", "meme"].includes(resetType)) {
      return json({ error: "type must be 'user' or 'meme' and id is required." }, { status: 400 });
    }

    if (resetType === "meme") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM cat_decisions WHERE meme_id = ?").bind(targetId),
        env.DB.prepare("DELETE FROM cat_consensus WHERE meme_id = ?").bind(targetId)
      ]);

      return json({
        success: true,
        message: `All decisions and consensus for meme ${targetId} have been reset.`
      });
    }

    if (resetType === "user") {
      // Find all memes this user voted on so we can recalculate their consensus
      const { results: affectedMemes } = await env.DB.prepare(
        "SELECT DISTINCT meme_id FROM cat_decisions WHERE user_id = ?"
      ).bind(targetId).all<{ meme_id: string }>();

      // Delete the user's decisions
      await env.DB.prepare("DELETE FROM cat_decisions WHERE user_id = ?").bind(targetId).run();

      // Recalculate consensus for affected memes
      const now = new Date().toISOString();
      const updates = [];

      for (const m of affectedMemes || []) {
        const { results: remainingVotes } = await env.DB.prepare(
          "SELECT category_id, skipped FROM cat_decisions WHERE meme_id = ?"
        ).bind(m.meme_id).all<{ category_id: number | null; skipped: number }>();

        const votes = remainingVotes || [];
        if (votes.length === 0) {
          updates.push(env.DB.prepare("DELETE FROM cat_consensus WHERE meme_id = ?").bind(m.meme_id));
        } else {
          const consensus = computeConsensus(votes);
          updates.push(
            env.DB.prepare(`
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
              m.meme_id,
              consensus.consensus_category,
              consensus.confidence_score,
              votes.length,
              JSON.stringify(consensus.vote_breakdown),
              consensus.is_resolved ? 1 : 0,
              now
            )
          );
        }
      }

      if (updates.length > 0) {
        for (let i = 0; i < updates.length; i += 50) {
          await env.DB.batch(updates.slice(i, i + 50));
        }
      }

      return json({
        success: true,
        message: `Decisions for user ${targetId} reset. Recomputed consensus for ${affectedMemes?.length || 0} memes.`
      });
    }

    return json({ error: "Invalid reset operation" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error performing reset";
    return json({ error: msg }, { status: 500 });
  }
};
