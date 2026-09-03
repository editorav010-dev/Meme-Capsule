import React, { useState, useEffect, useCallback } from "react";
import type {
  AiJudgeConfig,
  AiJudgeDecision,
  AiJudgeLoopState,
  AiProviderKey,
  JudgeAiPreset
} from "./aiJudgeTypes";
import { AI_PROVIDER_PRESETS, DEFAULT_AI_JUDGE_CONFIG } from "./aiJudgeTypes";
import { testAiConnection } from "./aiJudgeClient";

interface AiJudgeConsoleProps {
  userId?: string;
  config: AiJudgeConfig;
  onUpdateConfig: (nextConfig: AiJudgeConfig) => void;
  isRunning: boolean;
  loopState: AiJudgeLoopState;
  statusMessage: string;
  previewProgress: number;
  lastDecision: AiJudgeDecision | null;
  errorMessage: string | null;
  batchProcessed: number;
  onStart: () => void;
  onStop: () => void;
}

export default function AiJudgeConsole({
  userId,
  config,
  onUpdateConfig,
  isRunning,
  loopState,
  statusMessage,
  previewProgress,
  lastDecision,
  errorMessage,
  batchProcessed,
  onStart,
  onStop
}: AiJudgeConsoleProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Judge-Isolated Saved Presets
  const [savedPresets, setSavedPresets] = useState<JudgeAiPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetActionMessage, setPresetActionMessage] = useState<string | null>(null);

  const storageKey = userId ? `meme-capsule:ai-config:${userId}` : "meme-capsule:ai-judge-config";

  // Fetch Judge's Isolated Presets from D1
  const fetchPresets = useCallback(async () => {
    const token = sessionStorage.getItem("curator_token");
    if (!token) return;

    try {
      const res = await fetch("/api/curate/ai-presets", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (data.presets && Array.isArray(data.presets)) {
        setSavedPresets(data.presets);
        if (userId) {
          localStorage.setItem(`meme-capsule:ai-presets:${userId}`, JSON.stringify(data.presets));
        }
      }
    } catch {
      // Local storage fallback for this specific judge
      if (userId) {
        const cached = localStorage.getItem(`meme-capsule:ai-presets:${userId}`);
        if (cached) {
          try {
            setSavedPresets(JSON.parse(cached));
          } catch {
            // ignore
          }
        }
      }
    }
  }, [userId]);

  // Load configuration and presets on mount or user switch
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        onUpdateConfig({ ...DEFAULT_AI_JUDGE_CONFIG, ...parsed });
      } catch {
        // use defaults
      }
    }
    fetchPresets();
  }, [storageKey, fetchPresets]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateConfigField = <K extends keyof AiJudgeConfig>(field: K, value: AiJudgeConfig[K]) => {
    const updated = { ...config, [field]: value };
    onUpdateConfig(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleSelectProvider = (providerId: AiProviderKey) => {
    const preset = AI_PROVIDER_PRESETS.find((p) => p.id === providerId);
    if (!preset) return;

    const updated: AiJudgeConfig = {
      ...config,
      provider: providerId,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      activePresetId: null
    };
    onUpdateConfig(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setTestResult(null);
  };

  const handleSelectModelChip = (modelName: string) => {
    updateConfigField("model", modelName);
  };

  const handleApplyPreset = (preset: JudgeAiPreset) => {
    const updated: AiJudgeConfig = {
      ...config,
      provider: preset.provider,
      baseUrl: preset.base_url,
      apiKey: preset.api_key,
      model: preset.model,
      activePresetId: preset.id
    };
    onUpdateConfig(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setPresetActionMessage(`Loaded preset: "${preset.preset_name}"`);
    setTestResult(null);
    setTimeout(() => setPresetActionMessage(null), 3000);
  };

  const handleSaveCurrentAsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const token = sessionStorage.getItem("curator_token");
    if (!token) return;

    try {
      const res = await fetch("/api/curate/ai-presets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          preset_name: newPresetName.trim(),
          provider: config.provider,
          base_url: config.baseUrl,
          api_key: config.apiKey,
          model: config.model
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save preset.");
      }

      if (data.preset) {
        setSavedPresets((prev) => [data.preset, ...prev.filter((p) => p.id !== data.preset.id)]);
        updateConfigField("activePresetId", data.preset.id);
        setPresetActionMessage(`Saved preset: "${newPresetName.trim()}"`);
        setNewPresetName("");
        setShowSavePresetModal(false);
        setTimeout(() => setPresetActionMessage(null), 3000);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving preset.");
    }
  };

  const handleDeletePreset = async (presetId: string, presetName: string) => {
    if (!window.confirm(`Delete preset "${presetName}"?`)) return;

    const token = sessionStorage.getItem("curator_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/curate/ai-presets?id=${encodeURIComponent(presetId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setSavedPresets((prev) => prev.filter((p) => p.id !== presetId));
        if (config.activePresetId === presetId) {
          updateConfigField("activePresetId", null);
        }
        setPresetActionMessage(`Deleted preset: "${presetName}"`);
        setTimeout(() => setPresetActionMessage(null), 3000);
      }
    } catch {
      alert("Failed to delete preset.");
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testAiConnection(config);
    setTestResult(res);
    setIsTesting(false);
  };

  const isConfigured = Boolean(config.baseUrl && (config.apiKey || config.provider === "custom"));
  const activeTemplate = AI_PROVIDER_PRESETS.find((p) => p.id === config.provider) || AI_PROVIDER_PRESETS[0];

  return (
    <div
      style={{
        backgroundColor: "#161616",
        border: isRunning ? "2px solid #34C759" : "2px solid #9b30ff",
        boxShadow: isRunning ? "4px 4px 0px #34C759" : "4px 4px 0px #f4c300",
        marginBottom: "16px",
        transition: "all 0.2s ease"
      }}
    >
      {/* 1. Primary HUD Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          background: isRunning ? "rgba(52, 199, 89, 0.08)" : "#1c1b1b",
          borderBottom: isConfigOpen ? "2px solid #2a2a2a" : "none",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        {/* Left: Indicator & Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: isRunning ? "#34C759" : isConfigured ? "#f4c300" : "#888",
                boxShadow: isRunning ? "0 0 8px #34C759" : "none"
              }}
            />
            <span
              className="curate-anton"
              style={{
                fontSize: "18px",
                color: isRunning ? "#34C759" : "#f4c300",
                letterSpacing: "0.5px"
              }}
            >
              AI JUDGE CONSOLE
            </span>
          </div>

          {/* Current Status Pill */}
          <span
            style={{
              fontSize: "11px",
              fontFamily: "Oswald, sans-serif",
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "2px",
              backgroundColor:
                loopState === "analyzing"
                  ? "rgba(244, 195, 0, 0.2)"
                  : loopState === "previewing"
                  ? "rgba(52, 199, 89, 0.2)"
                  : loopState === "error"
                  ? "rgba(255, 59, 48, 0.2)"
                  : "#262626",
              color:
                loopState === "analyzing"
                  ? "#f4c300"
                  : loopState === "previewing"
                  ? "#34C759"
                  : loopState === "error"
                  ? "#FF3B30"
                  : "#888",
              border: `1px solid ${
                loopState === "analyzing"
                  ? "#f4c300"
                  : loopState === "previewing"
                  ? "#34C759"
                  : loopState === "error"
                  ? "#FF3B30"
                  : "#444"
              }`
            }}
          >
            {loopState.toUpperCase()}
          </span>

          {/* Model info badge */}
          <span
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              color: "#aaa",
              background: "#111",
              padding: "3px 8px",
              border: "1px solid #333"
            }}
          >
            {config.model}
          </span>
        </div>

        {/* Center: Live Status & Batch Count */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", fontFamily: "Oswald, sans-serif", color: "#ddd" }}>
            {statusMessage}
          </span>
          {isRunning && (
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#f4c300",
                background: "#222",
                padding: "2px 6px",
                border: "1px solid #f4c300"
              }}
            >
              {config.batchMode === "count"
                ? `${batchProcessed} / ${config.batchCount} EVALUATED`
                : `${batchProcessed} EVALUATED (ENDLESS)`}
            </span>
          )}
        </div>

        {/* Right: Primary Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!isConfigured ? (
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              style={{
                padding: "6px 14px",
                background: "#f4c300",
                color: "#121212",
                border: "2px solid black",
                boxShadow: "2px 2px 0px black",
                fontFamily: "var(--font-display, 'Anton', sans-serif)",
                fontSize: "14px",
                cursor: "pointer"
              }}
            >
              ⚙️ CONFIGURE AI TO START
            </button>
          ) : isRunning ? (
            <button
              type="button"
              onClick={() => onStop()}
              style={{
                padding: "6px 18px",
                background: "#FF3B30",
                color: "#ffffff",
                border: "2px solid black",
                boxShadow: "2px 2px 0px black",
                fontFamily: "var(--font-display, 'Anton', sans-serif)",
                fontSize: "15px",
                letterSpacing: "0.5px",
                cursor: "pointer"
              }}
            >
              ⏹ STOP AI MODE [ESC]
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStart()}
              style={{
                padding: "6px 18px",
                background: "#34C759",
                color: "#121212",
                border: "2px solid black",
                boxShadow: "2px 2px 0px black",
                fontFamily: "var(--font-display, 'Anton', sans-serif)",
                fontSize: "15px",
                letterSpacing: "0.5px",
                cursor: "pointer"
              }}
            >
              ▶ START CONTINUOUS AI JUDGE
            </button>
          )}

          {/* Expand/Collapse Settings Toggle */}
          <button
            type="button"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            style={{
              padding: "6px 12px",
              background: isConfigOpen ? "#9b30ff" : "#262626",
              color: isConfigOpen ? "#ffffff" : "#f4c300",
              border: "1px solid #444",
              fontFamily: "Oswald, sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <span>⚙️ {isConfigOpen ? "HIDE CONFIG" : "MODEL CONFIG"}</span>
          </button>
        </div>
      </div>

      {/* 2. Live Visual Countdown Bar (Active during previewing) */}
      {isRunning && loopState === "previewing" && (
        <div
          style={{
            height: "4px",
            backgroundColor: "#111",
            width: "100%",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${previewProgress}%`,
              backgroundColor: "#f4c300",
              transition: "width 0.05s linear"
            }}
          />
        </div>
      )}

      {/* 3. Collapsible Configuration & Model Console */}
      {isConfigOpen && (
        <div
          style={{
            padding: "18px",
            backgroundColor: "#191919",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >
          {/* Action notice */}
          {presetActionMessage && (
            <div
              style={{
                padding: "6px 12px",
                background: "rgba(52, 199, 89, 0.2)",
                border: "1px solid #34C759",
                color: "#34C759",
                fontSize: "12px",
                fontFamily: "Oswald"
              }}
            >
              ✓ {presetActionMessage}
            </div>
          )}

          {/* Section A: Judge's Saved Presets Toolbar */}
          <div style={{ background: "#141414", padding: "12px", border: "1px solid #333" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px"
              }}
            >
              <div
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#f4c300",
                  letterSpacing: "0.5px"
                }}
              >
                YOUR SAVED AI MODEL PRESETS (PRIVATE TO YOU):
              </div>
              <button
                type="button"
                onClick={() => setShowSavePresetModal(true)}
                style={{
                  padding: "4px 10px",
                  background: "#9b30ff",
                  color: "#fff",
                  border: "1px solid #f4c300",
                  fontFamily: "Oswald",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                + SAVE CURRENT CONFIG AS PRESET
              </button>
            </div>

            {savedPresets.length === 0 ? (
              <div style={{ fontSize: "11px", color: "#777", fontStyle: "italic" }}>
                No custom presets saved yet. Configure your model and click "+ Save Current Config as Preset" to save it for quick one-click switching.
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {savedPresets.map((p) => {
                  const isActive = config.activePresetId === p.id;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: isActive ? "#9b30ff" : "#222",
                        border: isActive ? "1px solid #f4c300" : "1px solid #444",
                        padding: "4px 8px",
                        gap: "6px"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: isActive ? "#ffffff" : "#cccccc",
                          fontFamily: "Oswald",
                          fontSize: "12px",
                          fontWeight: isActive ? 700 : 400,
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        {p.preset_name} ({p.model.split("/").pop()})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(p.id, p.preset_name)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ff5555",
                          fontSize: "11px",
                          cursor: "pointer",
                          padding: "0 2px"
                        }}
                        title="Delete Preset"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal to Name and Save Preset */}
          {showSavePresetModal && (
            <div
              style={{
                background: "#222",
                border: "2px solid #f4c300",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f4c300", fontFamily: "Oswald" }}>
                ENTER NAME FOR THIS MODEL PRESET:
              </span>
              <form onSubmit={handleSaveCurrentAsPreset} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="e.g. Muse Glimmer 30B, Kimi K3, NVIDIA Llama"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    background: "#111",
                    border: "1px solid #555",
                    color: "#fff",
                    fontFamily: "Oswald",
                    fontSize: "12px",
                    outline: "none"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "6px 14px",
                    background: "#f4c300",
                    color: "#111",
                    border: "none",
                    fontFamily: "Anton",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavePresetModal(false)}
                  style={{
                    padding: "6px 10px",
                    background: "#333",
                    color: "#aaa",
                    border: "none",
                    fontFamily: "Oswald",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  CANCEL
                </button>
              </form>
            </div>
          )}

          {/* Section B: Choose Vision Provider Template */}
          <div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "#f4c300",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "8px"
              }}
            >
              QUICK PROVIDER TEMPLATES:
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {AI_PROVIDER_PRESETS.map((p) => {
                const isSelected = config.provider === p.id && !config.activePresetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p.id)}
                    style={{
                      padding: "6px 12px",
                      background: isSelected ? "#9b30ff" : "#242424",
                      color: isSelected ? "#ffffff" : "#dddddd",
                      border: isSelected ? "2px solid #f4c300" : "1px solid #444",
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: isSelected ? "2px 2px 0px black" : "none"
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "6px", fontFamily: "Oswald" }}>
              {activeTemplate.description}{" "}
              <a
                href={activeTemplate.keyHelpUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#f4c300", textDecoration: "underline" }}
              >
                Get API Key ↗
              </a>
            </div>
          </div>

          {/* Section C: Connection Details: Base URL, API Key & Model Name */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px"
            }}
          >
            {/* Base URL */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "11px",
                  color: "#aaa",
                  marginBottom: "4px"
                }}
              >
                API BASE URL:
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => updateConfigField("baseUrl", e.target.value)}
                placeholder="https://..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#121212",
                  border: "1px solid #444",
                  color: "#fff",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  outline: "none"
                }}
              />
            </div>

            {/* API Key */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "11px",
                  color: "#aaa",
                  marginBottom: "4px"
                }}
              >
                API KEY:
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={config.apiKey}
                  onChange={(e) => updateConfigField("apiKey", e.target.value)}
                  placeholder="Paste your API key..."
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    background: "#121212",
                    border: "1px solid #444",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    outline: "none"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    padding: "6px 10px",
                    background: "#222",
                    border: "1px solid #444",
                    color: "#aaa",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  {showApiKey ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* Model Name */}
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "11px",
                  color: "#aaa",
                  marginBottom: "4px"
                }}
              >
                MODEL IDENTIFIER (E.G. MUSE GLIMMER 30B, KIMI K3, LLAMA VISION):
              </label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => updateConfigField("model", e.target.value)}
                placeholder="e.g. muse/glimmer-30b or meta/llama-3.2-11b-vision-instruct"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#121212",
                  border: "1px solid #444",
                  color: "#fff",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Recommended Model Quick-Chips */}
          {activeTemplate.recommendedModels.length > 0 && (
            <div>
              <span style={{ fontSize: "11px", color: "#888", fontFamily: "Oswald", marginRight: "8px" }}>
                POPULAR VISION MODELS:
              </span>
              <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                {activeTemplate.recommendedModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectModelChip(m)}
                    style={{
                      padding: "2px 8px",
                      background: config.model === m ? "#f4c300" : "#222",
                      color: config.model === m ? "#111" : "#aaa",
                      border: "1px solid #444",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      cursor: "pointer"
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section D: Execution Settings */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              paddingTop: "12px",
              borderTop: "1px solid #282828"
            }}
          >
            {/* Batch Mode */}
            <div>
              <label style={{ display: "block", fontFamily: "Oswald", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                BATCH EXECUTION LIMIT:
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => updateConfigField("batchMode", "endless")}
                  style={{
                    padding: "4px 8px",
                    background: config.batchMode === "endless" ? "#f4c300" : "#222",
                    color: config.batchMode === "endless" ? "#111" : "#aaa",
                    border: "1px solid #444",
                    fontFamily: "Oswald",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  ENDLESS (RUN CONTINUOUSLY)
                </button>
                <button
                  type="button"
                  onClick={() => updateConfigField("batchMode", "count")}
                  style={{
                    padding: "4px 8px",
                    background: config.batchMode === "count" ? "#f4c300" : "#222",
                    color: config.batchMode === "count" ? "#111" : "#aaa",
                    border: "1px solid #444",
                    fontFamily: "Oswald",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  BATCH LIMIT
                </button>
              </div>
              {config.batchMode === "count" && (
                <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {[10, 25, 50, 100].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateConfigField("batchCount", n)}
                      style={{
                        padding: "2px 6px",
                        fontSize: "10px",
                        background: config.batchCount === n ? "#9b30ff" : "#111",
                        color: "#fff",
                        border: "1px solid #444",
                        cursor: "pointer"
                      }}
                    >
                      {n} memes
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Delay */}
            <div>
              <label style={{ display: "block", fontFamily: "Oswald", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                LIVE PREVIEW PAUSE: {config.previewDelayMs}ms
              </label>
              <input
                type="range"
                min="500"
                max="5000"
                step="250"
                value={config.previewDelayMs}
                onChange={(e) => updateConfigField("previewDelayMs", Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#666" }}>
                <span>Fast (500ms)</span>
                <span>Normal (1500ms)</span>
                <span>Slow (5000ms)</span>
              </div>
            </div>

            {/* Low Confidence Fallback */}
            <div>
              <label style={{ display: "block", fontFamily: "Oswald", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                LOW CONFIDENCE / AMBIGUOUS:
              </label>
              <select
                value={config.lowConfidenceFallback}
                onChange={(e) => updateConfigField("lowConfidenceFallback", e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  background: "#121212",
                  border: "1px solid #444",
                  color: "#f4c300",
                  fontFamily: "Oswald",
                  fontSize: "12px",
                  outline: "none"
                }}
              >
                <option value="review_later">⚠️ Defer to Review Later Queue [Recommended]</option>
                <option value="excluded">✕ Exclude Meme from Corpus</option>
              </select>
            </div>
          </div>

          {/* Test Connection & Feedback */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "8px",
              borderTop: "1px solid #282828",
              flexWrap: "wrap",
              gap: "8px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !config.baseUrl}
                style={{
                  padding: "6px 14px",
                  background: "#2a2a2a",
                  color: "#f4c300",
                  border: "1px solid #9b30ff",
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: isTesting ? "wait" : "pointer"
                }}
              >
                {isTesting ? "TESTING..." : "⚡ TEST CONNECTION"}
              </button>

              {testResult && (
                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "Oswald",
                    color: testResult.success ? "#34C759" : "#FF3B30"
                  }}
                >
                  {testResult.success ? "✓" : "✕"} {testResult.message}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              style={{
                padding: "6px 16px",
                background: "#f4c300",
                color: "#121212",
                border: "none",
                fontFamily: "var(--font-display, 'Anton', sans-serif)",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              DONE / SAVE
            </button>
          </div>
        </div>
      )}

      {/* 4. Live AI Reasoning Tooltip / Pill Strip */}
      {lastDecision && (
        <div
          style={{
            padding: "8px 18px",
            background: "#111",
            borderTop: "1px solid #242424",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "12px",
            fontFamily: "Oswald, sans-serif",
            flexWrap: "wrap"
          }}
        >
          <span style={{ color: "#f4c300", fontWeight: 700 }}>AI RATIONALE:</span>
          <span style={{ color: "#cdc3d0", fontStyle: "italic" }}>
            "{lastDecision.curator_note}"
          </span>
          <span style={{ marginLeft: "auto", color: "#888", fontSize: "11px", fontFamily: "monospace" }}>
            Confidence: {Math.round(lastDecision.confidence * 100)}%
            {lastDecision.latencyMs ? ` · ${lastDecision.latencyMs}ms` : ""}
          </span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: "8px 18px",
            background: "rgba(255, 59, 48, 0.15)",
            borderTop: "1px solid #FF3B30",
            color: "#FF3B30",
            fontSize: "12px",
            fontFamily: "Oswald, sans-serif"
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
}
