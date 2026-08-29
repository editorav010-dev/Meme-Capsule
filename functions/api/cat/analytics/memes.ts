/**
 * GET /api/cat/analytics/memes
 * 
 * Paginated list of memes with consensus stats and all judge decisions side-by-side.
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

interface MemeRow {
  id: string;
  title: string | null;
  image_url: string | null;
  storage_path: string | null;
  consensus_category: number | null;
  confidence_score: number | null;
  vote_breakdown: string | null;
  is_resolved: number | null;
  final_category: number | null;
}

interface DecisionRow {
  meme_id: string;
  user_id: string;
  display_name: string;
  category_id: number | null;
  confidence: number;
  skipped: number;
  decided_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env, "superadmin");

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "25", 10)));
    const filter = url.searchParams.get("filter") || "all";
    const offset = (page - 1) * perPage;
    const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    let whereClause = "WHERE m.is_active = 1";
    if (filter === "resolved") {
      whereClause += " AND (c.is_resolved = 1 OR c.final_category IS NOT NULL)";
    } else if (filter === "unresolved") {
      whereClause += " AND (c.is_resolved = 0 OR c.is_resolved IS NULL) AND c.final_category IS NULL";
    } else if (filter === "disagreement") {
      whereClause += " AND c.judge_count >= 2 AND (c.confidence_score <= 0.5 OR c.is_resolved = 0) AND c.final_category IS NULL";
    }

    // Count total matches
    const countSql = `
      SELECT COUNT(*) as cnt
      FROM memes m
      LEFT JOIN cat_consensus c ON m.id = c.meme_id
      ${whereClause}
    `;
    const countRes = await env.DB.prepare(countSql).first<{ cnt: number }>();
    const total = countRes?.cnt ?? 0;
    const totalPages = Math.ceil(total / perPage);

    // Fetch paginated memes
    const memesSql = `
      SELECT 
        m.id,
        m.title,
        m.image_url,
        m.storage_path,
        c.consensus_category,
        c.confidence_score,
        c.vote_breakdown,
        c.is_resolved,
        c.final_category
      FROM memes m
      LEFT JOIN cat_consensus c ON m.id = c.meme_id
      ${whereClause}
      ORDER BY 
        CASE WHEN c.final_category IS NOT NULL THEN 3
             WHEN c.is_resolved = 1 THEN 2
             WHEN c.judge_count > 0 THEN 1
             ELSE 0 END DESC,
        m.uploaded_at DESC
      LIMIT ? OFFSET ?
    `;

    const { results: memeRows } = await env.DB.prepare(memesSql).bind(perPage, offset).all<MemeRow>();
    const memes = memeRows || [];

    if (memes.length === 0) {
      return json({
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        memes: []
      });
    }

    // Fetch all decisions for these memes
    const memeIds = memes.map((m) => m.id);
    const placeholders = memeIds.map(() => "?").join(",");
    const decisionsSql = `
      SELECT 
        d.meme_id,
        d.user_id,
        u.display_name,
        d.category_id,
        d.confidence,
        d.skipped,
        d.decided_at
      FROM cat_decisions d
      JOIN cat_users u ON d.user_id = u.id
      WHERE d.meme_id IN (${placeholders})
      ORDER BY d.decided_at ASC
    `;

    const { results: decisionRows } = await env.DB.prepare(decisionsSql).bind(...memeIds).all<DecisionRow>();

    const decisionsByMeme = new Map<string, DecisionRow[]>();
    for (const d of decisionRows || []) {
      if (!decisionsByMeme.has(d.meme_id)) {
        decisionsByMeme.set(d.meme_id, []);
      }
      decisionsByMeme.get(d.meme_id)!.push(d);
    }

    const formattedMemes = memes.map((m) => {
      const fullUrl = m.image_url || (m.storage_path && publicBase ? `${publicBase}/${m.storage_path.replace(/^\/+/, "")}` : "") || "";
      let breakdown: Record<number, number> = {};
      if (m.vote_breakdown) {
        try {
          breakdown = JSON.parse(m.vote_breakdown);
        } catch {
          breakdown = {};
        }
      }

      const memeDecisions = decisionsByMeme.get(m.id) || [];

      return {
        meme_id: m.id,
        title: m.title || "Untitled Meme",
        image_url: fullUrl,
        consensus_category: m.consensus_category,
        confidence_score: m.confidence_score ?? 0,
        vote_breakdown: breakdown,
        is_resolved: Boolean(m.is_resolved),
        final_category: m.final_category,
        decisions: memeDecisions.map((d) => ({
          user_id: d.user_id,
          display_name: d.display_name,
          category_id: d.category_id,
          category_label: d.category_id ? CATEGORY_MAP[d.category_id] || "Unknown" : (d.skipped ? "Skipped" : "None"),
          confidence: d.confidence,
          skipped: Boolean(d.skipped),
          decided_at: d.decided_at
        }))
      };
    });

    return json({
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      memes: formattedMemes
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error retrieving analytics memes";
    return json({ error: msg }, { status: 500 });
  }
};
