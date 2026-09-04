/**
 * GET /api/curate/next
 *
 * Fetches the next/previous meme in the chosen curation queue for the
 * current curator and exposes the AI pre-judge prediction as read-only
 * context for the human judges.
 *
 * IMPORTANT:
 * - AI predictions are NEVER written into meme_curation.
 * - AI predictions are NEVER written into meme_curation_final.
 * - Human curator decisions remain authoritative.
 * - ai_prediction is returned only as a suggestion/context object.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { validateSession } from "../../_shared/catAuth";
import { ensureCurationTables } from "../../_shared/curateDb";

interface MemeRow {
  id: string;
  title: string | null;
  image_url: string | null;
  storage_path: string | null;

  corpus_status: string | null;
  duplicate_of: string | null;
  topics: string | null;
  tone: string | null;
  humour_mechanisms: string | null;
  curator_note: string | null;
  user_id: string | null;
  user_name: string | null;
  reviewed_at: string | null;
  updated_at: string | null;

  ai_topics: string | null;
  ai_tone: string | null;
  ai_humour_mechanisms: string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_model: string | null;
  ai_tokens_used: number | null;
  ai_processing_ms: number | null;
  ai_error: string | null;
  ai_updated_at: string | null;
}

async function ensureAIPredictionTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_curation_predictions (
      meme_id           TEXT PRIMARY KEY,
      storage_path      TEXT,
      image_url         TEXT,
      topics            TEXT NOT NULL DEFAULT '[]',
      tone              TEXT,
      humour_mechanisms TEXT NOT NULL DEFAULT '[]',
      confidence        REAL NOT NULL DEFAULT 0,
      reasoning         TEXT,
      model             TEXT,
      tokens_used       INTEGER NOT NULL DEFAULT 0,
      processing_ms     INTEGER NOT NULL DEFAULT 0,
      raw_response      TEXT,
      error             TEXT,
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      FOREIGN KEY (meme_id) REFERENCES memes(id)
    )
  `).run();
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildCuration(row: MemeRow) {
  if (!row.corpus_status) return null;

  return {
    corpus_status: row.corpus_status,
    duplicate_of: row.duplicate_of,
    topics: parseJsonArray(row.topics),
    tone: row.tone,
    humour_mechanisms: parseJsonArray(row.humour_mechanisms),
    curator_note: row.curator_note,
    user_id: row.user_id,
    user_name: row.user_name,
    reviewed_at: row.reviewed_at,
    updated_at: row.updated_at,
  };
}

function buildAIPrediction(row: MemeRow) {
  // No AI result for this meme yet.
  if (
    !row.ai_topics &&
    !row.ai_tone &&
    !row.ai_humour_mechanisms &&
    row.ai_confidence === null &&
    !row.ai_reasoning &&
    !row.ai_model
  ) {
    return null;
  }

  return {
    topics: parseJsonArray(row.ai_topics),
    tone: row.ai_tone,
    humour_mechanisms: parseJsonArray(row.ai_humour_mechanisms),
    confidence: Number(row.ai_confidence ?? 0),
    reasoning: row.ai_reasoning,
    model: row.ai_model,
    tokens_used: Number(row.ai_tokens_used ?? 0),
    processing_ms: Number(row.ai_processing_ms ?? 0),
    error: row.ai_error,
    updated_at: row.ai_updated_at,
  };
}

const SELECT_COLUMNS = `
  m.id,
  m.title,
  m.image_url,
  m.storage_path,

  c.corpus_status,
  c.duplicate_of,
  c.topics,
  c.tone,
  c.humour_mechanisms,
  c.curator_note,
  c.user_id,
  c.user_name,
  c.reviewed_at,
  c.updated_at,

  ai.topics            AS ai_topics,
  ai.tone              AS ai_tone,
  ai.humour_mechanisms AS ai_humour_mechanisms,
  ai.confidence        AS ai_confidence,
  ai.reasoning         AS ai_reasoning,
  ai.model             AS ai_model,
  ai.tokens_used       AS ai_tokens_used,
  ai.processing_ms     AS ai_processing_ms,
  ai.error             AS ai_error,
  ai.updated_at        AS ai_updated_at
`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);

    // The AI endpoint creates this table automatically, but creating it here
    // as well makes /api/curate/next safe even before the first AI run.
    await ensureAIPredictionTable(env.DB);

    const sessionUser = await validateSession(request, env);
    const userId = sessionUser?.id || "judge1";

    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "unreviewed";
    const currentId = url.searchParams.get("current_id") || "";
    const direction = url.searchParams.get("direction") || "next";
    const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    // 1. Overall counts for this judge.
    const totalCountRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes"
    ).first<{ cnt: number }>();

    const total = totalCountRes?.cnt ?? 0;

    const reviewedCountRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM meme_curation WHERE user_id = ?"
    ).bind(userId).first<{ cnt: number }>();

    const reviewed = reviewedCountRes?.cnt ?? 0;
    const remaining = Math.max(0, total - reviewed);

    // 2. Build the human-curation queue filter.
    let whereClause = "WHERE 1=1";

    if (filter === "unreviewed") {
      whereClause += " AND c.corpus_status IS NULL";
    } else if (filter === "review_later") {
      whereClause += " AND c.corpus_status = 'review_later'";
    } else if (filter === "keep") {
      whereClause += " AND c.corpus_status = 'keep'";
    } else if (filter === "excluded") {
      whereClause += " AND c.corpus_status = 'excluded'";
    } else if (filter === "duplicate") {
      whereClause += " AND c.corpus_status = 'duplicate'";
    }

    let targetMeme: MemeRow | null = null;

    // 3. Next/previous relative to current meme.
    if (currentId) {
      const currentMeme = await env.DB.prepare(
        "SELECT id, uploaded_at, random_key FROM memes WHERE id = ?"
      ).bind(currentId).first<{
        id: string;
        uploaded_at: string;
        random_key: number;
      }>();

      if (currentMeme) {
        const orderOp = direction === "prev" ? "<" : ">";
        const orderDir = direction === "prev" ? "DESC" : "ASC";

        targetMeme = await env.DB.prepare(`
          SELECT
            ${SELECT_COLUMNS}
          FROM memes m
          LEFT JOIN meme_curation c
            ON m.id = c.meme_id
           AND c.user_id = ?
          LEFT JOIN ai_curation_predictions ai
            ON m.id = ai.meme_id
          ${whereClause}
            AND m.uploaded_at ${orderOp} ?
          ORDER BY m.uploaded_at ${orderDir}
          LIMIT 1
        `).bind(userId, currentMeme.uploaded_at).first<MemeRow>();
      }
    }

    // 4. Default: first meme matching the selected queue.
    if (!targetMeme) {
      targetMeme = await env.DB.prepare(`
        SELECT
          ${SELECT_COLUMNS}
        FROM memes m
        LEFT JOIN meme_curation c
          ON m.id = c.meme_id
         AND c.user_id = ?
        LEFT JOIN ai_curation_predictions ai
          ON m.id = ai.meme_id
        ${whereClause}
        ORDER BY m.uploaded_at ASC
        LIMIT 1
      `).bind(userId).first<MemeRow>();
    }

    if (!targetMeme) {
      return json({
        meme: null,
        stats: {
          total,
          reviewed,
          remaining,
          current_index: reviewed,
        },
      });
    }

    const fullUrl =
      targetMeme.image_url ||
      (
        targetMeme.storage_path &&
        publicBase
          ? `${publicBase}/${targetMeme.storage_path.replace(/^\/+/, "")}`
          : ""
      ) ||
      "";

    return json({
      meme: {
        id: targetMeme.id,
        title: targetMeme.title || "Untitled Meme",
        image_url: fullUrl,
        storage_path: targetMeme.storage_path || "",

        // Human judge's own saved decision, if one exists.
        curation: buildCuration(targetMeme),

        // AI pre-judge suggestion. Read-only; does not affect curation.
        ai_prediction: buildAIPrediction(targetMeme),
      },

      stats: {
        total,
        reviewed,
        remaining,
        current_index: reviewed + 1,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;

    const msg =
      err instanceof Error
        ? err.message
        : "Error fetching next curation meme";

    return json({ error: msg }, { status: 500 });
  }
};
