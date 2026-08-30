/**
 * API client for Curation & Multi-Dimensional Categorization.
 */

import type {
  CurateMemeItem,
  CurationCounts,
  CurationStatsResponse,
  CorpusStatus
} from "./curateTypes";

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed with ${res.status}`);
  }
  return data as T;
}

export async function fetchNextMeme(
  filter: string = "unreviewed",
  currentId?: string,
  direction: "next" | "prev" = "next"
): Promise<{
  meme: CurateMemeItem | null;
  stats: { total: number; reviewed: number; remaining: number; current_index: number };
}> {
  const query = new URLSearchParams();
  if (filter) query.set("filter", filter);
  if (currentId) query.set("current_id", currentId);
  if (direction) query.set("direction", direction);

  const res = await fetch(`/api/curate/next?${query.toString()}`, {
    cache: "no-store"
  });
  return handleResponse(res);
}

export async function saveCuration(payload: {
  meme_id: string;
  corpus_status: CorpusStatus;
  duplicate_of?: string | null;
  topics?: string[];
  tone?: string | null;
  humour_mechanisms?: string[];
  curator_note?: string | null;
}): Promise<{ success: boolean; meme_id: string }> {
  const res = await fetch("/api/curate/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function fetchCurationStats(): Promise<CurationStatsResponse> {
  const res = await fetch("/api/curate/stats", {
    cache: "no-store"
  });
  return handleResponse(res);
}

export function getExportUrl(format: "json" | "csv"): string {
  return `/api/curate/export?format=${format}`;
}

export async function fetchCurationList(
  page: number = 1,
  perPage: number = 24,
  filter: string = "all"
): Promise<{
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  memes: CurateMemeItem[];
}> {
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    filter
  });

  const res = await fetch(`/api/curate/list?${query.toString()}`, {
    cache: "no-store"
  });
  return handleResponse(res);
}
