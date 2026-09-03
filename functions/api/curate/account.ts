/**
 * GET /api/curate/account
 * PUT /api/curate/account
 *
 * Dedicated account management endpoint for individual judges.
 * Allows judges to update their username, display name, and password
 * with strict server-side session isolation.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { requireAuth, verifyPassword, hashPassword } from "../../_shared/catAuth";
import { ensureCurationTables } from "../../_shared/curateDb";

interface UpdateAccountPayload {
  username?: string;
  display_name?: string;
  current_password?: string;
  new_password?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await requireAuth(request, env);

    const user = await env.DB.prepare(`
      SELECT id, username, display_name, role, created_at, last_login_at
      FROM cat_users
      WHERE id = ?
    `).bind(sessionUser.id).first();

    if (!user) {
      return json({ error: "Judge account not found." }, { status: 404 });
    }

    return json({ success: true, user });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error retrieving account";
    return json({ error: msg }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await ensureCurationTables(env.DB);
    const sessionUser = await requireAuth(request, env);

    const body = (await request.json().catch(() => ({}))) as UpdateAccountPayload;
    const username = (body.username || "").trim();
    const displayName = (body.display_name || "").trim();
    const currentPassword = body.current_password || "";
    const newPassword = body.new_password || "";

    // Fetch current user record including password hash
    const currentUser = await env.DB.prepare(`
      SELECT id, username, display_name, password_hash, role
      FROM cat_users
      WHERE id = ?
    `).bind(sessionUser.id).first<{
      id: string;
      username: string;
      display_name: string;
      password_hash: string;
      role: string;
    }>();

    if (!currentUser) {
      return json({ error: "Judge account not found." }, { status: 404 });
    }

    let finalUsername = currentUser.username;
    let finalDisplayName = currentUser.display_name;
    let finalPasswordHash = currentUser.password_hash;

    // 1. Update Display Name if provided
    if (displayName) {
      if (displayName.length < 2 || displayName.length > 50) {
        return json({ error: "Display name must be between 2 and 50 characters." }, { status: 400 });
      }
      finalDisplayName = displayName;
    }

    // 2. Update Username if changed
    if (username && username.toLowerCase() !== currentUser.username.toLowerCase()) {
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
        return json({
          error: "Username must be 3-30 characters and contain only letters, numbers, hyphens, or underscores."
        }, { status: 400 });
      }

      // Ensure uniqueness
      const existing = await env.DB.prepare(`
        SELECT id FROM cat_users WHERE LOWER(username) = LOWER(?) AND id != ?
      `).bind(username, sessionUser.id).first();

      if (existing) {
        return json({ error: `The username "${username}" is already taken.` }, { status: 400 });
      }

      finalUsername = username;
    }

    // 3. Update Password if requested
    if (newPassword) {
      if (!currentPassword) {
        return json({ error: "Current password is required to set a new password." }, { status: 400 });
      }

      const isCurrentValid = await verifyPassword(currentPassword, currentUser.password_hash);
      if (!isCurrentValid) {
        return json({ error: "Current password is incorrect." }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return json({ error: "New password must be at least 6 characters long." }, { status: 400 });
      }

      finalPasswordHash = await hashPassword(newPassword);
    }

    // 4. Update the user in the database
    await env.DB.prepare(`
      UPDATE cat_users
      SET username = ?, display_name = ?, password_hash = ?
      WHERE id = ?
    `).bind(finalUsername, finalDisplayName, finalPasswordHash, sessionUser.id).run();

    return json({
      success: true,
      user: {
        id: sessionUser.id,
        username: finalUsername,
        display_name: finalDisplayName,
        role: currentUser.role
      },
      message: "Account updated successfully."
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error updating account";
    return json({ error: msg }, { status: 500 });
  }
};
