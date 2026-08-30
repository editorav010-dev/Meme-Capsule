/**
 * GET /api/curate/stats
 * 
 * Aggregates curation corpus progress and multi-dimensional distribution stats.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";

const TOPIC_LIST = [
  "Everyday Life",
  "Work / Education",
  "Relationships",
  "Family",
  "Politics / Society",
  "Internet Culture",
  "Pop Culture",
  "Gaming",
  "Animals",
  "Food",
  "Technology",
  "Other"
];

const TONE_LIST = [
  "Wholesome",
  "Dark",
  "Chaotic",
  "Cynical",
  "Awkward",
  "Neutral"
];

const MECHANISM_LIST = [
  "Relatability",
  "Absurdity",
  "Irony",
  "Satire",
  "Exaggeration",
  "Cringe",
  "Dark Humour",
  "Parody",
  "Surrealism"
];

interface CurationRow {
  corpus_status: string;
  topics: string;
  tone: string | null;
  humour_mechanisms: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    // 1. Overall Corpus Counts
    const totalCountRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes"
    ).first<{ cnt: number }>();
    const total = totalCountRes?.cnt ?? 0;

    const { results } = await env.DB.prepare(
      "SELECT corpus_status, topics, tone, humour_mechanisms FROM meme_curation"
    ).all<CurationRow>();

    const rows = results || [];
    const reviewed = rows.length;
    const remaining = Math.max(0, total - reviewed);

    let kept = 0;
    let excluded = 0;
    let duplicates = 0;
    let reviewLater = 0;

    const topicCounts: Record<string, number> = {};
    const toneCounts: Record<string, number> = {};
    const mechanismCounts: Record<string, number> = {};

    for (const r of rows) {
      if (r.corpus_status === "keep") kept++;
      else if (r.corpus_status === "excluded") excluded++;
      else if (r.corpus_status === "duplicate") duplicates++;
      else if (r.corpus_status === "review_later") reviewLater++;

      if (r.tone) {
        toneCounts[r.tone] = (toneCounts[r.tone] || 0) + 1;
      }

      if (r.topics) {
        try {
          const list = JSON.parse(r.topics);
          if (Array.isArray(list)) {
            for (const t of list) {
              topicCounts[t] = (topicCounts[t] || 0) + 1;
            }
          }
        } catch {
          // ignore
        }
      }

      if (r.humour_mechanisms) {
        try {
          const list = JSON.parse(r.humour_mechanisms);
          if (Array.isArray(list)) {
            for (const m of list) {
              mechanismCounts[m] = (mechanismCounts[m] || 0) + 1;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const topicsDistribution = TOPIC_LIST.map((topic) => {
      const count = topicCounts[topic] || 0;
      const percent = kept > 0 ? Math.round((count / kept) * 100) : 0;
      return { topic, count, percent };
    });

    const tonesDistribution = TONE_LIST.map((tone) => {
      const count = toneCounts[tone] || 0;
      const percent = kept > 0 ? Math.round((count / kept) * 100) : 0;
      return { tone, count, percent };
    });

    const mechanismsDistribution = MECHANISM_LIST.map((mechanism) => {
      const count = mechanismCounts[mechanism] || 0;
      const percent = kept > 0 ? Math.round((count / kept) * 100) : 0;
      return { mechanism, count, percent };
    });

    return json({
      counts: {
        total,
        reviewed,
        remaining,
        kept,
        excluded,
        duplicates,
        review_later: reviewLater,
        percent_complete: total > 0 ? Math.min(100, Math.round((reviewed / total) * 100)) : 0
      },
      distributions: {
        topics: topicsDistribution,
        tones: tonesDistribution,
        humour_mechanisms: mechanismsDistribution
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error computing curation stats";
    return json({ error: msg }, { status: 500 });
  }
};
