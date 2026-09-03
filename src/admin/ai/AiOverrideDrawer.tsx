import React, { useEffect, useState } from "react";
import type { AiComparisonMeme } from "./aiApi";
import { MEME_CATEGORIES, getCategoryMeta } from "./categories";

interface AiOverrideDrawerProps {
  meme: AiComparisonMeme | null;
  isOpen: boolean;
  isConfirming: boolean;
  onClose: () => void;
  onConfirm: (memeId: string, categoryId: number) => Promise<void>;
}

export default function AiOverrideDrawer({
  meme,
  isOpen,
  isConfirming,
  onClose,
  onConfirm
}: AiOverrideDrawerProps) {
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  useEffect(() => {
    if (meme) {
      const defaultId =
        meme.final_category ||
        meme.consensus_category ||
        Number(meme.ai_category) ||
        null;
      setSelectedCatId(defaultId);
    }
  }, [meme]);

  if (!isOpen || !meme) return null;

  const aiMeta = getCategoryMeta(meme.ai_category);
  const consensusMeta = getCategoryMeta(meme.consensus_category);

  // Parse vote breakdown safely
  let parsedVotes: Record<string, number> = {};
  if (meme.vote_breakdown) {
    if (typeof meme.vote_breakdown === "string") {
      try {
        parsedVotes = JSON.parse(meme.vote_breakdown);
      } catch {
        parsedVotes = {};
      }
    } else if (typeof meme.vote_breakdown === "object") {
      parsedVotes = meme.vote_breakdown as Record<string, number>;
    }
  }

  const handleConfirmClick = async () => {
    if (!selectedCatId) return;
    await onConfirm(meme.id, selectedCatId);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          height: "100%",
          backgroundColor: "#1c1b1b",
          borderLeft: "4px solid #9b30ff",
          boxShadow: "-8px 0px 0px 0px rgba(0,0,0,0.9)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto"
        }}
        className="custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "2px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#131313"
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "var(--font-display, 'Anton', sans-serif)",
                fontSize: "20px",
                color: "#f4c300",
                letterSpacing: "0.5px",
                textTransform: "uppercase"
              }}
            >
              Review & Override
            </span>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "11px", color: "#8e8e93" }}>
              MEME ID: {meme.id}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#dd0061",
              fontFamily: "var(--font-display, 'Anton', sans-serif)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Large Meme Image */}
          <div
            style={{
              background: "#111",
              border: "2px solid #2a2a2a",
              borderRadius: "4px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {meme.image_url ? (
              <img
                src={meme.image_url}
                alt={meme.title || "Meme preview"}
                style={{
                  maxHeight: "260px",
                  maxWidth: "100%",
                  objectFit: "contain",
                  borderRadius: "2px"
                }}
              />
            ) : (
              <div style={{ color: "#666", padding: "40px", fontFamily: "Oswald" }}>
                No image available
              </div>
            )}
            {meme.title && (
              <div
                style={{
                  marginTop: "10px",
                  fontFamily: "Oswald, sans-serif",
                  fontWeight: 600,
                  color: "#e5e2e1",
                  textAlign: "center",
                  fontSize: "14px"
                }}
              >
                {meme.title}
              </div>
            )}
          </div>

          {/* AI Decision & Reasoning */}
          <div
            style={{
              background: "#161616",
              border: "2px solid #9b30ff",
              padding: "14px",
              boxShadow: "3px 3px 0px black"
            }}
          >
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "#9b30ff",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span>AI DECISION</span>
              {meme.ai_confidence !== null && (
                <span style={{ color: "#f4c300" }}>
                  CONFIDENCE: {Math.round(meme.ai_confidence * 100)}%
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              {aiMeta ? (
                <span
                  style={{
                    backgroundColor: `${aiMeta.color}33`,
                    border: `1px solid ${aiMeta.color}`,
                    color: aiMeta.color,
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontFamily: "Oswald, sans-serif",
                    fontWeight: 700,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  {aiMeta.label}
                </span>
              ) : (
                <span style={{ color: "#8e8e93", fontSize: "12px", fontFamily: "Oswald" }}>
                  {meme.ai_category || "Uncategorised"}
                </span>
              )}
              {meme.ai_model && (
                <span style={{ color: "#8e8e93", fontSize: "10px", fontFamily: "monospace" }}>
                  ({meme.ai_model})
                </span>
              )}
            </div>

            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontStyle: "italic",
                fontSize: "12px",
                lineHeight: "1.4",
                color: "#cdc3d0",
                background: "#111",
                padding: "8px 12px",
                borderLeft: "3px solid #9b30ff"
              }}
            >
              {meme.ai_reasoning || "No AI reasoning provided."}
            </div>
          </div>

          {/* Human Consensus & Vote Breakdown */}
          <div
            style={{
              background: "#161616",
              border: "2px solid #f4c300",
              padding: "14px",
              boxShadow: "3px 3px 0px black"
            }}
          >
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "#f4c300",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span>HUMAN CONSENSUS</span>
              {meme.confidence_score !== null && (
                <span style={{ color: "#34C759" }}>
                  SCORE: {Math.round((meme.confidence_score || 0) * 100)}%
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              {consensusMeta ? (
                <span
                  style={{
                    backgroundColor: `${consensusMeta.color}33`,
                    border: `1px solid ${consensusMeta.color}`,
                    color: consensusMeta.color,
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontFamily: "Oswald, sans-serif",
                    fontWeight: 700,
                    fontSize: "12px",
                    textTransform: "uppercase"
                  }}
                >
                  {consensusMeta.label}
                  {meme.final_category ? " (CONFIRMED)" : ""}
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: "rgba(142, 142, 147, 0.15)",
                    border: "1px solid #8e8e93",
                    color: "#8e8e93",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontFamily: "Oswald, sans-serif",
                    fontWeight: 700,
                    fontSize: "11px",
                    textTransform: "uppercase"
                  }}
                >
                  NO CONSENSUS
                </span>
              )}
            </div>

            {/* Vote breakdown tags */}
            {Object.keys(parsedVotes).length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                {Object.entries(parsedVotes).map(([catKey, count]) => {
                  const meta = getCategoryMeta(catKey);
                  return (
                    <span
                      key={catKey}
                      style={{
                        fontSize: "11px",
                        fontFamily: "Oswald",
                        background: "#222",
                        border: `1px solid ${meta?.color || "#555"}`,
                        color: meta?.color || "#fff",
                        padding: "2px 6px"
                      }}
                    >
                      {meta?.label || `Cat #${catKey}`}: {count} vote{count > 1 ? "s" : ""}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seven Category Buttons for Override */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-display, 'Anton', sans-serif)",
                fontSize: "15px",
                color: "#f4c300",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "10px"
              }}
            >
              Select Correct Category:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {MEME_CATEGORIES.map((cat) => {
                const isSelected = selectedCatId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCatId(cat.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: isSelected ? cat.color : "#141414",
                      color: isSelected ? "#ffffff" : "#ffffff",
                      border: `2px solid ${cat.color}`,
                      boxShadow: isSelected
                        ? `3px 3px 0px black, 0 0 12px ${cat.color}`
                        : "2px 2px 0px black",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isSelected ? "#ffffff" : "#222",
                        color: isSelected ? "#131313" : cat.color,
                        fontFamily: "var(--font-display, 'Anton', sans-serif)",
                        fontSize: "18px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        marginRight: "12px",
                        flexShrink: 0
                      }}
                    >
                      [{cat.key}]
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display, 'Anton', sans-serif)",
                          fontSize: "16px",
                          letterSpacing: "0.5px"
                        }}
                      >
                        {cat.label.toUpperCase()}
                      </div>
                      <div
                        style={{
                          fontFamily: "Oswald, sans-serif",
                          fontSize: "11px",
                          color: isSelected ? "rgba(255,255,255,0.85)" : "#8e8e93"
                        }}
                      >
                        {cat.description}
                      </div>
                    </div>
                    {isSelected && (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "20px", color: "#ffffff" }}
                      >
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            marginTop: "auto",
            padding: "16px 20px",
            borderTop: "2px solid #2a2a2a",
            background: "#131313",
            display: "flex",
            gap: "12px"
          }}
        >
          <button
            type="button"
            disabled={!selectedCatId || isConfirming}
            onClick={handleConfirmClick}
            className="brutalist-interactive"
            style={{
              flex: 1,
              padding: "12px",
              background: selectedCatId ? "#f4c300" : "#444",
              color: "#131313",
              border: "2px solid black",
              boxShadow: "3px 3px 0px black",
              fontFamily: "var(--font-display, 'Anton', sans-serif)",
              fontSize: "16px",
              letterSpacing: "0.5px",
              cursor: selectedCatId && !isConfirming ? "pointer" : "not-allowed",
              opacity: isConfirming ? 0.7 : 1
            }}
          >
            {isConfirming ? "CONFIRMING..." : "CONFIRM OVERRIDE"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="brutalist-border-sm brutalist-interactive"
            style={{
              padding: "12px 18px",
              background: "#222",
              color: "#e5e2e1",
              cursor: "pointer",
              fontFamily: "Oswald, sans-serif",
              fontWeight: 700
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
