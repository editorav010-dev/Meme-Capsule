/**
 * GET /api/curate/ai-presets
 * POST /api/curate/ai-presets
 * DELETE /api/curate/ai-presets?id=...
 *
 * Dedicated AI model presets endpoint isolated strictly per individual judge.
 * Guarantees that Judge A can never query, view, modify, or delete Judge B's presets or keys.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { requireAuth } from "../../_shared/catAuth";
import { ensureCurationTables } from "../../_shared/curateDb";

interface SavePresetPayload {
  id?: string;
  preset_name?: string;
  provider?: string;
  base_url?: string;
  api_key?: string;
  model?: string;
  settings?: Record<string, unknown>;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await requireAuth(request, env);

    const results = await env.DB.prepare(`
      SELECT id, preset_name, provider, base_url, api_key, model, settings, created_at, updated_at
      FROM cat_judge_ai_presets
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).bind(sessionUser.id).all();

    const presets = (results.results || []).map((row: any) => {
      let parsedSettings = {};
      try {
        parsedSettings = JSON.parse(row.settings || "{}");
      } catch {
        // ignore
      }
      return {
        ...row,
        settings: parsedSettings
      };
    });

    return json({ success: true, presets });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error retrieving presets";
    return json({ error: msg }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await requireAuth(request, env);

    const body = (await request.json().catch(() => ({}))) as SavePresetPayload;
    const presetName = (body.preset_name || "").trim();
    const provider = (body.provider || "custom").trim();
    const baseUrl = (body.base_url || "").trim();
    const apiKey = (body.api_key || "").trim();
    const model = (body.model || "").trim();
    const settingsStr = JSON.stringify(body.settings || {});

    if (!presetName) {
      return json({ error: "Preset name is required." }, { status: 400 });
    }
    if (!baseUrl) {
      return json({ error: "API Base URL is required." }, { status: 400 });
    }
    if (!model) {
      return json({ error: "Model identifier is required." }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (body.id) {
      // Update existing preset strictly verified by user_id
      const existing = await env.DB.prepare(`
        SELECT id FROM cat_judge_ai_presets WHERE id = ? AND user_id = ?
      `).bind(body.id, sessionUser.id).first();

      if (!existing) {
        return json({ error: "Preset not found or belongs to another user." }, { status: 404 });
      }

      await env.DB.prepare(`
        UPDATE cat_judge_ai_presets
        SET preset_name = ?, provider = ?, base_url = ?, api_key = ?, model = ?, settings = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).bind(presetName, provider, baseUrl, apiKey, model, settingsStr, now, body.id, sessionUser.id).run();

      return json({
        success: true,
        preset: {
          id: body.id,
          user_id: sessionUser.id,
          preset_name: presetName,
          provider,
          base_url: baseUrl,
          api_key: apiKey,
          model,
          settings: body.settings || {},
          updated_at: now
        }
      });
    }

    // Insert new preset
    const newId = `preset-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare(`
      INSERT INTO cat_judge_ai_presets (
        id, user_id, preset_name, provider, base_url, api_key, model, settings, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(newId, sessionUser.id, presetName, provider, baseUrl, apiKey, model, settingsStr, now, now).run();

    return json({
      success: true,
      preset: {
        id: newId,
        user_id: sessionUser.id,
        preset_name: presetName,
        provider,
        base_url: baseUrl,
        api_key: apiKey,
        model,
        settings: body.settings || {},
        created_at: now,
        updated_at: now
      }
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error saving preset";
    return json({ error: msg }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await requireAuth(request, env);

    const url = new URL(request.url);
    const presetId = url.searchParams.get("id");

    if (!presetId) {
      return json({ error: "Preset id parameter is required." }, { status: 400 });
    }

    // Strictly ensure preset belongs to this judge
    const res = await env.DB.prepare(`
      DELETE FROM cat_judge_ai_presets
      WHERE id = ? AND user_id = ?
    `).bind(presetId, sessionUser.id).run();

    if (res.meta.changes === 0) {
      return json({ error: "Preset not found or unauthorized." }, { status: 404 });
    }

    return json({ success: true, message: "Preset deleted successfully." });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error deleting preset";
    return json({ error: msg }, { status: 500 });
  }
};
