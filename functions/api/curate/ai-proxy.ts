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
    if (!sessionUser) {
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
    const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout for vision reasoning

    const downstreamRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload.body || {}),
      signal: controller.signal
    }).catch((err) => {
      clearTimeout(timeout);
      throw new Error(`Failed to connect to model endpoint: ${err.message}`);
    });

    clearTimeout(timeout);

    const data = await downstreamRes.json().catch(() => ({
      error: `Downstream API returned non-JSON response with status ${downstreamRes.status}`
    }));

    return json(data, { status: downstreamRes.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy request failed";
    return json({ error: message }, { status: 500 });
  }
};
