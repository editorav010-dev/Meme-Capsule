import type { CurateMemeItem } from "../curateTypes";
import {
  CURATION_TOPICS,
  CURATION_TONES,
  CURATION_MECHANISMS
} from "../curateTypes";
import type { AiJudgeConfig, AiJudgeDecision } from "./aiJudgeTypes";
import {
  buildAiJudgeSystemPrompt,
  buildAiJudgeUserPrompt,
  buildUnifiedAiJudgePrompt
} from "./aiJudgePrompt";

const VALID_STATUSES = new Set(["keep", "excluded", "duplicate", "review_later"]);
const VALID_TOPICS = new Set(CURATION_TOPICS.map((t) => t.id));
const VALID_TONES = new Set(CURATION_TONES.map((t) => t.id));
const VALID_MECHS = new Set(CURATION_MECHANISMS.map((m) => m.id));

/**
 * Robust JSON extractor that finds and parses the outermost JSON object
 * from any model output, handling conversational wrappers, markdown fences,
 * and conversational preambles.
 */
export const extractJsonFromText = (text: string): any => {
  let cleaned = text.trim();

  // Strip standard markdown fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Search for outermost JSON object boundaries { ... }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
    throw new Error(`Model output did not contain valid JSON: "${cleaned.slice(0, 120)}..."`);
  }
};

/**
 * Execute a completion call either directly or via the Cloudflare CORS proxy.
 */
export const postCompletion = async (
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
      const errDetail =
        typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || `Proxy failed with HTTP ${res.status}`;
      throw new Error(errDetail);
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
        { role: "user", content: "Reply with the single word OK." }
      ],
      max_tokens: 150 // Reasoning models (Muse, Kimi) require adequate token budget for thinking tokens
    };

    const data = await postCompletion(config, payload);
    const choice = data?.choices?.[0];
    const content = (
      choice?.message?.content ||
      choice?.message?.reasoning_content ||
      choice?.text ||
      ""
    ).trim();

    if (content) {
      return { success: true, message: `Connected to ${config.model} successfully!` };
    }
    return { success: false, message: "Received empty response from model." };
  } catch (err: unknown) {
    let msg = err instanceof Error ? err.message : "Connection failed.";
    if (msg.includes("timed out") || msg.includes("aborted")) {
      msg = `Model request timed out (${config.model.split("/").pop()}). Large (90B) or reasoning models can take 30+ seconds to respond on free/shared tiers. Please retry, or use a faster vision model like 11B or Phi-3.`;
    }
    return {
      success: false,
      message: msg
    };
  }
};

/**
 * Universal Vision Model Analysis with Adaptive Fallback:
 * 1. Tries standard structured output mode.
 * 2. If rejected due to response_format or system message restrictions,
 *    automatically retries with adaptive fallback without response_format
 *    and with merged prompt.
 * 3. Uses outermost JSON extraction to reliably parse conversational model outputs.
 */
export const analyzeMemeWithAi = async (
  meme: CurateMemeItem,
  config: AiJudgeConfig
): Promise<AiJudgeDecision> => {
  const startTime = Date.now();

  const isReasoningModel =
    config.model.toLowerCase().includes("muse") ||
    config.model.toLowerCase().includes("glimmer") ||
    config.model.toLowerCase().includes("kimi") ||
    config.model.toLowerCase().includes("reasoning") ||
    config.model.toLowerCase().includes("think");

  const standardPayload: Record<string, unknown> = {
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
    max_tokens: 500
  };

  // Only enable response_format on non-reasoning models to avoid token rejection loops
  if (!isReasoningModel) {
    standardPayload["response_format"] = { type: "json_object" };
  }

  let data: any;
  try {
    // Attempt 1: Fast inference request
    data = await postCompletion(config, standardPayload);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message.toLowerCase() : "";

    // Check if error is related to response_format, unsupported parameters, or system roles
    const isFormatError =
      errMsg.includes("response_format") ||
      errMsg.includes("json_object") ||
      errMsg.includes("schema") ||
      errMsg.includes("unexpected") ||
      errMsg.includes("extra inputs") ||
      errMsg.includes("not supported");
    const isSystemError = errMsg.includes("system") || errMsg.includes("role");

    if (isFormatError || isSystemError) {
      // Attempt 2: Universal Adaptive Fallback (No response_format, merged prompt if needed)
      const fallbackPayload: Record<string, unknown> = {
        model: config.model,
        messages: isSystemError
          ? [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: buildUnifiedAiJudgePrompt(meme.title, meme.id)
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: meme.image_url
                    }
                  }
                ]
              }
            ]
          : [
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

      data = await postCompletion(config, fallbackPayload);
    } else {
      throw err;
    }
  }

  const latencyMs = Date.now() - startTime;
  const choice = data?.choices?.[0];
  const rawContent = (
    choice?.message?.content ||
    choice?.message?.reasoning_content ||
    choice?.text ||
    ""
  ).trim();

  if (!rawContent) {
    throw new Error("Model returned empty or invalid response content.");
  }

  // Parse JSON with robust outermost extractor
  let parsed: any;
  try {
    parsed = extractJsonFromText(rawContent);
  } catch (parseErr) {
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

  const confidence =
    typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.85;

  // Apply low-confidence fallback if score is below threshold
  if (confidence < config.confidenceThreshold) {
    corpusStatus = config.lowConfidenceFallback;
  }

  const curatorNote = parsed.curator_note
    ? String(parsed.curator_note).trim()
    : "Automated AI curation";

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
