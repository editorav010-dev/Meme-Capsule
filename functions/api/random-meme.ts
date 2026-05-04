import type { PagesFunction } from "../_shared/pages";
import { json, randomMemeOrFallback, type Env } from "../_shared/d1r2";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const meme = await randomMemeOrFallback(env);
  return json({ meme });
};
