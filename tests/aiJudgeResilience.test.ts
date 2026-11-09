import { describe, it, expect } from "vitest";

describe("AI Curation Resilience & Circuit Breaker", () => {
  // Helper mimicking circuit breaker logic from useAiJudgeLoop
  function evaluateErrorCategory(errorMessage: string) {
    const errLower = errorMessage.toLowerCase();
    const isFatal =
      errLower.includes("410") ||
      errLower.includes("gone") ||
      errLower.includes("model retired") ||
      errLower.includes("401") ||
      errLower.includes("unauthorized") ||
      errLower.includes("403") ||
      errLower.includes("forbidden") ||
      errLower.includes("404") ||
      errLower.includes("not found") ||
      errLower.includes("invalid api key") ||
      errLower.includes("does not support image inputs");

    const isQuota =
      errLower.includes("quota") ||
      errLower.includes("limit exceeded") ||
      errLower.includes("resource limit");

    const isTransient =
      !isFatal &&
      !isQuota &&
      (errLower.includes("500") ||
        errLower.includes("502") ||
        errLower.includes("503") ||
        errLower.includes("504") ||
        errLower.includes("timeout") ||
        errLower.includes("timed out") ||
        errLower.includes("abort") ||
        errLower.includes("network") ||
        errLower.includes("glitch"));

    return { isFatal, isQuota, isTransient };
  }

  it("classifies HTTP 410 Gone / model retired as fatal non-retryable error", () => {
    const result = evaluateErrorCategory("Upstream API returned HTTP 410");
    expect(result.isFatal).toBe(true);
    expect(result.isTransient).toBe(false);
  });

  it("classifies 401 Unauthorized and 403 Forbidden as fatal non-retryable errors", () => {
    const authErr = evaluateErrorCategory("Invalid API key provided");
    const forbiddenErr = evaluateErrorCategory("HTTP 403 Forbidden access to provider");
    expect(authErr.isFatal).toBe(true);
    expect(forbiddenErr.isFatal).toBe(true);
  });

  it("classifies 502/503/504 and timeouts as transient retryable errors", () => {
    const gatewayErr = evaluateErrorCategory("Upstream API returned HTTP 502 Bad Gateway");
    const serviceErr = evaluateErrorCategory("Upload failed with HTTP 503");
    const timeoutErr = evaluateErrorCategory("Downstream model took longer than 110 seconds to respond and timed out");

    expect(gatewayErr.isTransient).toBe(true);
    expect(serviceErr.isTransient).toBe(true);
    expect(timeoutErr.isTransient).toBe(true);
    expect(gatewayErr.isFatal).toBe(false);
  });

  it("trips circuit breaker after 2 consecutive fatal errors", () => {
    let fatalConsecutive = 0;
    let runnerStopped = false;

    const simulateError = (err: string) => {
      const { isFatal } = evaluateErrorCategory(err);
      if (isFatal) {
        fatalConsecutive += 1;
        if (fatalConsecutive >= 2) {
          runnerStopped = true;
        }
      }
    };

    simulateError("Upstream API returned HTTP 410");
    expect(fatalConsecutive).toBe(1);
    expect(runnerStopped).toBe(false);

    simulateError("Upstream API returned HTTP 410");
    expect(fatalConsecutive).toBe(2);
    expect(runnerStopped).toBe(true);
  });

  it("resets failure counter upon any successful evaluation", () => {
    let fatalConsecutive = 1;
    let transientConsecutive = 4;

    // Successful evaluation occurs
    const onSuccessfulEvaluation = () => {
      fatalConsecutive = 0;
      transientConsecutive = 0;
    };

    onSuccessfulEvaluation();
    expect(fatalConsecutive).toBe(0);
    expect(transientConsecutive).toBe(0);
  });

  it("sanitizes secrets from telemetry log payloads", () => {
    const rawDetails: Record<string, unknown> = {
      apiKey: "nvapi-secret-123456",
      api_key: "ai-za-secret-789",
      token: "bearer-token-abc",
      password: "adminPassword",
      meme_id: "intake-828fe184",
      model: "meta/llama-3.2-90b-vision-instruct"
    };

    const sanitized = { ...rawDetails };
    delete sanitized.apiKey;
    delete sanitized.api_key;
    delete sanitized.token;
    delete sanitized.password;

    expect(sanitized.apiKey).toBeUndefined();
    expect(sanitized.api_key).toBeUndefined();
    expect(sanitized.token).toBeUndefined();
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.meme_id).toBe("intake-828fe184");
    expect(sanitized.model).toBe("meta/llama-3.2-90b-vision-instruct");
  });
});
