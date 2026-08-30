/**
 * GET /api/curate/super/memes
 * 
 * Returns paginated memes with multi-judge comparison matrices and final resolution status.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { requireAuth } from "../../../_shared/catAuth";

interface MemeRow {
  id: string;
  title: string | null;
  image_url: string | null;
  storage_path: string | null;
  final_status: string | null;
  final_duplicate_of: string | null;
  final_topics: string | null;
  final_tone: string | null;
  final_mechanisms: string | null;
  final_note: string | null;
  resolved_at: string | null;
}

interface JudgeReviewRow {
  meme_id: string;
  user_id: string;
  user_name: string;
  corpus_status: string;
  duplicate_of: string | null;
  topics: string;
  tone: string | null;
  humour_mechanisms: string;
  curator_note: string | null;
  reviewed_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const auth = await requireAuth(request, env, "superadmin");
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get("per_page") || "20", 10)));
    const filter = url.searchParams.get("filter") || "all";
    const search = (url.searchParams.get("search") || "").trim();
    const offset = (page - 1) * perPage;
    const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    let baseQuery = `
      FROM memes m
      LEFT JOIN meme_curation_final f ON m.id = f.meme_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (search) {
      baseQuery += " AND (m.id LIKE ? OR m.title LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (filter === "resolved") {
      baseQuery += " AND f.corpus_status IS NOT NULL";
    } else if (filter === "unresolved") {
      baseQuery += " AND f.corpus_status IS NULL";
    }

    // Get total count
    const countRes = await env.DB.prepare(`
      SELECT COUNT(*) as cnt ${baseQuery}
    `).bind(...params).first<{ cnt: number }>();
    const total = countRes?.cnt ?? 0;
    const totalPages = Math.ceil(total / perPage);

    // Fetch memes for current page
    const query = `
      SELECT 
        m.id, m.title, m.image_url, m.storage_path,
        f.corpus_status as final_status,
        f.duplicate_of as final_duplicate_of,
        f.topics as final_topics,
        f.tone as final_tone,
        f.humour_mechanisms as final_mechanisms,
        f.curator_note as final_note,
        f.resolved_at
      ${baseQuery}
      ORDER BY 
        CASE WHEN f.corpus_status IS NULL THEN 0 ELSE 1 END ASC,
        m.uploaded_at ASC
      LIMIT ? OFFSET ?
    `;

    const { results: memeRows } = await env.DB.prepare(query)
      .bind(...params, perPage, offset)
      .all<MemeRow>();

    const memes = memeRows || [];
    const memeIds = memes.map((m) => m.id);

    // Fetch all judge reviews for these memes
    let reviews: JudgeReviewRow[] = [];
    if (memeIds.length > 0) {
      const placeholders = memeIds.map(() => "?").join(",");
      const { results: reviewResults } = await env.DB.prepare(`
        SELECT 
          meme_id, user_id, user_name, corpus_status, duplicate_of,
          topics, tone, humour_mechanisms, curator_note, reviewed_at
        FROM meme_curation
        WHERE meme_id IN (${placeholders})
        ORDER BY reviewed_at ASC
      `).bind(...memeIds).all<JudgeReviewRow>();
      reviews = reviewResults || [];
    }

    const reviewsByMeme = new Map<string, JudgeReviewRow[]>();
    for (const r of reviews) {
      if (!reviewsByMeme.has(r.meme_id)) {
        reviewsByMeme.set(r.meme_id, []);
      }
      reviewsByMeme.get(r.meme_id)!.push(r);
    }

    const data = memes.map((m) => {
      const fullUrl = m.image_url || (m.storage_path && publicBase ? `${publicBase}/${m.storage_path.replace(/^\/+/, "")}` : "") || "";
      const memeReviews = reviewsByMeme.get(m.id) || [];

      // Determine consensus state
      let consensusStatus = "unreviewed";
      if (m.final_status) {
        consensusStatus = "resolved";
      } else if (memeReviews.length === 1) {
        consensusStatus = "single_review";
      } else if (memeReviews.length > 1) {
        const first = memeReviews[0].corpus_status;
        const allSame = memeReviews.every((r) => r.corpus_status === first);
        if (allSame) {
          consensusStatus = first === "keep" ? "unanimous_keep" : "unanimous_exclude";
        } else {
          consensusStatus = "conflict";
        }
      }

      let parsedFinalTopics: string[] = [];
      let parsedFinalMechanisms: string[] = [];
      try {
        if (m.final_topics) parsedFinalTopics = JSON.parse(m.final_topics);
      } catch {
        parsedFinalTopics = [];
      }
      try {
        if (m.final_mechanisms) parsedFinalMechanisms = JSON.parse(m.final_mechanisms);
      } catch {
        parsedFinalMechanisms = [];
      }

      const formattedReviews = memeReviews.map((r) => {
        let tList: string[] = [];
        let mList: string[] = [];
        try {
          tList = JSON.parse(r.topics);
        } catch {
          tList = [];
        }
        try {
          mList = JSON.parse(r.humour_mechanisms);
        } catch {
          mList = [];
        }
        return {
          user_id: r.user_id,
          user_name: r.user_name,
          corpus_status: r.corpus_status,
          duplicate_of: r.duplicate_of,
          topics: tList,
          tone: r.tone,
          humour_mechanisms: mList,
          curator_note: r.curator_note,
          reviewed_at: r.reviewed_at
        };
      });

      return {
        id: m.id,
        title: m.title || "Untitled Meme",
        image_url: fullUrl,
        consensus_status: consensusStatus,
        judges_count: memeReviews.length,
        judges: formattedReviews,
        final_decision: m.final_status ? {
          corpus_status: m.final_status,
          duplicate_of: m.final_duplicate_of,
          topics: parsedFinalTopics,
          tone: m.final_tone,
          humour_mechanisms: parsedFinalMechanisms,
          curator_note: m.final_note,
          resolved_at: m.resolved_at
        } : null
      };
    });

    return json({
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      memes: data
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error listing superadmin memes";
    return json({ error: msg }, { status: 500 });
  }
};
