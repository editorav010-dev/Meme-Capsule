import type { CurateMemeItem } from "../curateTypes";
import {
  CURATION_TOPICS,
  CURATION_TONES,
  CURATION_MECHANISMS
} from "../curateTypes";
import type { AiJudgeConfig, AiJudgeDecision } from "./aiJudgeTypes";
import { buildAiJudgeSystemPrompt, buildAiJudgeUserPrompt } from "./aiJudgePrompt";

const VALID_STATUSES = new Set(["keep", "excluded", "duplicate", "review_later"]);
const VALID_TOPICS = new Set(CURATION_TOPICS.map((t) => t.id));
const VALID_TONES = new Set(CURATION_TONES.map((t) => t.id));
const VALID_MECHS = new Set(CURATION_MECHANISMS.map((m) => m.id));

const stripJsonMarkdown = (raw: string): string => {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
};

/**
 * Execute a completion call either directly or via the Cloudflare CORS proxy.
 */
const postCompletion = async (
  config: AiJudgeConfig,
  body: Record<string, unknown>
): Promise<any> => {
  const normalizedBase = config.baseUrl.replace(/\/+$/, "");
  const endpoint = `${normalizedBase}/chat/completions`;

  if (config.useProxy) {
    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("curator_token") : null;
    const proxyHeaders: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (token) {
      proxyHeaders["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/curate/ai-proxy", {
      method: "POST",
      headers: proxyHeaders,
      body: JSON.stringify({
        endpoint,
        apiKey: config.apiKey,
        body
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Proxy failed with HTTP ${res.status}`);
    }
    return data;
  }

  // Direct browser-to-API call
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || data.error || `API returned HTTP ${res.status}`);
  }
  return data;
};

/**
 * Test API connection and credentials with a small fast text prompt.
 */
export const testAiConnection = async (config: AiJudgeConfig): Promise<{ success: boolean; message: string }> => {
  if (!config.baseUrl.trim()) {
    return { success: false, message: "Base URL is required." };
  }

  try {
    const payload = {
      model: config.model,
      messages: [
        { role: "user", content: "Respond with the single word 'OK'." }
      ],
      max_tokens: 10
    };

    const data = await postCompletion(config, payload);
    const content = data?.choices?.[0]?.message?.content || "";
    if (content) {
      return { success: true, message: `Connected to ${config.model} successfully!` };
    }
    return { success: false, message: "Received empty response from model." };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Connection failed."
    };
  }
};

/**
 * Analyze a meme using the configured vision model and return a sanitized decision.
 */
export const analyzeMemeWithAi = async (
  meme: CurateMemeItem,
  config: AiJudgeConfig
): Promise<AiJudgeDecision> => {
  const startTime = Date.now();

  const payload: Record<string, unknown> = {
    model: config.model,
    messages: [
      {
        role: "system",
        content: buildAiJudgeSystemPrompt()
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildAiJudgeUserPrompt(meme.title, meme.id)
          },
          {
            type: "image_url",
            image_url: {
              url: meme.image_url
            }
          }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 800
  };

  // Enable JSON object response mode where supported
  payload["response_format"] = { type: "json_object" };

  const data = await postCompletion(config, payload);
  const latencyMs = Date.now() - startTime;

  const rawContent = data?.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("Model returned empty or invalid content.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(stripJsonMarkdown(rawContent));
  } catch {
    throw new Error(`Failed to parse AI output as JSON: ${rawContent.slice(0, 100)}...`);
  }

  // Sanitize and normalize classification fields
  let corpusStatus = String(parsed.corpus_status || "keep").toLowerCase();
  if (!VALID_STATUSES.has(corpusStatus)) {
    corpusStatus = "keep";
  }

  // Filter topics (must be within CURATION_TOPICS, max 3)
  const rawTopics = Array.isArray(parsed.topics) ? parsed.topics : [];
  const validTopics = rawTopics
    .map((t: unknown) => String(t).trim())
    .filter((t: string) => VALID_TOPICS.has(t as any))
    .slice(0, 3);

  // Filter tone (must be in CURATION_TONES, exactly 1)
  let tone: string | null = parsed.tone ? String(parsed.tone).trim() : null;
  if (tone && !VALID_TONES.has(tone as any)) {
    tone = "Neutral";
  }

  // Filter mechanisms (must be in CURATION_MECHANISMS, max 2)
  const rawMechs = Array.isArray(parsed.humour_mechanisms) ? parsed.humour_mechanisms : [];
  const validMechs = rawMechs
    .map((m: unknown) => String(m).trim())
    .filter((m: string) => VALID_MECHS.has(m as any))
    .slice(0, 2);

  const confidence = typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.85;

  // Apply low-confidence fallback if score is below threshold
  if (confidence < config.confidenceThreshold) {
    corpusStatus = config.lowConfidenceFallback;
  }

  const curatorNote = parsed.curator_note ? String(parsed.curator_note).trim() : "Automated AI curation";

  return {
    corpus_status: corpusStatus as any,
    duplicate_of: parsed.duplicate_of || null,
    topics: validTopics.length > 0 ? validTopics : ["Everyday Life"],
    tone: tone || "Neutral",
    humour_mechanisms: validMechs.length > 0 ? validMechs : ["Relatability"],
    curator_note: curatorNote,
    confidence,
    modelUsed: config.model,
    latencyMs
  };
};
