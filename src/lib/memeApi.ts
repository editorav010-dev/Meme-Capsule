import { getDailyFallbackMeme, getRandomFallbackMeme } from "../data/fallbackMemes";
import { pickAdminMeme, pickDailyAdminMeme } from "./adminCollection";
import type { Meme } from "../types";

const canUseLocalAdminCollection = () => {
  const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const forceBackend = new URLSearchParams(window.location.search).has("backend");
  return isLocalHost && !forceBackend;
};

const normalizeMeme = (value: unknown): Meme | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Meme>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.url !== "string" ||
    typeof candidate.category !== "string" ||
    !Array.isArray(candidate.tags) ||
    typeof candidate.rarity !== "string" ||
    typeof candidate.uploaded_at !== "string" ||
    typeof candidate.share_text !== "string"
  ) {
    return null;
  }

  if (!["Common", "Rare", "Legendary"].includes(candidate.rarity)) {
    return null;
  }

  return candidate as Meme;
};

const fetchMeme = async (endpoint: string) => {
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Meme request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { meme?: unknown };
  const meme = normalizeMeme(payload.meme);
  if (!meme) {
    throw new Error("Meme response was malformed");
  }

  return meme;
};

export const getRandomMeme = async (excludeId?: string) => {
  if (canUseLocalAdminCollection()) {
    const adminMeme = pickAdminMeme(excludeId);
    if (adminMeme) {
      return adminMeme;
    }
  }

  try {
    return await fetchMeme("/api/random-meme");
  } catch {
    return getRandomFallbackMeme(excludeId);
  }
};

export const getDailyMeme = async () => {
  if (canUseLocalAdminCollection()) {
    const adminMeme = pickDailyAdminMeme();
    if (adminMeme) {
      return adminMeme;
    }
  }

  try {
    return await fetchMeme("/api/daily-meme");
  } catch {
    return getDailyFallbackMeme();
  }
};
