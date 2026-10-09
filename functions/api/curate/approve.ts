/**
 * POST /api/curate/approve
 *
 * Atomic human adoption and authoritative finalization endpoint.
 * When any human judge (Judge 1, 2, or 3) adopts an AI decision or submits
 * a curation decision, this endpoint:
 * 1. Upserts into meme_curation (audit log of human judge's action)
 * 2. Upserts into meme_curation_final (authoritative final decision, bypassing SuperAdmin)
 * 3. Updates memes table (sets is_active, status, curation_status, tags, category)
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, handleD1Error, type Env } from "../../_shared/d1r2";
import { validateSession } from "../../_shared/catAuth";
import { ensureCurationTables } from "../../_shared/curateDb";

interface ApprovePayload {
  meme_id?: string;
  corpus_status?: "keep" | "excluded" | "duplicate" | "review_later";
  duplicate_of?: string;
  topics?: string[];
  tone?: string;
  humour_mechanisms?: string[];
  curator_note?: string;
  user_id?: string;
  user_name?: string;
  adopted_from?: "judge4" | "judge5" | "consensus" | "manual";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await validateSession(request, env);
    const body = (await request.json().catch(() => ({}))) as ApprovePayload;
    const memeId = (body.meme_id || "").trim();
    const corpusStatus = body.corpus_status;

    if (!memeId) {
      return json({ error: "meme_id is required." }, { status: 400 });
    }

    if (!corpusStatus || !["keep", "excluded", "duplicate", "review_later"].includes(corpusStatus)) {
      return json({ error: "corpus_status must be 'keep', 'excluded', 'duplicate', or 'review_later'." }, { status: 400 });
    }

    // Determine user from session or explicit payload
    const userId = sessionUser?.id || (body.user_id ? body.user_id.trim() : "user-judge1");
    const userName = sessionUser?.display_name || (body.user_name && body.user_name.trim() !== "Judge" ? body.user_name.trim() : "Judge One");

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

    const adoptedTag = body.adopted_from ? ` [Adopted: ${body.adopted_from}]` : "";
    const resolvedBy = `${userName}${adoptedTag}`;

    const isActive = corpusStatus === "keep" ? 1 : 0;
    const newStatus = corpusStatus === "keep" ? "active" : "archived";

    // 1. Upsert into meme_curation (judge's audit log)
    const stmtCuration = env.DB.prepare(`
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
    );

    // 2. Authoritative finalization in meme_curation_final (Immediate final decision, no SuperAdmin required)
    const stmtFinal = env.DB.prepare(`
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
    `).bind(
      memeId,
      corpusStatus,
      duplicateOf,
      JSON.stringify(topics),
      tone,
      JSON.stringify(mechanisms),
      curatorNote,
      resolvedBy,
      now,
      now
    );

    // 3. Update main memes table
    let stmtMemes: D1PreparedStatement;
    if (corpusStatus === "keep" && topics.length > 0) {
      stmtMemes = env.DB.prepare(
        "UPDATE memes SET is_active = ?, status = ?, curation_status = ?, tags = ?, category = COALESCE(?, category) WHERE id = ?"
      ).bind(isActive, newStatus, corpusStatus, JSON.stringify(topics), topics[0] || null, memeId);
    } else {
      stmtMemes = env.DB.prepare(
        "UPDATE memes SET is_active = ?, status = ?, curation_status = ? WHERE id = ?"
      ).bind(isActive, newStatus, corpusStatus, memeId);
    }

    // Execute atomically in a single batch
    await env.DB.batch([stmtCuration, stmtFinal, stmtMemes]);

    return json({
      success: true,
      meme_id: memeId,
      user_id: userId,
      user_name: userName,
      corpus_status: corpusStatus,
      topics,
      tone,
      humour_mechanisms: mechanisms,
      resolved_by: resolvedBy,
      is_final: true
    });
  } catch (err: unknown) {
    return handleD1Error(err, "Error approving curation decision");
  }
};
