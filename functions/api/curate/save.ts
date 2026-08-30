/**
 * POST /api/curate/save
 * 
 * Saves editorial judgment and multi-dimensional categorization for a meme.
 * Tracks user_id and user_name for multi-curator workflows.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { validateSession } from "../../_shared/catAuth";

interface SavePayload {
  meme_id?: string;
  corpus_status?: "keep" | "excluded" | "duplicate" | "review_later";
  duplicate_of?: string;
  topics?: string[];
  tone?: string;
  humour_mechanisms?: string[];
  curator_note?: string;
  user_id?: string;
  user_name?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const sessionUser = await validateSession(request, env);
    const body = (await request.json().catch(() => ({}))) as SavePayload;
    const memeId = (body.meme_id || "").trim();
    const corpusStatus = body.corpus_status;

    if (!memeId) {
      return json({ error: "meme_id is required." }, { status: 400 });
    }

    if (!corpusStatus || !["keep", "excluded", "duplicate", "review_later"].includes(corpusStatus)) {
      return json({ error: "corpus_status must be 'keep', 'excluded', 'duplicate', or 'review_later'." }, { status: 400 });
    }

    const userId = sessionUser?.id || (body.user_id || "curator-1").trim();
    const userName = sessionUser?.display_name || (body.user_name || "Curator").trim();

    // Enforce taxonomy selection limits
    const rawTopics = Array.isArray(body.topics) ? body.topics.filter(Boolean) : [];
    const topics = rawTopics.slice(0, 3); // Max 3 topics

    const tone = (body.tone || "").trim() || null; // 1 dominant tone

    const rawMechanisms = Array.isArray(body.humour_mechanisms) ? body.humour_mechanisms.filter(Boolean) : [];
    const mechanisms = rawMechanisms.slice(0, 2); // Max 2 mechanisms

    const duplicateOf = (body.duplicate_of || "").trim() || null;
    const curatorNote = (body.curator_note || "").trim() || null;
    const now = new Date().toISOString();
    const curId = `cur-${crypto.randomUUID().slice(0, 8)}`;

    // 1. Upsert into meme_curation table
    await env.DB.prepare(`
      INSERT INTO meme_curation (
        id, meme_id, user_id, user_name, corpus_status, duplicate_of,
        topics, tone, humour_mechanisms, curator_note, reviewed_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(meme_id, user_id) DO UPDATE SET
        corpus_status = excluded.corpus_status,
        duplicate_of = excluded.duplicate_of,
        topics = excluded.topics,
        tone = excluded.tone,
        humour_mechanisms = excluded.humour_mechanisms,
        curator_note = excluded.curator_note,
        user_name = excluded.user_name,
        updated_at = excluded.updated_at
    `).bind(
      curId,
      memeId,
      userId,
      userName,
      corpusStatus,
      duplicateOf,
      JSON.stringify(topics),
      tone,
      JSON.stringify(mechanisms),
      curatorNote,
      now,
      now
    ).run();

    // 2. Reflect corpus status into main memes table active flag
    const isActive = corpusStatus === "keep" ? 1 : 0;
    await env.DB.prepare(
      "UPDATE memes SET is_active = ? WHERE id = ?"
    ).bind(isActive, memeId).run();

    return json({
      success: true,
      meme_id: memeId,
      user_id: userId,
      user_name: userName,
      corpus_status: corpusStatus,
      topics,
      tone,
      humour_mechanisms: mechanisms
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error saving curation decision";
    return json({ error: msg }, { status: 500 });
  }
};
