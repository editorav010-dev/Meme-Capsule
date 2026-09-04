/**
 * POST /api/admin/ai-categorise
 *
 * AI pre-judge endpoint for Meme Capsule.
 *
 * IMPORTANT:
 * - This endpoint NEVER writes to meme_curation.
 * - This endpoint NEVER writes to meme_curation_final.
 * - It stores AI predictions separately in ai_curation_predictions.
 * - meme_id is optional because R2 filenames do not necessarily equal
 *   D1 meme IDs. When storage_path is supplied, the endpoint resolves
 *   the real memes.id from D1.
 *
 * Expected authorization:
 *   Authorization: Bearer <ADMIN_API_TOKEN>
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";

const TOPICS = [
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
  "Other",
] as const;

const TONES = [
  "Wholesome",
  "Dark",
  "Chaotic",
  "Cynical",
  "Awkward",
  "Neutral",
] as const;

const MECHANISMS = [
  "Relatability",
  "Absurdity",
  "Irony",
  "Satire",
  "Exaggeration",
  "Cringe",
  "Dark Humour",
  "Parody",
  "Surrealism",
] as const;

interface AICategorisePayload {
  meme_id?: string;
  storage_path?: string;
  image_url?: string;

  topics?: unknown;
  tone?: unknown;
  humour_mechanisms?: unknown;

  confidence?: unknown;
  reasoning?: unknown;
  model?: unknown;
  tokens_used?: unknown;
  processing_ms?: unknown;
  raw_response?: unknown;
  error?: unknown;
}

type PredictionRow = {
  meme_id: string;
  storage_path: string | null;
  image_url: string | null;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeChoice(
  value: unknown,
  allowed: readonly string[],
): string | null {
  const input = normalizeString(value).toLowerCase();

  if (!input) return null;

  return (
    allowed.find(
      (item) => item.toLowerCase() === input,
    ) || null
  );
}

function normalizeList(
  value: unknown,
  allowed: readonly string[],
  max: number,
): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];

  for (const item of value) {
    const normalized = normalizeChoice(item, allowed);

    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }

    if (result.length >= max) break;
  }

  return result;
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
      created_at        TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ),
      updated_at        TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ),
      FOREIGN KEY (meme_id) REFERENCES memes(id)
    )
  `).run();
}

async function resolveMeme(
  db: D1Database,
  body: AICategorisePayload,
): Promise<PredictionRow | null> {
  const memeId = normalizeString(body.meme_id);
  const storagePath = normalizeString(body.storage_path);
  const imageUrl = normalizeString(body.image_url);

  // 1. If a real D1 meme_id is supplied, use it.
  if (memeId) {
    const row = await db.prepare(`
      SELECT id AS meme_id, storage_path, image_url
      FROM memes
      WHERE id = ?
      LIMIT 1
    `).bind(memeId).first<PredictionRow>();

    return row || null;
  }

  // 2. Preferred fallback: R2 object key == memes.storage_path.
  if (storagePath) {
    const row = await db.prepare(`
      SELECT id AS meme_id, storage_path, image_url
      FROM memes
      WHERE storage_path = ?
      LIMIT 1
    `).bind(storagePath).first<PredictionRow>();

    if (row) return row;
  }

  // 3. Last fallback: exact image URL.
  if (imageUrl) {
    const row = await db.prepare(`
      SELECT id AS meme_id, storage_path, image_url
      FROM memes
      WHERE image_url = ?
      LIMIT 1
    `).bind(imageUrl).first<PredictionRow>();

    if (row) return row;
  }

  return null;
}

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  try {
    const authHeader = request.headers.get("Authorization");

    const adminToken = (env as Env & {
      ADMIN_API_TOKEN?: string;
    }).ADMIN_API_TOKEN;

    if (
      !adminToken ||
      !authHeader ||
      authHeader !== `Bearer ${adminToken}`
    ) {
      return json(
        { error: "Unauthorised" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as AICategorisePayload;

    // Ensure the AI-only table exists. This makes deployment simpler:
    // no separate migration is required for the first rollout.
    await ensureAIPredictionTable(env.DB);

    const hasIdentity =
      normalizeString(body.meme_id) ||
      normalizeString(body.storage_path) ||
      normalizeString(body.image_url);

    if (!hasIdentity) {
      return json(
        {
          error: "meme_id, storage_path or image_url required",
        },
        { status: 400 },
      );
    }

    const meme = await resolveMeme(env.DB, body);

    if (!meme) {
      return json(
        {
          error: "Meme not found",
          meme_id: normalizeString(body.meme_id) || null,
          storage_path: normalizeString(body.storage_path) || null,
          image_url: normalizeString(body.image_url) || null,
        },
        { status: 404 },
      );
    }

    const topics = normalizeList(body.topics, TOPICS, 3);
    const tone = normalizeChoice(body.tone, TONES);
    const mechanisms = normalizeList(
      body.humour_mechanisms,
      MECHANISMS,
      2,
    );

    if (topics.length < 1) {
      return json(
        { error: "At least one valid topic is required." },
        { status: 400 },
      );
    }

    if (!tone) {
      return json(
        { error: "A valid tone is required." },
        { status: 400 },
      );
    }

    if (mechanisms.length < 1) {
      return json(
        {
          error:
            "At least one valid humour mechanism is required.",
        },
        { status: 400 },
      );
    }

    const confidence = Math.max(
      0,
      Math.min(
        1,
        toNumber(body.confidence, 0),
      ),
    );

    const reasoning = normalizeString(body.reasoning) || null;
    const model = normalizeString(body.model) || null;

    const tokensUsed = Math.max(
      0,
      Math.round(toNumber(body.tokens_used, 0)),
    );

    const processingMs = Math.max(
      0,
      Math.round(toNumber(body.processing_ms, 0)),
    );

    const rawResponse = normalizeString(body.raw_response) || null;
    const error = normalizeString(body.error) || null;

    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO ai_curation_predictions (
        meme_id,
        storage_path,
        image_url,
        topics,
        tone,
        humour_mechanisms,
        confidence,
        reasoning,
        model,
        tokens_used,
        processing_ms,
        raw_response,
        error,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(meme_id) DO UPDATE SET
        storage_path = excluded.storage_path,
        image_url = excluded.image_url,
        topics = excluded.topics,
        tone = excluded.tone,
        humour_mechanisms = excluded.humour_mechanisms,
        confidence = excluded.confidence,
        reasoning = excluded.reasoning,
        model = excluded.model,
        tokens_used = excluded.tokens_used,
        processing_ms = excluded.processing_ms,
        raw_response = excluded.raw_response,
        error = excluded.error,
        updated_at = excluded.updated_at
    `).bind(
      meme.meme_id,
      meme.storage_path || normalizeString(body.storage_path) || null,
      meme.image_url || normalizeString(body.image_url) || null,
      JSON.stringify(topics),
      tone,
      JSON.stringify(mechanisms),
      confidence,
      reasoning,
      model,
      tokensUsed,
      processingMs,
      rawResponse,
      error,
      now,
      now,
    ).run();

    return json({
      success: true,
      meme_id: meme.meme_id,
      storage_path:
        meme.storage_path ||
        normalizeString(body.storage_path) ||
        null,
      topics,
      tone,
      humour_mechanisms: mechanisms,
      confidence,
      model,
      ai_only: true,
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;

    const message =
      err instanceof Error
        ? err.message
        : "AI categorisation failed";

    return json(
      { error: message },
      { status: 500 },
    );
  }
};
