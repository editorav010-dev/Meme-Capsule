/**
 * GET /api/curate/export
 * 
 * Exports all curated meme metadata as CSV or JSON format.
 */

import type { PagesFunction } from "../../_shared/pages";
import { type Env } from "../../_shared/d1r2";

interface ExportRow {
  meme_id: string;
  title: string | null;
  corpus_status: string;
  duplicate_of: string | null;
  topics: string;
  tone: string | null;
  humour_mechanisms: string;
  curator_note: string | null;
  reviewed_at: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") || "json").toLowerCase();

    const { results } = await env.DB.prepare(`
      SELECT 
        c.meme_id,
        m.title,
        c.corpus_status,
        c.duplicate_of,
        c.topics,
        c.tone,
        c.humour_mechanisms,
        c.curator_note,
        c.reviewed_at,
        c.updated_at
      FROM meme_curation c
      LEFT JOIN memes m ON c.meme_id = m.id
      ORDER BY c.reviewed_at ASC
    `).all<ExportRow>();

    const rows = results || [];

    // JSON Export
    if (format === "json") {
      const data = rows.map((r) => {
        let topicsList: string[] = [];
        let mechanismsList: string[] = [];
        try {
          topicsList = JSON.parse(r.topics);
        } catch {
          topicsList = [];
        }
        try {
          mechanismsList = JSON.parse(r.humour_mechanisms);
        } catch {
          mechanismsList = [];
        }

        return {
          meme_id: r.meme_id,
          title: r.title || "Untitled Meme",
          corpus_status: r.corpus_status,
          duplicate_of: r.duplicate_of,
          topics: topicsList,
          tone: r.tone,
          humour_mechanisms: mechanismsList,
          curator_note: r.curator_note,
          reviewed_at: r.reviewed_at,
          updated_at: r.updated_at
        };
      });

      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="meme_capsule_curated.json"'
        }
      });
    }

    // CSV Export
    const csvEscape = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const header = [
      "meme_id",
      "title",
      "corpus_status",
      "duplicate_of",
      "topics",
      "tone",
      "humour_mechanisms",
      "curator_note",
      "reviewed_at",
      "updated_at"
    ].join(",");

    const lines = rows.map((r) => {
      let topicsStr = "";
      let mechanismsStr = "";
      try {
        const t = JSON.parse(r.topics);
        if (Array.isArray(t)) topicsStr = t.join("; ");
      } catch {
        topicsStr = "";
      }
      try {
        const m = JSON.parse(r.humour_mechanisms);
        if (Array.isArray(m)) mechanismsStr = m.join("; ");
      } catch {
        mechanismsStr = "";
      }

      return [
        csvEscape(r.meme_id),
        csvEscape(r.title),
        csvEscape(r.corpus_status),
        csvEscape(r.duplicate_of),
        csvEscape(topicsStr),
        csvEscape(r.tone),
        csvEscape(mechanismsStr),
        csvEscape(r.curator_note),
        csvEscape(r.reviewed_at),
        csvEscape(r.updated_at)
      ].join(",");
    });

    const csvContent = [header, ...lines].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="meme_capsule_curated.csv"'
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error exporting curation data";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
