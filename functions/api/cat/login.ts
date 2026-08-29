/**
 * POST /api/cat/login
 * 
 * Authenticates judge / superadmin and issues an 8-hour session token.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { generateToken, verifyPassword } from "../../_shared/catAuth";

interface LoginPayload {
  username?: string;
  password?: string;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: "judge" | "superadmin";
  is_active: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as LoginPayload;
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!username || !password) {
      return json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = await env.DB.prepare(
      "SELECT id, username, display_name, password_hash, role, is_active FROM cat_users WHERE username = ? AND is_active = 1"
    ).bind(username).first<UserRow>();

    if (!user) {
      return json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 8-hour session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO cat_sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
      ).bind(token, user.id, expiresAt),
      env.DB.prepare(
        "UPDATE cat_users SET last_login_at = ? WHERE id = ?"
      ).bind(now, user.id)
    ]);

    return json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role
      },
      expires_at: expiresAt
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error";
    return json({ error: msg }, { status: 500 });
  }
};
