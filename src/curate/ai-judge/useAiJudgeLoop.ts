import { useState, useRef, useEffect, useCallback } from "react";
import type { CurateMemeItem } from "../curateTypes";
import type { AiJudgeConfig, AiJudgeDecision, AiJudgeLoopState } from "./aiJudgeTypes";
import { analyzeMemeWithAi } from "./aiJudgeClient";

interface UseAiJudgeLoopProps {
  currentMeme: CurateMemeItem | null;
  config: AiJudgeConfig;
  onApplyDecision: (decision: AiJudgeDecision) => void;
  onAdvance: () => Promise<void>;
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

  // References to handle async cancellations without stale closures
  const isRunningRef = useRef(false);
  const currentMemeRef = useRef(currentMeme);
  const configRef = useRef(config);
  const timerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processedMemeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isRunningRef.current = isRunning;
    currentMemeRef.current = currentMeme;
    configRef.current = config;
  }, [isRunning, currentMeme, config]);

  // Clear all background timers
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

  const stop = useCallback((msg = "AI Mode stopped by user") => {
    clearTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isRunningRef.current = false;
    setIsRunning(false);
    setLoopState("stopped");
    setStatusMessage(msg);
    setPreviewProgress(0);
  }, [clearTimers]);

  // Execute a single judging step for the active meme
  const judgeActiveMeme = useCallback(async (meme: CurateMemeItem) => {
    if (!isRunningRef.current) return;

    // Check batch limit if in count mode
    if (
      configRef.current.batchMode === "count" &&
      processedMemeIdsRef.current.size >= configRef.current.batchCount
    ) {
      stop(`Batch limit reached (${configRef.current.batchCount} memes evaluated)`);
      return;
    }

    setLoopState("analyzing");
    setStatusMessage(`Analyzing meme: ${meme.id}...`);
    setErrorMessage(null);
    setPreviewProgress(0);

    try {
      const decision = await analyzeMemeWithAi(meme, configRef.current);
      if (!isRunningRef.current) return;

      // Apply decisions directly to the UI
      onApplyDecision(decision);
      setLastDecision(decision);

      // Start live countdown preview
      setLoopState("previewing");
      setStatusMessage(`Previewing decisions for ${configRef.current.previewDelayMs}ms...`);

      const totalDelay = configRef.current.previewDelayMs;
      const stepMs = 50;
      let elapsed = 0;

      clearTimers();

      progressIntervalRef.current = window.setInterval(() => {
        elapsed += stepMs;
        const pct = Math.min(100, Math.round((elapsed / totalDelay) * 100));
        setPreviewProgress(pct);

        if (elapsed >= totalDelay) {
          clearTimers();
        }
      }, stepMs);

      timerRef.current = window.setTimeout(async () => {
        if (!isRunningRef.current) return;

        setLoopState("saving");
        setStatusMessage(`Saving and advancing...`);
        processedMemeIdsRef.current.add(meme.id);
        setBatchProcessed(processedMemeIdsRef.current.size);

        try {
          await onAdvance();
        } catch (saveErr) {
          console.error("Auto advance save error:", saveErr);
        }
      }, totalDelay);
    } catch (err: unknown) {
      if (!isRunningRef.current) return;
      const errText = err instanceof Error ? err.message : "AI Analysis failed";
      setErrorMessage(errText);
      setLoopState("error");
      setStatusMessage(`Error: ${errText}`);
      // Auto pause on failure so user can fix or inspect
      stop(`Paused due to error: ${errText}`);
    }
  }, [onApplyDecision, onAdvance, clearTimers, stop]);

  // When a new meme loads and AI loop is active, start judging it
  useEffect(() => {
    if (isRunning && currentMeme) {
      // Check if we haven't already processed or aren't currently analyzing this meme
      if (loopState === "idle" || loopState === "saving") {
        judgeActiveMeme(currentMeme);
      }
    }
  }, [isRunning, currentMeme, loopState, judgeActiveMeme]);

  const start = useCallback(() => {
    if (!config.apiKey && config.provider !== "custom") {
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
    processedMemeIdsRef.current.clear();
    setBatchProcessed(0);
    judgeActiveMeme(currentMemeRef.current);
  }, [config, clearTimers, judgeActiveMeme]);

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
