import type { PagesFunction } from "../../_shared/pages";
import { json, requireAdmin, type Env } from "../../_shared/d1r2";

const BATCH_SIZE = 50;

/**
 * POST /api/admin/sync-r2
 * Scans the R2 bucket and creates D1 records for any files
 * that don't already have a matching storage_path in the database.
 * 
 * Optimized with D1 batch transactions for ultra-fast, non-blocking execution.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const adminError = requireAdmin(request, env);
  if (adminError) return adminError;

  const startTime = Date.now();

  try {
    const bucket = env.MEMES_BUCKET;
    const db = env.DB;
    const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    // 1. List all objects in R2 (fast pagination)
    const allObjects: { key: string; uploaded?: string }[] = [];
    let cursor: string | undefined;
    let listAttempts = 0;

    do {
      const options: Record<string, unknown> = { limit: 1000 };
      if (cursor) options.cursor = cursor;

      const listed = await bucket.list(options);
      for (const obj of listed.objects) {
        allObjects.push({
          key: obj.key,
          uploaded: obj.uploaded ? new Date(obj.uploaded as unknown as string).toISOString() : undefined
        });
      }
      cursor = listed.truncated ? listed.cursor : undefined;
      listAttempts++;
      if (listAttempts > 20) break; // safety limit: 20,000 files max
    } while (cursor);

    // 2. Filter only image/video files by extension
    const mediaExtensions = new Set([
      ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".bmp",
      ".mp4", ".webm", ".mov", ".avi", ".mkv"
    ]);

    const mediaObjects = allObjects.filter((obj) => {
      const dotIndex = obj.key.lastIndexOf(".");
      if (dotIndex === -1) return false;
      const ext = obj.key.slice(dotIndex).toLowerCase();
      return mediaExtensions.has(ext);
    });

    // 3. Single fast query to get all existing storage_paths & image_urls from D1
    const { results: existingRows } = await db
      .prepare("SELECT storage_path, image_url FROM memes WHERE storage_path IS NOT NULL OR image_url IS NOT NULL")
      .all<{ storage_path: string | null; image_url: string | null }>();

    const existingPaths = new Set<string>();
    const existingUrlSet = new Set<string>();

    for (const r of existingRows || []) {
      if (r.storage_path) existingPaths.add(r.storage_path);
      if (r.image_url) existingUrlSet.add(r.image_url);
    }

    // 4. Find files in R2 that are NOT in D1
    const missing = mediaObjects.filter((obj) => {
      const fullUrl = publicBase ? `${publicBase}/${obj.key}` : obj.key;
      return !existingPaths.has(obj.key) && !existingUrlSet.has(fullUrl);
    });

    if (missing.length === 0) {
      const duration = Date.now() - startTime;
      return json({
        message: "All R2 files are already synchronized with D1.",
        totalR2Files: mediaObjects.length,
        alreadyInD1: mediaObjects.length,
        newlySynced: 0,
        syncedFiles: [],
        duration_ms: duration
      });
    }

    // 5. Build statements and insert missing files in D1 in fast parallel batches
    const now = new Date().toISOString();
    const syncedFiles: string[] = [];
    const statements = [];

    for (const obj of missing) {
      const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
      const isVideo = [".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext);
      const mediaType = isVideo ? "video" : "image";

      // Derive a clean, human-readable title from the filename
      const filename = obj.key.split("/").pop() || obj.key;
      const cleanName = filename
        .replace(/^[a-f0-9-]{36,}-?/i, "")
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim() || filename.replace(/\.[^.]+$/, "");

      const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      const fullUrl = publicBase ? `${publicBase}/${obj.key}` : "";
      const id = crypto.randomUUID();

      statements.push(
        db.prepare(
          `INSERT INTO memes (id, title, image_url, storage_path, source_link, category, tags, rarity, status, media_type, input_method, is_active, uploaded_at, share_text, shown_count, share_count, random_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          title,
          fullUrl,
          obj.key,
          filename,
          "Synced",
          "[]",
          "Common",
          "active",
          mediaType,
          "upload",
          1,
          obj.uploaded || now,
          "Spawned from Meme Capsule",
          0,
          0,
          Math.random()
        )
      );

      syncedFiles.push(obj.key);
    }

    // Execute in fast chunks of 50
    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      const chunk = statements.slice(i, i + BATCH_SIZE);
      await db.batch(chunk);
    }

    const duration = Date.now() - startTime;

    return json({
      message: `Synced ${syncedFiles.length} new files from R2 to D1 in ${duration}ms.`,
      totalR2Files: mediaObjects.length,
      alreadyInD1: mediaObjects.length - missing.length,
      newlySynced: syncedFiles.length,
      syncedFiles,
      duration_ms: duration
    });
  } catch (error) {
    return json(
      {
        error: "R2 sync failed",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
};
