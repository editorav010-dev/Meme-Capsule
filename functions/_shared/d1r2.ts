import { dailyFallbackMeme, randomFallbackMeme } from "./fallbackMemes";
import type { Meme } from "../../src/types";

export type Env = {
  DB: D1Database;
  MEMES_BUCKET: R2Bucket;
  ADMIN_API_TOKEN?: string;
  R2_PUBLIC_URL?: string;
  ANALYTICS_KV?: KVNamespace;
};

export type D1MemeRow = {
  id: string;
  title: string | null;
  image_url: string | null;
  storage_path: string | null;
  source_link: string | null;
  category: string | null;
  tags: string | null;
  rarity: string | null;
  status: string | null;
  media_type: string | null;
  input_method: string | null;
  is_active: number;
  uploaded_at: string | null;
  share_text: string | null;
  rights_note: string | null;
  shown_count: number;
  share_count: number;
  likes_count: number;
  random_key: number;
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...init.headers
    }
  });

export const requireAdmin = (request: Request, env: Env) => {
  if (!env.ADMIN_API_TOKEN) {
    return json({ error: "ADMIN_API_TOKEN is not configured." }, { status: 503 });
  }

  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const headerToken = request.headers.get("X-Admin-Token") || "";

  if (bearer !== env.ADMIN_API_TOKEN && headerToken !== env.ADMIN_API_TOKEN) {
    return json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  return null;
};

const parseTags = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toPublicUrl = (env: Env, storagePath: string) => {
  const base = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  const trimmedPath = storagePath.replace(/^\/+/, "");
  return base ? `${base}/${trimmedPath}` : "";
};

export const normalizeRow = (env: Env, row: D1MemeRow): Meme => ({
  id: row.id,
  title: row.title || undefined,
  url: row.image_url || (row.storage_path ? toPublicUrl(env, row.storage_path) : ""),
  storage_path: row.storage_path || undefined,
  source_link: row.source_link || row.image_url || row.storage_path || undefined,
  category: row.category || "Unsorted",
  tags: parseTags(row.tags),
  rarity: (row.rarity as Meme["rarity"]) || "Common",
  status: (row.status as Meme["status"]) || "active",
  media_type: (row.media_type as Meme["media_type"]) || "image",
  input_method: (row.input_method as Meme["input_method"]) || "url",
  uploaded_at: row.uploaded_at || new Date().toISOString(),
  share_text: row.share_text || "Spawned from Meme Capsule",
  rights_note: row.rights_note || undefined,
  likes_count: row.likes_count ?? 0
});

export const getRandomMeme = async (env: Env): Promise<Meme | null> => {
  const randomKey = Math.random();

  const { results } = await env.DB.prepare(
    `SELECT * FROM memes
     WHERE is_active = 1 AND status = 'active' AND random_key >= ?
     ORDER BY random_key ASC LIMIT 1`
  ).bind(randomKey).all<D1MemeRow>();

  let row = results[0];

  if (!row) {
    const wrap = await env.DB.prepare(
      `SELECT * FROM memes
       WHERE is_active = 1 AND status = 'active'
       ORDER BY random_key ASC LIMIT 1`
    ).all<D1MemeRow>();
    row = wrap.results[0];
  }

  if (!row) return null;

  const meme = normalizeRow(env, row);
  return meme.url ? meme : null;
};

export const getDailyMeme = async (env: Env): Promise<Meme | null> => {
  const { results } = await env.DB.prepare(
    `SELECT * FROM memes
     WHERE is_active = 1 AND status = 'active'
     ORDER BY uploaded_at DESC LIMIT 50`
  ).all<D1MemeRow>();

  if (results.length === 0) return null;

  const now = new Date();
  const dayStamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const row = results[Math.floor(dayStamp / 86_400_000) % results.length];
  const meme = normalizeRow(env, row);
  return meme.url ? meme : null;
};

export const randomMemeOrFallback = async (env: Env) => {
  try {
    return (await getRandomMeme(env)) || randomFallbackMeme();
  } catch {
    return randomFallbackMeme();
  }
};

export const dailyMemeOrFallback = async (env: Env) => {
  try {
    return (await getDailyMeme(env)) || dailyFallbackMeme();
  } catch {
    return dailyFallbackMeme();
  }
};
