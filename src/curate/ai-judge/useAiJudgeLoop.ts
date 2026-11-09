import { useState, useRef, useEffect, useCallback } from "react";
import type { CurateMemeItem } from "../curateTypes";
import type { AiJudgeConfig, AiJudgeDecision, AiJudgeLoopState } from "./aiJudgeTypes";
import { analyzeMemeWithAi } from "./aiJudgeClient";

interface UseAiJudgeLoopProps {
  currentMeme: CurateMemeItem | null;
  config: AiJudgeConfig;
  onApplyDecision: (decision: AiJudgeDecision) => void;
  onAdvance: (decision?: AiJudgeDecision) => Promise<CurateMemeItem | null>;
}

export function useAiJudgeLoop({
  currentMeme,
  config,
  onApplyDecision,
  onAdvance
}: UseAiJudgeLoopProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [loopState, setLoopState] = useState<AiJudgeLoopState>("idle");
  const [statusMessage, setStatusMessage] = useState("AI Mode is ready");
  const [previewProgress, setPreviewProgress] = useState(0); // 0 to 100
  const [lastDecision, setLastDecision] = useState<AiJudgeDecision | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [batchProcessed, setBatchProcessed] = useState(0);
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // References to prevent stale closures and concurrency bugs
  const isRunningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const currentMemeRef = useRef(currentMeme);
  const configRef = useRef(config);
  const timerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const inFlightMemeIdRef = useRef<string | null>(null);
  const processedCountRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);
  const fatalConsecutiveFailuresRef = useRef(0);
  const transientConsecutiveFailuresRef = useRef(0);

  useEffect(() => {
    currentMemeRef.current = currentMeme;
  }, [currentMeme]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const stop = useCallback((msg?: unknown) => {
    clearTimers();
    isRunningRef.current = false;
    isProcessingRef.current = false;
    inFlightMemeIdRef.current = null;
    setIsRunning(false);
    setLoopState("stopped");
    setPreviewProgress(0);

    const safeMsg = typeof msg === "string" ? msg : "AI Mode stopped by user";
    setStatusMessage(safeMsg);
  }, [clearTimers]);

  // Main robust processing pipeline for a single meme with automatic error recovery
  const processMeme = useCallback(async (meme: CurateMemeItem) => {
    if (!isRunningRef.current) return;
    if (isProcessingRef.current && inFlightMemeIdRef.current === meme.id) return;

    // Check batch count limit if configured
    if (
      configRef.current.batchMode === "count" &&
      processedCountRef.current >= configRef.current.batchCount
    ) {
      stop(`Batch limit reached (${configRef.current.batchCount} memes evaluated)`);
      return;
    }

    isProcessingRef.current = true;
    inFlightMemeIdRef.current = meme.id;
    setLoopState("analyzing");
    setStatusMessage(`Analyzing meme: ${meme.id}...`);
    setErrorMessage(null);
    setPreviewProgress(0);

    const MAX_RETRIES = 2;
    let attempt = 0;
    let decision: AiJudgeDecision | null = null;
    let lastError: unknown = null;
    let isFatal = false;

    // Fast retry loop with jitter for transient recoverable errors only
    while (attempt < MAX_RETRIES && isRunningRef.current) {
      attempt += 1;
      try {
        decision = await analyzeMemeWithAi(meme, configRef.current);
        // Successful analysis! Reset consecutive failure circuit breakers
        fatalConsecutiveFailuresRef.current = 0;
        transientConsecutiveFailuresRef.current = 0;
        consecutiveFailuresRef.current = 0;
        if (attempt > 1) {
          setRecoveredCount((prev) => prev + 1);
        }
        break;
      } catch (err: unknown) {
        lastError = err;
        const errText = err instanceof Error ? err.message : String(err);
        const errLower = errText.toLowerCase();

        // 1. Check for fatal configuration / authentication / model retirement errors
        isFatal =
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

        // Fatal errors must fail fast with ZERO retries
        if (isFatal) {
          break;
        }

        const isQuotaError =
          errLower.includes("quota") ||
          errLower.includes("limit exceeded") ||
          errLower.includes("resource limit");

        if (isQuotaError) {
          isProcessingRef.current = false;
          setErrorMessage("Database daily read limit reached. AI loop paused safely.");
          stop("Paused: Cloudflare D1 daily quota limit reached. Paused safely to prevent data loss.");
          return;
        }

        // 2. Transient recoverable failures: 429, 500, 502, 503, 504, timeout, network glitch
        if (attempt < MAX_RETRIES && isRunningRef.current) {
          setLoopState("retrying");
          const backoffMs = Math.min(3500, 1500 * attempt + Math.random() * 300);
          setStatusMessage(
            `🔄 Temporary glitch on ${meme.id} (${errText.slice(0, 45)}). Retrying ${attempt}/${MAX_RETRIES} in ${(backoffMs / 1000).toFixed(1)}s...`
          );

          await new Promise<void>((resolve) => {
            timerRef.current = window.setTimeout(resolve, backoffMs);
          });
          clearTimers();
        }
      }
    }

    if (!isRunningRef.current) {
      isProcessingRef.current = false;
      return;
    }

    // Handle failure without fabricating false curation decisions
    if (!decision) {
      const finalErrText = lastError instanceof Error ? lastError.message : "AI Analysis failed";
      setErrorMessage(`Meme ${meme.id}: ${finalErrText}`);
      setSkippedCount((prev) => prev + 1);

      // Async non-blocking log event
      try {
        void fetch("/api/admin/system-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow: "ai_curation",
            severity: isFatal ? "fatal" : "error",
            actor: configRef.current.activePresetId ? "ai_judge" : "browser_runner",
            item_id: meme.id,
            provider: configRef.current.provider,
            model: configRef.current.model,
            message: finalErrText.slice(0, 200),
            details: { isFatal, attempt, meme_id: meme.id }
          })
        }).catch(() => undefined);
      } catch {
        // Logging failure must never crash curation loop
      }

      // TWO-TIER CIRCUIT BREAKER:
      if (isFatal) {
        fatalConsecutiveFailuresRef.current += 1;
        if (fatalConsecutiveFailuresRef.current >= 2) {
          isProcessingRef.current = false;
          stop(`Paused: Fatal provider error (${finalErrText.slice(0, 80)}). Model may be retired or credentials invalid. Please check Model Config.`);
          return;
        }
      } else {
        transientConsecutiveFailuresRef.current += 1;
        if (transientConsecutiveFailuresRef.current >= 10) {
          isProcessingRef.current = false;
          stop("Paused: 10 consecutive memes failed due to network/provider errors. Runner paused safely.");
          return;
        }
      }

      // ADVANCE CLEANLY: Do NOT fabricate a fake review_later decision.
      // Calling onAdvance(undefined) skips saving to D1 and simply loads the next eligible meme.
      setStatusMessage(`⚠️ Meme ${meme.id} skipped due to error. Advancing to next draft...`);
      setLoopState("saving");
      let nextMeme: CurateMemeItem | null = null;
      try {
        nextMeme = await onAdvance(undefined);
      } catch (advanceErr) {
        console.error("Advance error on skipped meme:", advanceErr);
      }

      isProcessingRef.current = false;
      if (!isRunningRef.current) return;

      if (nextMeme && nextMeme.id !== meme.id) {
        processMeme(nextMeme);
      } else {
        stop("Queue finished or no more unreviewed memes in this queue.");
      }
      return;
    }

    if (!isRunningRef.current) {
      isProcessingRef.current = false;
      return;
    }

    // 1. Populate visual UI state
    onApplyDecision(decision);
    setLastDecision(decision);

    // 2. Visual countdown preview (or instant bypass if previewDelayMs is 0)
    const totalDelay = Math.max(0, configRef.current.previewDelayMs);

    if (totalDelay > 0) {
      setLoopState("previewing");
      setStatusMessage(`Previewing decision (${totalDelay}ms)...`);

      const stepMs = 50;
      let elapsed = 0;
      clearTimers();

      progressIntervalRef.current = window.setInterval(() => {
        elapsed += stepMs;
        const pct = Math.min(100, Math.round((elapsed / totalDelay) * 100));
        setPreviewProgress(pct);

        if (elapsed >= totalDelay && progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }, stepMs);

      await new Promise<void>((resolve) => {
        timerRef.current = window.setTimeout(resolve, totalDelay);
      });
      clearTimers();
    }

    if (!isRunningRef.current) {
      isProcessingRef.current = false;
      return;
    }

    // 3. Save decision and request next meme (single flight, no duplicates)
    setLoopState("saving");
    setStatusMessage("Saving decision and advancing...");
    processedCountRef.current += 1;
    setBatchProcessed(processedCountRef.current);

    let nextMeme: CurateMemeItem | null = null;
    try {
      nextMeme = await onAdvance(decision);
    } catch (saveErr) {
      console.error("Auto advance save error:", saveErr);
      const saveErrText = saveErr instanceof Error ? saveErr.message : String(saveErr);
      if (/quota|limit exceeded|resource limit/i.test(saveErrText)) {
        isProcessingRef.current = false;
        setErrorMessage("Database daily quota limit reached. Paused safely.");
        stop("Paused: Cloudflare D1 daily quota limit reached.");
        return;
      }
    }

    isProcessingRef.current = false;

    if (!isRunningRef.current) return;

    // 4. Continuously advance to next meme
    if (nextMeme && nextMeme.id !== meme.id) {
      processMeme(nextMeme);
    } else {
      stop("Queue finished or no more unreviewed memes in this queue.");
    }
  }, [onApplyDecision, onAdvance, clearTimers, stop]);

  // Handle manual navigation when loop is active and idle
  useEffect(() => {
    if (isRunning && currentMeme && !isProcessingRef.current) {
      if (inFlightMemeIdRef.current !== currentMeme.id) {
        processMeme(currentMeme);
      }
    }
  }, [isRunning, currentMeme, processMeme]);

  const start = useCallback(() => {
    if (!configRef.current.apiKey && !configRef.current.activePresetId && configRef.current.provider !== "custom") {
      setErrorMessage("Please configure an API Key or select a saved preset before starting AI Mode.");
      setLoopState("error");
      return;
    }
    if (!currentMemeRef.current) {
      setErrorMessage("No meme loaded to evaluate.");
      return;
    }

    clearTimers();
    isRunningRef.current = true;
    isProcessingRef.current = false;
    consecutiveFailuresRef.current = 0;
    fatalConsecutiveFailuresRef.current = 0;
    transientConsecutiveFailuresRef.current = 0;
    setIsRunning(true);
    setErrorMessage(null);
    processedCountRef.current = 0;
    setBatchProcessed(0);
    setRecoveredCount(0);
    setSkippedCount(0);
    processMeme(currentMemeRef.current);
  }, [clearTimers, processMeme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      isRunningRef.current = false;
      isProcessingRef.current = false;
    };
  }, [clearTimers]);

  return {
    isRunning,
    loopState,
    statusMessage,
    previewProgress,
    lastDecision,
    errorMessage,
    batchProcessed,
    recoveredCount,
    skippedCount,
    start,
    stop
  };
}
