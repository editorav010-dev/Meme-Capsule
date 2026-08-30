/**
 * GET /api/curate/super/export
 * 
 * Exports authoritative final dataset or multi-judge comparison matrix as CSV or JSON.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { type Env } from "../../../_shared/d1r2";
import { validateSession } from "../../../_shared/catAuth";
import { ensureCurationTables } from "../../../_shared/curateDb";

interface FinalExportRow {
  meme_id: string;
  title: string | null;
  corpus_status: string;
  duplicate_of: string | null;
  topics: string;
  tone: string | null;
  humour_mechanisms: string;
  curator_note: string | null;
  resolved_by: string;
  resolved_at: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await validateSession(request, env);
    if (!sessionUser || sessionUser.role !== "superadmin") {
      return new Response(JSON.stringify({ error: "Superadmin authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const url = new URL(request.url);
    const format = (url.searchParams.get("format") || "csv").toLowerCase();
    const type = url.searchParams.get("type") || "final";

    if (type === "final") {
      const { results } = await env.DB.prepare(`
        SELECT 
          f.meme_id, m.title, f.corpus_status, f.duplicate_of,
          f.topics, f.tone, f.humour_mechanisms, f.curator_note,
          f.resolved_by, f.resolved_at, f.updated_at
        FROM meme_curation_final f
        LEFT JOIN memes m ON f.meme_id = m.id
        ORDER BY f.resolved_at ASC
      `).all<FinalExportRow>();

      const rows = results || [];

      if (format === "json") {
        const data = rows.map((r) => {
          let t: string[] = [];
          let m: string[] = [];
          try {
            t = JSON.parse(r.topics);
          } catch {
            t = [];
          }
          try {
            m = JSON.parse(r.humour_mechanisms);
          } catch {
            m = [];
          }
          return {
            meme_id: r.meme_id,
            title: r.title || "Untitled Meme",
            corpus_status: r.corpus_status,
            duplicate_of: r.duplicate_of,
            topics: t,
            tone: r.tone,
            humour_mechanisms: m,
            curator_note: r.curator_note,
            resolved_by: r.resolved_by,
            resolved_at: r.resolved_at,
            updated_at: r.updated_at
          };
        });

        return new Response(JSON.stringify(data, null, 2), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": 'attachment; filename="meme_capsule_curated_final.json"'
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
        "resolved_by",
        "resolved_at",
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
          csvEscape(r.resolved_by),
          csvEscape(r.resolved_at),
          csvEscape(r.updated_at)
        ].join(",");
      });

      const csvContent = [header, ...lines].join("\r\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="meme_capsule_curated_final.csv"'
        }
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported export type" }), { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error exporting superadmin data";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
