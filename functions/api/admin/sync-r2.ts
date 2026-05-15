import type { PagesFunction } from "../../_shared/pages";
import { json, requireAdmin, type Env, type D1MemeRow } from "../../_shared/d1r2";

/**
 * POST /api/admin/sync-r2
 * Scans the R2 bucket and creates D1 records for any files
 * that don't already have a matching storage_path in the database.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;

  const bucket = env.MEMES_BUCKET;
  const db = env.DB;
  const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

  // 1. List all objects in R2
  const allObjects: R2Object[] = [];
  let cursor: string | undefined;
  let listAttempts = 0;

  do {
    const listed = await bucket.list({ cursor, limit: 500 });
    allObjects.push(...listed.objects);
    cursor = listed.truncated ? listed.cursor : undefined;
    listAttempts++;
    if (listAttempts > 20) break; // safety limit: 10,000 files max
  } while (cursor);

  // 2. Filter only image/video files by extension
  const mediaExtensions = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".bmp",
    ".mp4", ".webm", ".mov", ".avi", ".mkv"
  ]);

  const mediaObjects = allObjects.filter((obj) => {
    const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
    return mediaExtensions.has(ext);
  });

  // 3. Get all existing storage_paths from D1
  const { results: existingRows } = await db
    .prepare("SELECT storage_path FROM memes WHERE storage_path IS NOT NULL")
    .all<{ storage_path: string }>();

  const existingPaths = new Set(existingRows.map((r) => r.storage_path));

  // Also check by image_url to avoid duplicates for files already added via URL
  const { results: existingUrls } = await db
    .prepare("SELECT image_url FROM memes WHERE image_url IS NOT NULL")
    .all<{ image_url: string }>();

  const existingUrlSet = new Set(existingUrls.map((r) => r.image_url));

  // 4. Find files in R2 that are NOT in D1
  const missing = mediaObjects.filter((obj) => {
    const fullUrl = publicBase ? `${publicBase}/${obj.key}` : obj.key;
    return !existingPaths.has(obj.key) && !existingUrlSet.has(fullUrl);
  });

  // 5. Insert missing files into D1
  let synced = 0;
  const syncedFiles: string[] = [];

  for (const obj of missing) {
    const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
    const isVideo = [".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext);
    const mediaType = isVideo ? "video" : "image";

    // Derive a human-readable title from the filename
    const filename = obj.key.split("/").pop() || obj.key;
    // Remove UUID prefix if present (pattern: uuid-filename.ext)
    const cleanName = filename
      .replace(/^[a-f0-9-]{36,}-?/i, "")  // remove UUID prefix
      .replace(/\.[^.]+$/, "")             // remove extension
      .replace(/[-_]+/g, " ")              // dashes/underscores to spaces
      .trim() || filename.replace(/\.[^.]+$/, "");

    const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    const fullUrl = publicBase ? `${publicBase}/${obj.key}` : "";
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO memes (id, title, image_url, storage_path, source_link, category, tags, rarity, status, media_type, input_method, is_active, uploaded_at, share_text, shown_count, share_count, random_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        title,
        fullUrl,
        obj.key,
        filename,
        "Synced",          // category
        "[]",              // tags
        "Common",          // rarity
        "active",          // status — set to active so they appear immediately
        mediaType,
        "r2-sync",         // input_method — marks these as synced from R2
        1,                 // is_active
        obj.uploaded?.toISOString() || now,
        "Spawned from Meme Capsule",
        0,
        0,
        Math.random()
      )
      .run();

    synced++;
    syncedFiles.push(obj.key);
  }

  return json({
    message: `Synced ${synced} new files from R2 to D1.`,
    totalR2Files: mediaObjects.length,
    alreadyInD1: mediaObjects.length - missing.length,
    newlySynced: synced,
    syncedFiles
  });
};
