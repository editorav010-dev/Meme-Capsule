/**
 * POST /api/events — Batch Event Ingestion
 *
 * Accepts batched interaction events from the Android app (or web frontend).
 * Events are inserted into meme_events via D1 batch API.
 *
 * Validation:
 *   - device_id: 64 hex chars (SHA-256)
 *   - session_id: UUID v4
 *   - events[]: max 200, valid enum types, timestamps within 24h
 *   - Rate limit: 10 requests/device/minute via KV counter
 *
 * Deduplication: INSERT OR IGNORE with unique constraint on
 * (device_id, meme_id, event_type, session_id, sequence)
 */

import type { PagesFunction } from "../_shared/pages";
import { json, type Env } from "../_shared/d1r2";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

const VALID_EVENT_TYPES = new Set([
  "view", "like", "unlike", "share", "download", "skip", "long_view", "re_fetch"
] as const);

type EventType = "view" | "like" | "unlike" | "share" | "download" | "skip" | "long_view" | "re_fetch";

interface MemeEvent {
  meme_id: string;
  event_type: EventType;
  time_on_meme_ms: number;
  timestamp: number;
  sequence: number;
}

interface EventBatchRequest {
  device_id: string;
  session_id: string;
  app_version: string;
  events: MemeEvent[];
}

// ────────────────────────────────────────────────────────────
// Validation helpers
// ────────────────────────────────────────────────────────────

const HEX_64_RE = /^[0-9a-f]{64}$/i;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BATCH_SIZE = 200;
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

const validateBatch = (body: EventBatchRequest, nowMs: number): string | null => {
  if (!body.device_id || !HEX_64_RE.test(body.device_id)) {
    return "device_id must be a 64-character hex string (SHA-256).";
  }

  if (!body.session_id || !UUID_V4_RE.test(body.session_id)) {
    return "session_id must be a valid UUID v4.";
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return "events array is required and must not be empty.";
  }

  if (body.events.length > MAX_BATCH_SIZE) {
    return `events array exceeds maximum batch size of ${MAX_BATCH_SIZE}.`;
  }

  for (let i = 0; i < body.events.length; i++) {
    const evt = body.events[i];

    if (!evt.meme_id || typeof evt.meme_id !== "string") {
      return `events[${i}].meme_id is missing or invalid.`;
    }

    if (!VALID_EVENT_TYPES.has(evt.event_type as EventType)) {
      return `events[${i}].event_type "${evt.event_type}" is not a valid event type.`;
    }

    if (typeof evt.timestamp !== "number") {
      return `events[${i}].timestamp is missing.`;
    }

    const drift = Math.abs(evt.timestamp - nowMs);
    if (drift > MAX_CLOCK_SKEW_MS) {
      return `events[${i}].timestamp is more than 24 hours from server time (clock skew).`;
    }
  }

  return null;
};

// ────────────────────────────────────────────────────────────
// Rate limiting via KV
// ────────────────────────────────────────────────────────────

const checkRateLimit = async (kv: KVNamespace | undefined, deviceId: string): Promise<boolean> => {
  if (!kv) return true; // No KV = no rate limiting (local dev)

  const key = `ratelimit:events:${deviceId}`;
  const currentStr = await kv.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  await kv.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS
  });

  return true;
};

// ────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as EventBatchRequest;
    const nowMs = Date.now();

    // Validate the batch
    const validationError = validateBatch(body, nowMs);
    if (validationError) {
      return json({ error: validationError }, { status: 400 });
    }

    // Rate limiting
    const allowed = await checkRateLimit(env.ANALYTICS_KV, body.device_id);
    if (!allowed) {
      return json(
        { error: "Rate limit exceeded. Max 10 batch requests per minute per device." },
        { status: 429 }
      );
    }

    // Build batch insert statements using INSERT OR IGNORE for deduplication.
    // We do NOT validate meme_id existence at ingest time (per spec: prioritize
    // write speed, drop unknown IDs during aggregation).
    const statements = body.events.map((evt) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO meme_events
         (meme_id, event_type, session_id, device_id, time_on_meme_ms, timestamp, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        evt.meme_id,
        evt.event_type,
        body.session_id,
        body.device_id,
        evt.time_on_meme_ms || 0,
        evt.timestamp,
        evt.sequence || 0
      )
    );

    // Execute all inserts in a single D1 batch transaction
    const results = await env.DB.batch(statements);

    // Count successful inserts vs ignored (deduped)
    let inserted = 0;
    for (const result of results) {
      if (result.meta?.changes && result.meta.changes > 0) {
        inserted++;
      }
    }

    const rejected = body.events.length - inserted;

    return json({
      received: body.events.length,
      inserted,
      rejected
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Event ingestion error:", message);
    return json({ error: message }, { status: 500 });
  }
};
