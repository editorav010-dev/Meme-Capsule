import React, { useState } from "react";
import type { CuratedMemeData } from "./curateTypes";

interface AiReviewPanelProps {
  j4?: CuratedMemeData | null;
  onEnterOverride: () => void;
  onAdopt: (j: CuratedMemeData, source: "judge4" | "consensus") => void;
  onForceRemove: () => void;
  isMobile?: boolean;
  isAiJudge?: boolean;
  judgeName?: string;
  onTestEvaluate?: () => void;
  isTesting?: boolean;
  activeModel?: string;
}

export default function AiReviewPanel({
  j4,
  onEnterOverride,
  onAdopt,
  onForceRemove,
  isMobile = false,
  isAiJudge = false,
  judgeName = "AI Judge",
  onTestEvaluate,
  isTesting = false,
  activeModel = "Vision Model"
}: AiReviewPanelProps) {
  const [showContract, setShowContract] = useState(false);

  const ai = j4?.corpus_status ? j4 : null;
  const adoptSource: "judge4" = "judge4";
  const hasAi = Boolean(ai?.corpus_status);

  const isKeep = ai?.corpus_status === "keep";
  const isExcluded = ai?.corpus_status === "excluded";
  const statusColor = isKeep ? "#34C759" : isExcluded ? "#FF3B30" : "#FF9F0A";

  if (isMobile) {
    return (
      <div className="curate-mobile-ai-strip">
        {hasAi ? (
          <div
            className="curate-mobile-ai-card"
            style={{
              borderColor: statusColor,
              boxShadow: `3px 3px 0px ${statusColor}`
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "Anton",
                  fontSize: "15px",
                  color: statusColor,
                  letterSpacing: "0.5px"
                }}
              >
                {isExcluded ? "⛔ " : "🤖 "}AI PRE-JUDGEMENT: {ai!.corpus_status.toUpperCase()}
              </span>
              <span style={{ fontSize: "10px", color: "#aaa", fontFamily: "monospace" }}>
                Swipe ← or → to adopt
              </span>
            </div>

            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>
              {ai!.topics.length > 0 ? ai!.topics.join(", ") : "No topics"} · {ai!.tone || "No tone"}
              {ai!.curator_note && (
                <div style={{ marginTop: "3px", color: "#888", fontStyle: "italic" }}>
                  &ldquo;{ai!.curator_note}&rdquo;
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onAdopt(ai!, adoptSource)}
              style={{
                width: "100%",
                marginTop: "8px",
                background: isKeep ? "#34C759" : isExcluded ? "#FF3B30" : "#FF9F0A",
                color: isKeep ? "#121212" : "#ffffff",
                border: isExcluded ? "2px solid #ffffff" : "none",
                padding: "8px",
                fontFamily: "Anton",
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: isExcluded ? "2px 2px 0px #ffffff" : undefined
              }}
            >
              ➔ ADOPT AI EVALUATION (SWIPE ← / →)
            </button>
          </div>
        ) : (
          <div
            className="curate-mobile-ai-card"
            style={{
              borderColor: isAiJudge ? "#00f0ff" : "#555",
              textAlign: "center",
              padding: "10px 14px"
            }}
          >
            <div style={{ color: isAiJudge ? "#00f0ff" : "#f4c300", fontFamily: "Anton", fontSize: "14px" }}>
              {isAiJudge ? "⚡ DRAFT READY FOR AI" : "NO AI PRE-JUDGEMENT"}
            </div>
            <div style={{ fontSize: "11px", color: "#888", margin: "4px 0" }}>
              {isAiJudge ? `Awaiting evaluation by ${judgeName}` : "Swipe up (↑) or tap to curate manually"}
            </div>
            {isAiJudge ? (
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={onTestEvaluate}
                  disabled={isTesting}
                  style={{
                    flex: 1,
                    background: isTesting ? "#555" : "#00f0ff",
                    color: "#000",
                    border: "none",
                    padding: "8px",
                    fontFamily: "Anton",
                    fontSize: "12px",
                    cursor: isTesting ? "wait" : "pointer"
                  }}
                >
                  {isTesting ? "EVALUATING..." : "⚡ TEST EVALUATE (AI)"}
                </button>
                <button
                  type="button"
                  onClick={onEnterOverride}
                  style={{
                    background: "#222",
                    color: "#f4c300",
                    border: "1px solid #f4c300",
                    padding: "8px 12px",
                    fontFamily: "Anton",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  EDIT
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onEnterOverride}
                style={{
                  width: "100%",
                  marginTop: "6px",
                  background: "#9b30ff",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px",
                  fontFamily: "Anton",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                MANUAL CURATE (SWIPE ↑)
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop Rendering
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 1. AI Advisory Card */}
      {hasAi ? (
        <div
          style={{
            background: "#1c1b1b",
            border: `2px solid ${statusColor}`,
            padding: "18px",
            boxShadow: `4px 4px 0px ${statusColor}`
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span
              style={{
                fontSize: "18px",
                color: statusColor,
                fontFamily: "Anton",
                letterSpacing: "1px"
              }}
            >
              {isExcluded ? "⛔ " : "🤖 "}AI PRE-JUDGEMENT (ADVISORY): {ai!.corpus_status.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: "11px",
                background: isExcluded ? "#3a1414" : "#1a2a1a",
                color: statusColor,
                padding: "2px 8px",
                fontFamily: "monospace",
                border: `1px solid ${statusColor}`
              }}
            >
              AI ADVISORY
            </span>
          </div>

          <div
            style={{
              background: "#121212",
              border: "1px solid #333",
              padding: "12px",
              marginBottom: "14px",
              fontSize: "13px",
              color: "#ddd",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}
          >
            <div>
              <span style={{ color: "#888", fontFamily: "monospace" }}>STATUS:</span>{" "}
              <strong style={{ color: statusColor }}>{ai!.corpus_status.toUpperCase()}</strong>
            </div>
            <div>
              <span style={{ color: "#888", fontFamily: "monospace" }}>TOPICS:</span>{" "}
              {ai!.topics.length > 0 ? ai!.topics.join(", ") : <em style={{ color: "#666" }}>None</em>}
            </div>
            <div>
              <span style={{ color: "#888", fontFamily: "monospace" }}>TONE:</span>{" "}
              {ai!.tone || <em style={{ color: "#666" }}>None</em>}
            </div>
            <div>
              <span style={{ color: "#888", fontFamily: "monospace" }}>MECHS:</span>{" "}
              {ai!.humour_mechanisms.length > 0 ? ai!.humour_mechanisms.join(", ") : <em style={{ color: "#666" }}>None</em>}
            </div>
            {ai!.curator_note && (
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#aaa",
                  fontStyle: "italic",
                  borderTop: "1px dashed #333",
                  paddingTop: "6px"
                }}
              >
                💬 AI Rationale: &ldquo;{ai!.curator_note}&rdquo;
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onAdopt(ai!, adoptSource)}
            style={{
              width: "100%",
              background: isKeep ? "#34C759" : isExcluded ? "#FF3B30" : "#FF9F0A",
              color: isKeep ? "#121212" : "#ffffff",
              border: "2px solid #ffffff",
              padding: "14px",
              fontFamily: "Anton",
              fontSize: "18px",
              cursor: "pointer",
              letterSpacing: "0.5px",
              boxShadow: "3px 3px 0px #ffffff"
            }}
          >
            ➔ ADOPT AI EVALUATION [SPACE / ENTER]
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "#1c1b1b",
            border: isAiJudge ? "2px solid #00f0ff" : "2px solid #555",
            padding: "20px",
            textAlign: "center"
          }}
        >
          <div
            style={{
              fontSize: "18px",
              color: isAiJudge ? "#00f0ff" : "#f4c300",
              fontFamily: "Anton",
              letterSpacing: "1px",
              marginBottom: "8px"
            }}
          >
            {isAiJudge ? "⚡ DRAFT MEME — AWAITING AI EVALUATION" : "NO AI PRE-JUDGEMENT AVAILABLE"}
          </div>
          <p style={{ color: "#aaa", fontSize: "13px", margin: "0 0 16px 0" }}>
            {isAiJudge
              ? `This meme is queued for ${judgeName}. Run continuous batch above or test evaluate this individual meme.`
              : "This meme has not been pre-evaluated by AI Judge. Please curate manually."}
          </p>

          {isAiJudge ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "340px", margin: "0 auto" }}>
              <button
                type="button"
                onClick={onTestEvaluate}
                disabled={isTesting}
                style={{
                  background: isTesting ? "#555" : "#00f0ff",
                  color: "#000",
                  border: "2px solid #fff",
                  padding: "12px 20px",
                  fontFamily: "Anton",
                  fontSize: "16px",
                  cursor: isTesting ? "wait" : "pointer",
                  boxShadow: "3px 3px 0px #000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                {isTesting ? "⚡ EVALUATING WITH VISION AI..." : "⚡ TEST EVALUATE THIS MEME (AI)"}
              </button>

              <button
                type="button"
                onClick={() => setShowContract((prev) => !prev)}
                style={{
                  background: "#242424",
                  color: "#00f0ff",
                  border: "1px solid #00f0ff",
                  padding: "8px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "monospace"
                }}
              >
                {showContract ? "▼ HIDE AI PROMPT CONTRACT" : "▶ INSPECT AI PROMPT CONTRACT"}
              </button>

              {showContract && (
                <div style={{ background: "#121212", border: "1px solid #333", padding: "12px", textAlign: "left", fontSize: "11px", color: "#ccc", lineHeight: "1.5" }}>
                  <div style={{ color: "#00f0ff", fontWeight: "bold", marginBottom: "4px" }}>📋 AI EVALUATION CONTRACT</div>
                  <div>• <strong>Output Schema:</strong> JSON {`{ corpus_status, topics, tone, humour_mechanisms, curator_note, confidence }`}</div>
                  <div>• <strong>Editorial Actions:</strong> keep | excluded | duplicate | review_later</div>
                  <div>• <strong>Quality Filter:</strong> Exclude aggregator watermarks (9GAG, iFunny, TikTok stamps). Preserve authentic meme captions.</div>
                  <div>• <strong>Active Model:</strong> {activeModel}</div>
                </div>
              )}

              <button
                type="button"
                onClick={onEnterOverride}
                style={{
                  background: "#181818",
                  color: "#888",
                  border: "1px dashed #444",
                  padding: "8px 14px",
                  fontSize: "12px",
                  cursor: "pointer",
                  marginTop: "6px"
                }}
              >
                🛠 Curator Emergency Override [Shift + O]
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onEnterOverride}
              style={{
                background: "#9b30ff",
                color: "#ffffff",
                border: "2px solid #f4c300",
                padding: "10px 20px",
                fontFamily: "Anton",
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "3px 3px 0px #f4c300"
              }}
            >
              OPEN MANUAL CURATION [O]
            </button>
          )}
        </div>
      )}

      {/* Action Buttons Row: Manual Override & FORCE REMOVE */}
      <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
        {isAiJudge ? (
          <button
            type="button"
            onClick={onTestEvaluate}
            disabled={isTesting}
            style={{
              flex: 1,
              background: "#1c2e36",
              color: "#00f0ff",
              border: "1px solid #00f0ff",
              padding: "12px",
              fontFamily: "Anton",
              fontSize: "15px",
              cursor: isTesting ? "wait" : "pointer",
              boxShadow: "2px 2px 0px #00f0ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <span>⚡</span>
            <span>{isTesting ? "EVALUATING..." : "AI EVALUATE [ENTER]"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnterOverride}
            style={{
              flex: 1,
              background: "#222222",
              color: "#f4c300",
              border: "1px solid #f4c300",
              padding: "12px",
              fontFamily: "Anton",
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "2px 2px 0px #f4c300",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <span>✏️</span>
            <span>MANUAL OVERRIDE [O]</span>
          </button>
        )}

        <button
          type="button"
          onClick={onForceRemove}
          style={{
            flex: 1,
            background: "#380d0d",
            color: "#FF3B30",
            border: "1px solid #FF3B30",
            padding: "12px",
            fontFamily: "Anton",
            fontSize: "15px",
            cursor: "pointer",
            boxShadow: "2px 2px 0px #FF3B30",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
          title="Permanently remove invalid non-meme from R2 and database [Key: Shift+Delete]"
        >
          <span>🗑️</span>
          <span>FORCE REMOVE [SHIFT+DEL]</span>
        </button>
      </div>
    </div>
  );
}
