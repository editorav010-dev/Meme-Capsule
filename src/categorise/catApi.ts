/**
 * API client for the Meme Categorisation System.
 */

import type {
  CatUser,
  CatProgress,
  CatNextMeme,
  CatOverview,
  CatPaginatedMemes,
  CatMemeComparisonItem
} from "./catTypes";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
});

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed with ${res.status}`);
  }
  return data as T;
}

export async function catLogin(username: string, password: string): Promise<{
  token: string;
  user: CatUser;
  expires_at: string;
}> {
  const res = await fetch("/api/cat/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return handleResponse(res);
}

export async function catLogout(token: string): Promise<{ success: boolean }> {
  const res = await fetch("/api/cat/logout", {
    method: "POST",
    headers: authHeaders(token)
  });
  return handleResponse(res);
}

export async function catGetMe(token: string): Promise<{
  user: CatUser;
  progress: CatProgress;
}> {
  const res = await fetch("/api/cat/me", {
    method: "GET",
    headers: authHeaders(token),
    cache: "no-store"
  });
  return handleResponse(res);
}

export async function catGetNextMeme(token: string): Promise<{
  meme: CatNextMeme | null;
}> {
  const res = await fetch("/api/cat/next", {
    method: "GET",
    headers: authHeaders(token),
    cache: "no-store"
  });
  return handleResponse(res);
}

export async function catSubmitDecision(
  token: string,
  payload: {
    meme_id: string;
    category_id: number;
    confidence?: number;
    notes?: string;
  }
): Promise<{ success: boolean; next_meme_id: string | null }> {
  const res = await fetch("/api/cat/decide", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function catGetMemeDetail(
  token: string,
  memeId: string
): Promise<{
  meme: { id: string; title: string; image_url: string; storage_path: string };
  consensus: CatMemeComparisonItem | null;
  decisions: any[];
}> {
  const res = await fetch(`/api/cat/meme/${encodeURIComponent(memeId)}`, {
    method: "GET",
    headers: authHeaders(token),
    cache: "no-store"
  });
  return handleResponse(res);
}

export async function catGetOverview(token: string): Promise<CatOverview> {
  const res = await fetch("/api/cat/analytics/overview", {
    method: "GET",
    headers: authHeaders(token),
    cache: "no-store"
  });
  return handleResponse(res);
}

export async function catGetMemesAnalytics(
  token: string,
  params: { page?: number; per_page?: number; filter?: string }
): Promise<CatPaginatedMemes> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.filter) query.set("filter", params.filter);

  const res = await fetch(`/api/cat/analytics/memes?${query.toString()}`, {
    method: "GET",
    headers: authHeaders(token),
    cache: "no-store"
  });
  return handleResponse(res);
}

export async function catConfirmCategory(
  token: string,
  memeId: string,
  finalCategory: number
): Promise<{ success: boolean; meme_id: string; final_category: number; category_label: string }> {
  const res = await fetch("/api/cat/analytics/confirm", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ meme_id: memeId, final_category: finalCategory })
  });
  return handleResponse(res);
}

export async function catGetUsers(token: string): Promise<{ users: any[] }> {
  const res = await fetch("/api/cat/admin/users", {
    method: "GET",
    headers: authHeaders(token),
    cache: "no-store"
  });
  return handleResponse(res);
}

export async function catCreateUser(
  token: string,
  data: { username: string; display_name: string; password: string; role: "judge" | "superadmin" }
): Promise<{ success: boolean; user: any }> {
  const res = await fetch("/api/cat/admin/users", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function catReset(
  token: string,
  type: "user" | "meme",
  id: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/cat/admin/reset", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ type, id })
  });
  return handleResponse(res);
}
