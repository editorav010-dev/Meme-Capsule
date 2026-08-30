/**
 * POST /api/curate/super/bulk-resolve
 * 
 * Atomically batch-resolves all unanimous judge decisions.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { requireAuth } from "../../../_shared/catAuth";

interface UnanimousGroupRow {
  meme_id: string;
  corpus_status: string;
  topics: string;
  tone: string | null;
  humour_mechanisms: string;
  duplicate_of: string | null;
  curator_note: string | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const auth = await requireAuth(request, env, "superadmin");
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = body.action || "unanimous_all";
    const now = new Date().toISOString();

    // Find all memes reviewed by multiple judges where all reviews agree
    const { results } = await env.DB.prepare(`
      SELECT 
        meme_id,
        MIN(corpus_status) as corpus_status,
        MIN(topics) as topics,
        MIN(tone) as tone,
        MIN(humour_mechanisms) as humour_mechanisms,
        MIN(duplicate_of) as duplicate_of,
        MIN(curator_note) as curator_note,
        COUNT(DISTINCT corpus_status) as status_variants,
        COUNT(*) as total_reviews
      FROM meme_curation
      WHERE meme_id NOT IN (SELECT meme_id FROM meme_curation_final)
      GROUP BY meme_id
      HAVING status_variants = 1 AND total_reviews >= 2
    `).all<UnanimousGroupRow & { status_variants: number; total_reviews: number }>();

    const candidateRows = (results || []).filter((r) => {
      if (action === "unanimous_keep") return r.corpus_status === "keep";
      if (action === "unanimous_exclude") return r.corpus_status === "excluded";
      return true;
    });

    if (candidateRows.length === 0) {
      return json({ success: true, count: 0, message: "No unanimous memes pending resolution." });
    }

    const stmts: D1PreparedStatement[] = [];

    for (const r of candidateRows) {
      stmts.push(
        env.DB.prepare(`
          INSERT INTO meme_curation_final (
            meme_id, corpus_status, duplicate_of, topics, tone, humour_mechanisms,
            curator_note, resolved_by, resolved_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(meme_id) DO UPDATE SET
            corpus_status = excluded.corpus_status,
            duplicate_of = excluded.duplicate_of,
            topics = excluded.topics,
            tone = excluded.tone,
            humour_mechanisms = excluded.humour_mechanisms,
            curator_note = excluded.curator_note,
            resolved_by = excluded.resolved_by,
            resolved_at = excluded.resolved_at,
            updated_at = excluded.updated_at
        `).bind(
          r.meme_id,
          r.corpus_status,
          r.duplicate_of || null,
          r.topics || "[]",
          r.tone || null,
          r.humour_mechanisms || "[]",
          r.curator_note || null,
          `Batch (${auth.user.display_name})`,
          now,
          now
        )
      );

      const isActive = r.corpus_status === "keep" ? 1 : 0;
      stmts.push(
        env.DB.prepare("UPDATE memes SET is_active = ? WHERE id = ?").bind(isActive, r.meme_id)
      );
    }

    // Run in batches of 50 to stay well within D1 batch limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < stmts.length; i += CHUNK_SIZE) {
      await env.DB.batch(stmts.slice(i, i + CHUNK_SIZE));
    }

    return json({
      success: true,
      count: candidateRows.length,
      message: `Successfully resolved ${candidateRows.length} unanimous memes.`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error bulk resolving memes";
    return json({ error: msg }, { status: 500 });
  }
};
