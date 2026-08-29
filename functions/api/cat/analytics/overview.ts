/**
 * GET /api/cat/analytics/overview
 * 
 * Superadmin analytics overview: completion rates, judge comparisons,
 * category distribution, and disagreement metrics.
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

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env, "superadmin");

    // 1. Total active memes
    const totalMemesRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes WHERE is_active = 1"
    ).first<{ cnt: number }>();
    const totalMemes = totalMemesRes?.cnt ?? 0;

    // 2. Total decisions recorded
    const totalDecisionsRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM cat_decisions"
    ).first<{ cnt: number }>();
    const totalDecisions = totalDecisionsRes?.cnt ?? 0;

    // 3. Resolved memes (either automatic consensus reached or manually confirmed)
    const resolvedRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM cat_consensus WHERE is_resolved = 1 OR final_category IS NOT NULL"
    ).first<{ cnt: number }>();
    const resolvedMemes = resolvedRes?.cnt ?? 0;
    const unresolvedMemes = Math.max(0, totalMemes - resolvedMemes);

    // 4. Number of active judges
    const judgeCountRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM cat_users WHERE is_active = 1 AND role = 'judge'"
    ).first<{ cnt: number }>();
    const totalJudges = Math.max(1, judgeCountRes?.cnt ?? 1);

    // 5. Fully categorised memes (where all active judges have voted)
    const fullyCatRes = await env.DB.prepare(`
      SELECT COUNT(*) as cnt FROM (
        SELECT meme_id FROM cat_decisions 
        GROUP BY meme_id 
        HAVING COUNT(DISTINCT user_id) >= ?
      )
    `).bind(totalJudges).first<{ cnt: number }>();
    const fullyCategorised = fullyCatRes?.cnt ?? 0;

    // 6. Per-judge progress stats
    const { results: judgeRows } = await env.DB.prepare(`
      SELECT 
        u.id as user_id,
        u.display_name,
        COALESCE(SUM(CASE WHEN d.skipped = 0 THEN 1 ELSE 0 END), 0) as categorised,
        COALESCE(SUM(CASE WHEN d.skipped = 1 THEN 1 ELSE 0 END), 0) as skipped
      FROM cat_users u
      LEFT JOIN cat_decisions d ON u.id = d.user_id
      WHERE u.is_active = 1 AND u.role = 'judge'
      GROUP BY u.id, u.display_name
      ORDER BY categorised DESC
    `).all<{
      user_id: string;
      display_name: string;
      categorised: number;
      skipped: number;
    }>();

    const judges = (judgeRows || []).map((j) => {
      const decided = j.categorised + j.skipped;
      const pct = totalMemes > 0 ? Math.min(100, Math.round((decided / totalMemes) * 100)) : 0;
      return {
        user_id: j.user_id,
        display_name: j.display_name,
        categorised: j.categorised,
        skipped: j.skipped,
        percent_complete: pct
      };
    });

    // 7. Category distribution from resolved / final consensus (and active decisions)
    const { results: catCounts } = await env.DB.prepare(`
      SELECT 
        COALESCE(final_category, consensus_category) as cat_id,
        COUNT(*) as cnt
      FROM cat_consensus
      WHERE (consensus_category IS NOT NULL OR final_category IS NOT NULL)
      GROUP BY cat_id
    `).all<{ cat_id: number; cnt: number }>();

    const catCountMap: Record<number, number> = {};
    let totalCategorisedCount = 0;
    for (const row of catCounts || []) {
      if (row.cat_id >= 1 && row.cat_id <= 7) {
        catCountMap[row.cat_id] = row.cnt;
        totalCategorisedCount += row.cnt;
      }
    }

    const categoryDistribution = [1, 2, 3, 4, 5, 6, 7].map((id) => {
      const count = catCountMap[id] ?? 0;
      const percent = totalCategorisedCount > 0 ? Math.round((count / totalCategorisedCount) * 100) : 0;
      return {
        category_id: id,
        label: CATEGORY_MAP[id] || `Category ${id}`,
        count,
        percent
      };
    });

    // 8. Disagreement rate: memes with >= 2 votes where confidence_score <= 0.5 (split votes)
    const totalMultiVoteRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM cat_consensus WHERE judge_count >= 2"
    ).first<{ cnt: number }>();
    const multiVoteCount = totalMultiVoteRes?.cnt ?? 0;

    const disagreeRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM cat_consensus WHERE judge_count >= 2 AND confidence_score <= 0.5 AND final_category IS NULL"
    ).first<{ cnt: number }>();
    const disagreeCount = disagreeRes?.cnt ?? 0;

    const disagreementRate = multiVoteCount > 0 ? Math.round((disagreeCount / multiVoteCount) * 100) : 0;

    // 9. Last activity timestamp
    const lastActRes = await env.DB.prepare(
      "SELECT decided_at FROM cat_decisions ORDER BY decided_at DESC LIMIT 1"
    ).first<{ decided_at: string }>();

    return json({
      total_memes: totalMemes,
      total_decisions: totalDecisions,
      resolved_memes: resolvedMemes,
      unresolved_memes: unresolvedMemes,
      fully_categorised: fullyCategorised,
      judges,
      category_distribution: categoryDistribution,
      disagreement_rate: disagreementRate,
      last_activity: lastActRes?.decided_at || new Date().toISOString()
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error retrieving analytics overview";
    return json({ error: msg }, { status: 500 });
  }
};
