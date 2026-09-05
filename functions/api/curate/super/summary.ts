/**
 * GET /api/curate/super/summary
 * 
 * Aggregates multi-judge curation statistics, consensus metrics, and resolution progress.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { validateSession } from "../../../_shared/catAuth";
import { ensureCurationTables } from "../../../_shared/curateDb";

interface JudgeCountRow {
  user_id: string;
  user_name: string;
  total_reviewed: number;
  kept: number;
  excluded: number;
  duplicates: number;
  review_later: number;
  last_active: string;
}

interface CurationRow {
  meme_id: string;
  user_id: string;
  corpus_status: string;
}

interface AICountRow {
  total_reviewed: number;
  kept: number;
  excluded: number;
  duplicates: number;
  review_later: number;
}

interface AIDecisionRow {
  id: string;
  meme_id: string;
  category_label: string | null;
  raw_response: string | null;
  created_at: string;
  error: string | null;
}

function getAIDecision(row: AIDecisionRow): string | null {
  let payload: Record<string, unknown> = {};
  try {
    const parsed = row.raw_response ? JSON.parse(row.raw_response) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    payload = {};
  }
  const raw = payload.corpus_status ?? payload.decision ?? row.category_label;
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return ({
    keep: "keep", kept: "keep", exclude: "excluded", excluded: "excluded",
    duplicate: "duplicate", duplicates: "duplicate", later: "review_later",
    "review later": "review_later", review_later: "review_later"
  } as Record<string, string>)[value] || null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await validateSession(request, env);
    if (!sessionUser || sessionUser.role !== "superadmin") {
      return json({ error: "Superadmin credentials required." }, { status: 401 });
    }

    // 1. Total memes in corpus
    const totalCountRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes"
    ).first<{ cnt: number }>();
    const totalMemes = totalCountRes?.cnt ?? 0;

    // 2. Final resolved count
    let resolvedCount = 0;
    try {
      const finalRes = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM meme_curation_final"
      ).first<{ cnt: number }>();
      resolvedCount = finalRes?.cnt ?? 0;
    } catch {
      resolvedCount = 0;
    }

    // 3. Per-judge progress breakdown
    const { results: judgeResults } = await env.DB.prepare(`
      SELECT 
        user_id,
        user_name,
        COUNT(*) as total_reviewed,
        SUM(CASE WHEN corpus_status = 'keep' THEN 1 ELSE 0 END) as kept,
        SUM(CASE WHEN corpus_status = 'excluded' THEN 1 ELSE 0 END) as excluded,
        SUM(CASE WHEN corpus_status = 'duplicate' THEN 1 ELSE 0 END) as duplicates,
        SUM(CASE WHEN corpus_status = 'review_later' THEN 1 ELSE 0 END) as review_later,
        MAX(reviewed_at) as last_active
      FROM meme_curation
      GROUP BY user_id, user_name
      ORDER BY total_reviewed DESC
    `).all<JudgeCountRow>();

    const judges = judgeResults || [];

    let aiJudge: AICountRow = {
      total_reviewed: 0,
      kept: 0,
      excluded: 0,
      duplicates: 0,
      review_later: 0
    };
    try {
      const { results } = await env.DB.prepare(`
        SELECT id, meme_id, category_label, raw_response, created_at, error
        FROM ai_cat_decisions
        WHERE error IS NULL
        ORDER BY created_at DESC, id DESC
      `).all<AIDecisionRow>();
      for (const row of results || []) {
        aiJudge.total_reviewed += 1;
        const status = getAIDecision(row);
        if (status === "keep") aiJudge.kept += 1;
        else if (status === "excluded") aiJudge.excluded += 1;
        else if (status === "duplicate") aiJudge.duplicates += 1;
        else if (status === "review_later") aiJudge.review_later += 1;
      }
    } catch {
      // AI storage is optional; human progress must remain available.
    }

    // 4. Consensus & disagreement analysis across multi-judge reviews
    const { results: allReviews } = await env.DB.prepare(`
      SELECT meme_id, user_id, corpus_status
      FROM meme_curation
    `).all<CurationRow>();

    const reviews = allReviews || [];
    const memeReviewMap = new Map<string, string[]>();

    for (const r of reviews) {
      if (!memeReviewMap.has(r.meme_id)) {
        memeReviewMap.set(r.meme_id, []);
      }
      memeReviewMap.get(r.meme_id)!.push(r.corpus_status);
    }

    let unanimousKeep = 0;
    let unanimousExclude = 0;
    let conflicts = 0;
    let singleReview = 0;
    let reviewedMemeCount = memeReviewMap.size;

    for (const [, statuses] of memeReviewMap.entries()) {
      if (statuses.length === 1) {
        singleReview++;
      } else if (statuses.length > 1) {
        const first = statuses[0];
        const allSame = statuses.every((s) => s === first);
        if (allSame) {
          if (first === "keep") unanimousKeep++;
          else if (first === "excluded") unanimousExclude++;
        } else {
          conflicts++;
        }
      }
    }

    const unreviewed = Math.max(0, totalMemes - reviewedMemeCount);

    return json({
      total_memes: totalMemes,
      resolved_count: resolvedCount,
      percent_resolved: totalMemes > 0 ? Math.round((resolvedCount / totalMemes) * 100) : 0,
      consensus_metrics: {
        unreviewed,
        single_review: singleReview,
        unanimous_keep: unanimousKeep,
        unanimous_exclude: unanimousExclude,
        conflicts,
        total_with_reviews: reviewedMemeCount
      },
      judges,
      ai_judge: aiJudge
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error generating superadmin summary";
    return json({ error: msg }, { status: 500 });
  }
};
