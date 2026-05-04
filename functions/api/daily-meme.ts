import type { PagesFunction } from "../_shared/pages";
import { dailyMemeOrFallback, json, type Env } from "../_shared/d1r2";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const meme = await dailyMemeOrFallback(env);
  const today = new Date().toISOString().slice(0, 10);
  return json({ meme, date: today });
};
