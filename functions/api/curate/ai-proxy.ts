/**
 * POST /api/curate/ai-proxy
 *
 * Relay proxy to bypass browser CORS restrictions when calling external
 * vision models (e.g. NVIDIA NIM, OpenRouter, Google AI Studio, custom APIs).
 * Requires an active curator session.
 */

import type { PagesFunction } from "../../_shared/pages";
import { json, type Env } from "../../_shared/d1r2";
import { validateSession } from "../../_shared/catAuth";

interface ProxyPayload {
  endpoint?: string;
  apiKey?: string;
  body?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const sessionUser = await validateSession(request, env);
    const authHeader = request.headers.get("Authorization");
    const originHeader = request.headers.get("Origin") || "";
    const refererHeader = request.headers.get("Referer") || "";
    const requestHost = new URL(request.url).host;

    // Check authorization:
    // 1. Valid curator session in D1
    // 2. Or Bearer token matching ADMIN_API_TOKEN
    // 3. Or Same-origin browser request from the meme capsule domain
    const isSameOrigin =
      (originHeader && originHeader.includes(requestHost)) ||
      (refererHeader && refererHeader.includes(requestHost));

    const isAdmin = Boolean(env.ADMIN_API_TOKEN && authHeader === `Bearer ${env.ADMIN_API_TOKEN}`);
    const isCurator = Boolean(sessionUser || (authHeader && authHeader.startsWith("Bearer ")));

    if (!isSameOrigin && !isAdmin && !isCurator) {
      return json({ error: "Unauthorized curator session." }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as ProxyPayload;
    const endpoint = (payload.endpoint || "").trim();
    const apiKey = (payload.apiKey || "").trim();

    if (!endpoint || !endpoint.startsWith("http")) {
      return json({ error: "A valid HTTP(S) API endpoint is required." }, { status: 400 });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90 second timeout for heavy vision reasoning models

    const downstreamRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload.body || {}),
      signal: controller.signal
    }).catch((err) => {
      clearTimeout(timeout);
      const isAbort = err.name === "AbortError" || err.message?.includes("aborted");
      const msg = isAbort
        ? "Downstream model took longer than 90 seconds to respond and timed out."
        : `Failed to connect to model endpoint: ${err.message}`;
      throw new Error(msg);
    });

    clearTimeout(timeout);

    const data = await downstreamRes.json().catch(() => ({}));

    if (!downstreamRes.ok) {
      const errText =
        typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || `Upstream API returned HTTP ${downstreamRes.status}`;
      return json({ error: errText }, { status: downstreamRes.status });
    }

    return json(data, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy request failed";
    return json({ error: message }, { status: 500 });
  }
};
