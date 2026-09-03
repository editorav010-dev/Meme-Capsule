import { useState, useRef, useEffect, useCallback } from "react";
import type { CurateMemeItem } from "../curateTypes";
import type { AiJudgeConfig, AiJudgeDecision, AiJudgeLoopState } from "./aiJudgeTypes";
import { analyzeMemeWithAi } from "./aiJudgeClient";

interface UseAiJudgeLoopProps {
  currentMeme: CurateMemeItem | null;
  config: AiJudgeConfig;
  onApplyDecision: (decision: AiJudgeDecision) => void;
  onAdvance: () => Promise<CurateMemeItem | null>;
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

  // References to prevent stale closure bugs in continuous loop
  const isRunningRef = useRef(false);
  const currentMemeRef = useRef(currentMeme);
  const configRef = useRef(config);
  const timerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const inFlightMemeIdRef = useRef<string | null>(null);
  const processedCountRef = useRef(0);

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
    inFlightMemeIdRef.current = null;
    setIsRunning(false);
    setLoopState("stopped");
    setPreviewProgress(0);

    // Safeguard against React MouseEvent objects passed by onClick={onStop}
    const safeMsg = typeof msg === "string" ? msg : "AI Mode stopped by user";
    setStatusMessage(safeMsg);
  }, [clearTimers]);

  // Main processing pipeline for a single meme
  const processMeme = useCallback(async (meme: CurateMemeItem) => {
    if (!isRunningRef.current) return;

    // Check batch limit if configured
    if (
      configRef.current.batchMode === "count" &&
      processedCountRef.current >= configRef.current.batchCount
    ) {
      stop(`Batch limit reached (${configRef.current.batchCount} memes evaluated)`);
      return;
    }

    inFlightMemeIdRef.current = meme.id;
    setLoopState("analyzing");
    setStatusMessage(`Analyzing meme: ${meme.id}...`);
    setErrorMessage(null);
    setPreviewProgress(0);

    let decision: AiJudgeDecision;
    try {
      decision = await analyzeMemeWithAi(meme, configRef.current);
    } catch (err: unknown) {
      if (!isRunningRef.current) return;
      const errText = err instanceof Error ? err.message : "AI Analysis failed";
      setErrorMessage(errText);
      stop(`Paused due to error: ${errText}`);
      return;
    }

    if (!isRunningRef.current) return;

    // 1. Populate visual UI state
    onApplyDecision(decision);
    setLastDecision(decision);

    // 2. Start live visual countdown preview
    setLoopState("previewing");
    setStatusMessage(`Previewing decision (${configRef.current.previewDelayMs}ms)...`);

    const totalDelay = configRef.current.previewDelayMs;
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

    // Wait for the preview pause
    await new Promise<void>((resolve) => {
      timerRef.current = window.setTimeout(() => {
        resolve();
      }, totalDelay);
    });

    if (!isRunningRef.current) return;

    // 3. Save decision and request next meme
    setLoopState("saving");
    setStatusMessage("Saving decision and advancing...");
    processedCountRef.current += 1;
    setBatchProcessed(processedCountRef.current);

    let nextMeme: CurateMemeItem | null = null;
    try {
      nextMeme = await onAdvance();
    } catch (saveErr) {
      console.error("Auto advance save error:", saveErr);
    }

    if (!isRunningRef.current) return;

    // 4. Continuously advance to next meme
    if (nextMeme && nextMeme.id !== meme.id) {
      processMeme(nextMeme);
    } else {
      stop("Queue finished or no more unreviewed memes in this queue.");
    }
  }, [onApplyDecision, onAdvance, clearTimers, stop]);

  // Handle manual "Next" navigation while AI Mode is running
  useEffect(() => {
    if (isRunning && currentMeme) {
      if (
        inFlightMemeIdRef.current !== currentMeme.id &&
        loopState !== "analyzing" &&
        loopState !== "previewing" &&
        loopState !== "saving"
      ) {
        processMeme(currentMeme);
      }
    }
  }, [isRunning, currentMeme, loopState, processMeme]);

  const start = useCallback(() => {
    if (!configRef.current.apiKey && configRef.current.provider !== "custom") {
      setErrorMessage("Please configure an API Key before starting AI Mode.");
      setLoopState("error");
      return;
    }
    if (!currentMemeRef.current) {
      setErrorMessage("No meme loaded to evaluate.");
      return;
    }

    clearTimers();
    isRunningRef.current = true;
    setIsRunning(true);
    setErrorMessage(null);
    processedCountRef.current = 0;
    setBatchProcessed(0);
    processMeme(currentMemeRef.current);
  }, [clearTimers, processMeme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
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
    start,
    stop
  };
}
