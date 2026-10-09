/**
 * POST /api/cat/force-remove
 * 
 * Force remove a meme: immediately deactivate in D1, delete from R2, audit the action.
 * Idempotent: safe to call multiple times.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { requireAuth } from "../../_shared/catAuth";

interface ForceRemovePayload {
  meme_id?: string;
  reason?: string;
}

interface MemeRow {
  title: string | null;
  image_url: string | null;
  storage_path: string | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // 1. Authenticate: any active judge
    const user = await requireAuth(request, env);
    const body = (await request.json().catch(() => ({}))) as ForceRemovePayload;

    // 2. Validate meme_id
    const memeId = (body.meme_id || "").trim();
    if (!memeId) {
      return json({ error: "meme_id is required." }, { status: 400 });
    }

    // 3. Trim and validate reason
    let reason: string | null = null;
    if (body.reason) {
      reason = String(body.reason).trim().slice(0, 200);
      if (!reason) reason = null;
    }

    // 4. Check if meme already removed
    const alreadyRemoved = await env.DB.prepare(
      "SELECT r2_deleted FROM meme_force_removals WHERE meme_id = ?"
    ).bind(memeId).first<{ r2_deleted: number }>();

    if (alreadyRemoved?.r2_deleted === 1) {
      return json({
        success: true,
        meme_id: memeId,
        already_removed: true,
        r2_deleted: true
      });
    }

    // 5. Look up the meme
    const meme = await env.DB.prepare(
      "SELECT title, image_url, storage_path FROM memes WHERE id = ?"
    ).bind(memeId).first<MemeRow>();

    if (!meme) {
      return json({ error: "Meme not found" }, { status: 404 });
    }

    // 6. Resolve R2 key
    let r2Key: string | null = null;
    if (meme.storage_path) {
      // Ensure it starts with / for consistency
      r2Key = meme.storage_path.startsWith("/") ? meme.storage_path : `/${meme.storage_path}`;
    }

    // 7. If already in removal table with r2_deleted = 0, retry only R2 delete
    if (alreadyRemoved && alreadyRemoved.r2_deleted === 0) {
      // Meme is already deactivated in D1; just retry R2 delete
      if (r2Key) {
        try {
          await env.MEMES_BUCKET.delete(r2Key);
          await env.DB.prepare(
            "UPDATE meme_force_removals SET r2_deleted = 1, r2_deleted_at = ? WHERE meme_id = ?"
          ).bind(new Date().toISOString(), memeId).run();

          return json({
            success: true,
            meme_id: memeId,
            r2_deleted: true
          });
        } catch (r2Err) {
          const errorMsg = r2Err instanceof Error ? r2Err.message : "Unknown R2 error";
          await env.DB.prepare(
            "UPDATE meme_force_removals SET r2_error = ? WHERE meme_id = ?"
          ).bind(errorMsg, memeId).run();

          return json({
            success: true,
            meme_id: memeId,
            r2_deleted: false,
            warning: `R2 delete failed: ${errorMsg}`
          });
        }
      } else {
        // No R2 key, just mark as done
        await env.DB.prepare(
          "UPDATE meme_force_removals SET r2_deleted = 1, r2_error = ? WHERE meme_id = ?"
        ).bind("not_in_r2", memeId).run();

        return json({
          success: true,
          meme_id: memeId,
          r2_deleted: true
        });
      }
    }

    // 8. Deactivate meme in D1 and insert audit row (ONE batch)
    const now = new Date().toISOString();
    try {
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE memes SET is_active = 0, status = ? WHERE id = ?"
        ).bind("archived", memeId),
        env.DB.prepare(`
          INSERT INTO meme_force_removals 
          (meme_id, title, image_url, storage_path, r2_key, removed_by, removed_by_name, reason, removed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          memeId,
          meme.title || null,
          meme.image_url || null,
          meme.storage_path || null,
          r2Key || null,
          user.id,
          user.display_name,
          reason,
          now
        )
      ]);
    } catch (dbErr) {
      const errorMsg = dbErr instanceof Error ? dbErr.message : "Database error";
      return json(
        { success: false, error: `Database error: ${errorMsg}` },
        { status: 500 }
      );
    }

    // 9. Delete from R2 (if r2_key exists)
    if (r2Key) {
      try {
        await env.MEMES_BUCKET.delete(r2Key);
        // Mark R2 delete as successful
        await env.DB.prepare(
          "UPDATE meme_force_removals SET r2_deleted = 1, r2_deleted_at = ? WHERE meme_id = ?"
        ).bind(now, memeId).run();

        return json({
          success: true,
          meme_id: memeId,
          r2_deleted: true
        });
      } catch (r2Err) {
        // R2 delete failed, but D1 was already deactivated
        // This is not a hard failure — meme is hidden from app
        const errorMsg = r2Err instanceof Error ? r2Err.message : "Unknown R2 error";
        await env.DB.prepare(
          "UPDATE meme_force_removals SET r2_error = ? WHERE meme_id = ?"
        ).bind(errorMsg, memeId).run();

        return json({
          success: true,
          meme_id: memeId,
          r2_deleted: false,
          warning: `Meme deactivated but R2 delete failed: ${errorMsg}`
        });
      }
    } else {
      // No R2 key (likely Reddit source) — still success, mark r2_deleted = 1
      await env.DB.prepare(
        "UPDATE meme_force_removals SET r2_deleted = 1, r2_error = ? WHERE meme_id = ?"
      ).bind("not_in_r2", memeId).run();

      return json({
        success: true,
        meme_id: memeId,
        r2_deleted: true
      });
    }
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error force-removing meme";
    return json({ error: msg }, { status: 500 });
  }
};
