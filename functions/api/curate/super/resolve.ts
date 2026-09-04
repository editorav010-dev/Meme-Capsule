/**
 * POST /api/curate/super/resolve
 *
 * Sets the final authoritative curation decision for a meme by Super Admin.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { validateSession } from "../../../_shared/catAuth";
import { ensureCurationTables } from "../../../_shared/curateDb";

interface ResolvePayload {
  meme_id?: string;
  corpus_status?: "keep" | "excluded" | "duplicate" | "review_later";
  duplicate_of?: string;
  topics?: string[];
  tone?: string;
  humour_mechanisms?: string[];
  curator_note?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);

    const sessionUser = await validateSession(request, env);
    if (!sessionUser || sessionUser.role !== "superadmin") {
      return json({ error: "Superadmin credentials required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ResolvePayload;
    const memeId = (body.meme_id || "").trim();
    const corpusStatus = body.corpus_status;

    if (!memeId) {
      return json({ error: "meme_id is required." }, { status: 400 });
    }

    if (
      !corpusStatus ||
      !["keep", "excluded", "duplicate", "review_later"].includes(corpusStatus)
    ) {
      return json(
        {
          error:
            "corpus_status must be 'keep', 'excluded', 'duplicate', or 'review_later'.",
        },
        { status: 400 },
      );
    }

    const rawTopics = Array.isArray(body.topics)
      ? body.topics.filter(Boolean)
      : [];
    const topics = rawTopics.slice(0, 3);

    const tone = (body.tone || "").trim() || null;

    const rawMechanisms = Array.isArray(body.humour_mechanisms)
      ? body.humour_mechanisms.filter(Boolean)
      : [];
    const mechanisms = rawMechanisms.slice(0, 2);

    const duplicateOf = (body.duplicate_of || "").trim() || null;
    const curatorNote = (body.curator_note || "").trim() || null;
    const now = new Date().toISOString();

    // Upsert into meme_curation_final
    await env.DB.prepare(`
      INSERT INTO meme_curation_final (
        meme_id,
        corpus_status,
        duplicate_of,
        topics,
        tone,
        humour_mechanisms,
        curator_note,
        resolved_by,
        resolved_at,
        updated_at
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
    `)
      .bind(
        memeId,
        corpusStatus,
        duplicateOf,
        JSON.stringify(topics),
        tone,
        JSON.stringify(mechanisms),
        curatorNote,
        sessionUser.display_name || "Super Admin",
        now,
        now,
      )
      .run();

    // Update active state in memes table
    const isActive = corpusStatus === "keep" ? 1 : 0;

    await env.DB.prepare(
      "UPDATE memes SET is_active = ? WHERE id = ?",
    )
      .bind(isActive, memeId)
      .run();

    return json({
      success: true,
      meme_id: memeId,
      corpus_status: corpusStatus,
      topics,
      tone,
      humour_mechanisms: mechanisms,
      resolved_by: sessionUser.display_name,
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;

    const msg =
      err instanceof Error ? err.message : "Error resolving meme";

    return json({ error: msg }, { status: 500 });
  }
};
