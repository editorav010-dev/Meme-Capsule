/**
 * GET /api/curate/next
 * 
 * Fetches the next/previous meme in the chosen curation queue.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";

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
  reviewed_at: string | null;
  updated_at: string | null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "unreviewed";
    const currentId = url.searchParams.get("current_id") || "";
    const direction = url.searchParams.get("direction") || "next";
    const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    // 1. Calculate overall counts
    const totalCountRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes"
    ).first<{ cnt: number }>();
    const total = totalCountRes?.cnt ?? 0;

    const reviewedCountRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM meme_curation"
    ).first<{ cnt: number }>();
    const reviewed = reviewedCountRes?.cnt ?? 0;
    const remaining = Math.max(0, total - reviewed);

    // 2. Build WHERE condition based on filter
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

    if (currentId) {
      // Find current meme's row index or uploaded_at
      const currentMeme = await env.DB.prepare(
        "SELECT id, uploaded_at, random_key FROM memes WHERE id = ?"
      ).bind(currentId).first<{ id: string; uploaded_at: string; random_key: number }>();

      if (currentMeme) {
        const orderOp = direction === "prev" ? "<" : ">";
        const orderDir = direction === "prev" ? "DESC" : "ASC";

        targetMeme = await env.DB.prepare(`
          SELECT 
            m.id, m.title, m.image_url, m.storage_path,
            c.corpus_status, c.duplicate_of, c.topics, c.tone,
            c.humour_mechanisms, c.curator_note, c.reviewed_at, c.updated_at
          FROM memes m
          LEFT JOIN meme_curation c ON m.id = c.meme_id
          ${whereClause} AND m.uploaded_at ${orderOp} ?
          ORDER BY m.uploaded_at ${orderDir}
          LIMIT 1
        `).bind(currentMeme.uploaded_at).first<MemeRow>();
      }
    }

    // Default: fetch the first unreviewed or matching meme
    if (!targetMeme) {
      targetMeme = await env.DB.prepare(`
        SELECT 
          m.id, m.title, m.image_url, m.storage_path,
          c.corpus_status, c.duplicate_of, c.topics, c.tone,
          c.humour_mechanisms, c.curator_note, c.reviewed_at, c.updated_at
        FROM memes m
        LEFT JOIN meme_curation c ON m.id = c.meme_id
        ${whereClause}
        ORDER BY m.uploaded_at ASC
        LIMIT 1
      `).first<MemeRow>();
    }

    if (!targetMeme) {
      return json({
        meme: null,
        stats: {
          total,
          reviewed,
          remaining,
          current_index: reviewed
        }
      });
    }

    const fullUrl = targetMeme.image_url || (targetMeme.storage_path && publicBase ? `${publicBase}/${targetMeme.storage_path.replace(/^\/+/, "")}` : "") || "";

    let topicsList: string[] = [];
    let mechanismsList: string[] = [];

    if (targetMeme.topics) {
      try {
        const p = JSON.parse(targetMeme.topics);
        if (Array.isArray(p)) topicsList = p;
      } catch {
        topicsList = [];
      }
    }

    if (targetMeme.humour_mechanisms) {
      try {
        const p = JSON.parse(targetMeme.humour_mechanisms);
        if (Array.isArray(p)) mechanismsList = p;
      } catch {
        mechanismsList = [];
      }
    }

    return json({
      meme: {
        id: targetMeme.id,
        title: targetMeme.title || "Untitled Meme",
        image_url: fullUrl,
        storage_path: targetMeme.storage_path || "",
        curation: targetMeme.corpus_status ? {
          corpus_status: targetMeme.corpus_status,
          duplicate_of: targetMeme.duplicate_of,
          topics: topicsList,
          tone: targetMeme.tone,
          humour_mechanisms: mechanismsList,
          curator_note: targetMeme.curator_note,
          reviewed_at: targetMeme.reviewed_at,
          updated_at: targetMeme.updated_at
        } : null
      },
      stats: {
        total,
        reviewed,
        remaining,
        current_index: reviewed + 1
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching next curation meme";
    return json({ error: msg }, { status: 500 });
  }
};
