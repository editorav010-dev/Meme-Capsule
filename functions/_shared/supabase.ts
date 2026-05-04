import { dailyFallbackMeme, randomFallbackMeme } from "./fallbackMemes";
import type { Meme } from "../../src/types";

export type Env = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  ADMIN_API_TOKEN?: string;
};

export type SupabaseMemeRow = {
  id: string;
  title: string | null;
  image_url: string | null;
  storage_path: string | null;
  source_link: string | null;
  category: string | null;
  tags: string[] | null;
  rarity: Meme["rarity"] | null;
  status: Meme["status"] | null;
  media_type: Meme["media_type"] | null;
  input_method: Meme["input_method"] | null;
  uploaded_at: string | null;
  share_text: string | null;
  rights_note: string | null;
};

export const memeSelect =
  "id,title,image_url,storage_path,source_link,category,tags,rarity,status,media_type,input_method,uploaded_at,share_text,rights_note,is_active,shown_count,share_count,random_key";

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

const getSupabaseKey = (env: Env) => env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

export const getSupabaseAdminKey = (env: Env) => env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseHeaders = (key: string, extraHeaders: HeadersInit = {}) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  ...extraHeaders
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

export const requireSupabaseAdmin = (env: Env) => {
  const key = getSupabaseAdminKey(env);
  if (!env.SUPABASE_URL || !key) {
    return {
      key: "",
      error: json(
        { error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin APIs." },
        { status: 503 }
      )
    };
  }

  return { key, error: null };
};

const toPublicStorageUrl = (env: Env, path: string) => {
  const trimmedPath = path.replace(/^\/+/, "");
  return `${env.SUPABASE_URL}/storage/v1/object/public/memes/${trimmedPath}`;
};

export const normalizeRow = (env: Env, row: SupabaseMemeRow): Meme => ({
  id: row.id,
  title: row.title || undefined,
  url: row.image_url || (row.storage_path ? toPublicStorageUrl(env, row.storage_path) : ""),
  storage_path: row.storage_path || undefined,
  source_link: row.source_link || row.image_url || row.storage_path || undefined,
  category: row.category || "Unsorted",
  tags: row.tags || [],
  rarity: row.rarity || "Common",
  status: row.status || "active",
  media_type: row.media_type || "image",
  input_method: row.input_method || "url",
  uploaded_at: row.uploaded_at || new Date().toISOString(),
  share_text: row.share_text || "Spawned from Meme Capsule",
  rights_note: row.rights_note || undefined
});

export const getRandomSupabaseMeme = async (env: Env): Promise<Meme | null> => {
  const key = getSupabaseKey(env);
  if (!env.SUPABASE_URL || !key) {
    return null;
  }

  const randomKey = Math.random();
  const baseUrl = `${env.SUPABASE_URL}/rest/v1/memes`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json"
  };

  const response = await fetch(
    `${baseUrl}?select=${memeSelect}&is_active=eq.true&status=eq.active&random_key=gte.${randomKey}&order=random_key.asc&limit=1`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  let rows = (await response.json()) as SupabaseMemeRow[];
  if (rows.length === 0) {
    const wrapResponse = await fetch(
      `${baseUrl}?select=${memeSelect}&is_active=eq.true&status=eq.active&order=random_key.asc&limit=1`,
      { headers }
    );
    if (!wrapResponse.ok) {
      throw new Error(`Supabase wrap request failed: ${wrapResponse.status}`);
    }
    rows = (await wrapResponse.json()) as SupabaseMemeRow[];
  }

  const meme = rows[0] ? normalizeRow(env, rows[0]) : null;
  return meme?.url ? meme : null;
};

export const getDailySupabaseMeme = async (env: Env): Promise<Meme | null> => {
  const key = getSupabaseKey(env);
  if (!env.SUPABASE_URL || !key) {
    return null;
  }

  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/memes?select=${memeSelect}&is_active=eq.true&status=eq.active&order=uploaded_at.desc&limit=50`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase daily request failed: ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseMemeRow[];
  if (rows.length === 0) {
    return null;
  }

  const now = new Date();
  const dayStamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const row = rows[Math.floor(dayStamp / 86_400_000) % rows.length];
  const meme = normalizeRow(env, row);
  return meme.url ? meme : null;
};

export const randomMemeOrFallback = async (env: Env) => {
  try {
    return (await getRandomSupabaseMeme(env)) || randomFallbackMeme();
  } catch {
    return randomFallbackMeme();
  }
};

export const dailyMemeOrFallback = async (env: Env) => {
  try {
    return (await getDailySupabaseMeme(env)) || dailyFallbackMeme();
  } catch {
    return dailyFallbackMeme();
  }
};
