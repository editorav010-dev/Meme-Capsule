/**
 * GET/POST /api/cat/admin/users
 * 
 * User management endpoints for superadmin.
 */

import type { PagesFunction } from "../../../_shared/pages";
import { json, type Env } from "../../../_shared/d1r2";
import { hashPassword, requireAuth } from "../../../_shared/catAuth";

interface CreateUserPayload {
  username?: string;
  display_name?: string;
  password?: string;
  role?: "judge" | "superadmin";
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env, "superadmin");

    const totalMemesRes = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM memes WHERE is_active = 1"
    ).first<{ cnt: number }>();
    const totalMemes = totalMemesRes?.cnt ?? 0;

    const { results } = await env.DB.prepare(`
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.role,
        u.is_active,
        u.created_at,
        u.last_login_at,
        COALESCE(SUM(CASE WHEN d.skipped = 0 THEN 1 ELSE 0 END), 0) as categorised,
        COALESCE(SUM(CASE WHEN d.skipped = 1 THEN 1 ELSE 0 END), 0) as skipped
      FROM cat_users u
      LEFT JOIN cat_decisions d ON u.id = d.user_id
      GROUP BY u.id, u.username, u.display_name, u.role, u.is_active, u.created_at, u.last_login_at
      ORDER BY u.created_at ASC
    `).all<{
      id: string;
      username: string;
      display_name: string;
      role: "judge" | "superadmin";
      is_active: number;
      created_at: string;
      last_login_at: string | null;
      categorised: number;
      skipped: number;
    }>();

    const users = (results || []).map((u) => {
      const decided = u.categorised + u.skipped;
      const pct = totalMemes > 0 ? Math.min(100, Math.round((decided / totalMemes) * 100)) : 0;
      return {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        role: u.role,
        is_active: Boolean(u.is_active),
        created_at: u.created_at,
        last_login_at: u.last_login_at,
        categorised: u.categorised,
        skipped: u.skipped,
        percent_complete: pct
      };
    });

    return json({ users });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error fetching users";
    return json({ error: msg }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env, "superadmin");
    const body = (await request.json().catch(() => ({}))) as CreateUserPayload;

    const username = (body.username || "").trim().toLowerCase();
    const displayName = (body.display_name || "").trim();
    const password = body.password || "";
    const role = body.role === "superadmin" ? "superadmin" : "judge";

    if (!username || !displayName || !password) {
      return json({ error: "username, display_name, and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    // Check existing username
    const existing = await env.DB.prepare(
      "SELECT id FROM cat_users WHERE username = ?"
    ).bind(username).first<{ id: string }>();

    if (existing) {
      return json({ error: "Username already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userId = `user-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO cat_users (id, username, display_name, password_hash, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).bind(userId, username, displayName, passwordHash, role, now).run();

    return json({
      success: true,
      user: {
        id: userId,
        username,
        display_name: displayName,
        role,
        is_active: true,
        created_at: now
      }
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Error creating user";
    return json({ error: msg }, { status: 500 });
  }
};
