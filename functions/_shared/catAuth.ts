import type { CatUser, Env } from "./d1r2";

export interface AuthResult {
  user: CatUser;
  token: string;
}

/**
 * Hash a password using SHA-256 (Cloudflare Workers compatible)
 * WebCrypto subtle digest for secure hex string representation.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

export function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateSession(
  request: Request,
  env: Env
): Promise<CatUser | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const now = new Date().toISOString();

  const result = await env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.role, u.is_active
    FROM cat_sessions s
    JOIN cat_users u ON s.user_id = u.id
    WHERE s.token = ?
      AND s.expires_at > ?
      AND u.is_active = 1
  `).bind(token, now).first<CatUser>();

  return result ?? null;
}

export async function requireAuth(
  request: Request,
  env: Env,
  requiredRole?: "judge" | "superadmin"
): Promise<CatUser> {
  const user = await validateSession(request, env);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (requiredRole === "superadmin" && user.role !== "superadmin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  return user;
}
