import React, { useState } from "react";
import type { AiComparisonMeme, AiComparisonResponse } from "./aiApi";
import { getCategoryMeta } from "./categories";
import AiOverrideDrawer from "./AiOverrideDrawer";

interface AiComparisonProps {
  data: AiComparisonResponse | null;
  loading: boolean;
  error: string | null;
  currentFilter: string;
  currentPage: number;
  onFilterChange: (filter: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onOverride: (memeId: string, categoryId: number) => Promise<void>;
  isConfirmingOverride: boolean;
}

const FILTERS = [
  { key: "all", label: "ALL" },
  { key: "agree", label: "AGREE" },
  { key: "disagree", label: "DISAGREE" },
  { key: "low_confidence", label: "LOW CONFIDENCE" }
];

export default function AiComparison({
  data,
  loading,
  error,
  currentFilter,
  currentPage,
  onFilterChange,
  onPageChange,
  onRetry,
  onOverride,
  isConfirmingOverride
}: AiComparisonProps) {
  const [reviewingMeme, setReviewingMeme] = useState<AiComparisonMeme | null>(null);

  const handleConfirmOverride = async (memeId: string, categoryId: number) => {
    await onOverride(memeId, categoryId);
    setReviewingMeme(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Filter Pills at the Top */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap"
        }}
      >
        <span
          style={{
            fontFamily: "Oswald, sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--outline, #968e99)",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginRight: "4px"
          }}
        >
          FILTER:
        </span>
        {FILTERS.map((f) => {
          const isActive = currentFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className="brutalist-border-sm brutalist-interactive"
              style={{
                padding: "6px 14px",
                fontSize: "11px",
                fontFamily: "Oswald, sans-serif",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                backgroundColor: isActive ? "#f4c300" : "var(--surface, #1c1b1b)",
                color: isActive ? "#131313" : "var(--on-surface, #e5e2e1)",
                boxShadow: isActive ? "2px 2px 0px black" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {f.label}
            </button>
          );
        })}

        {data && (
          <div
            style={{
              marginLeft: "auto",
              fontFamily: "Oswald, sans-serif",
              fontSize: "12px",
              color: "var(--outline, #8e8e93)"
            }}
          >
            {data.total.toLocaleString()} MEME{data.total === 1 ? "" : "S"} FOUND
          </div>
        )}
      </div>

      {/* 2. Loading Skeleton */}
      {loading && !data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <style>{`
            @keyframes aiTablePulse {
              0% { opacity: 0.5; }
              50% { opacity: 1; }
              100% { opacity: 0.5; }
            }
          `}</style>
          {/* Header Skeleton */}
          <div
            style={{
              height: "40px",
              background: "#9b30ff",
              border: "2px solid black",
              opacity: 0.7
            }}
          />
          {/* Row Skeletons */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: "64px",
                background: "#2a2a2a",
                border: "1px solid #333",
                animation: "aiTablePulse 1.5s ease-in-out infinite"
              }}
            />
          ))}
        </div>
      )}

      {/* 3. Error Card */}
      {error && !data && (
        <div
          style={{
            border: "2px solid #dd0061",
            background: "var(--surface, #1c1b1b)",
            padding: "32px",
            boxShadow: "6px 6px 0px #dd0061",
            textAlign: "center",
            maxWidth: "600px",
            margin: "40px auto"
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display, 'Anton', sans-serif)",
              fontSize: "32px",
              color: "#dd0061",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "12px"
            }}
          >
            FAILED TO LOAD
          </div>
          <p
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "14px",
              color: "#e5e2e1",
              marginBottom: "24px"
            }}
          >
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="brutalist-border-sm brutalist-interactive"
            style={{
              padding: "8px 24px",
              background: "#f4c300",
              color: "#131313",
              fontFamily: "var(--font-display, 'Anton', sans-serif)",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            RETRY
          </button>
        </div>
      )}

      {/* 4. Comparison Table (Div-based Flex Layout) */}
      {data && (
        <div
          style={{
            border: "2px solid black",
            backgroundColor: "var(--surface, #1c1b1b)",
            boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
            overflowX: "auto"
          }}
        >
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#9b30ff",
              borderBottom: "2px solid black",
              padding: "10px 16px",
              minWidth: "760px"
            }}
          >
            <div style={{ width: "160px", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "11px", color: "#131313", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              MEME
            </div>
            <div style={{ width: "160px", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "11px", color: "#131313", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              AI DECISION
            </div>
            <div style={{ width: "140px", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "11px", color: "#131313", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              CONFIDENCE
            </div>
            <div style={{ width: "160px", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "11px", color: "#131313", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              HUMAN CONSENSUS
            </div>
            <div style={{ width: "110px", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "11px", color: "#131313", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              STATUS
            </div>
            <div style={{ flex: 1, textAlign: "right", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "11px", color: "#131313", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              ACTION
            </div>
          </div>

          {/* Empty State */}
          {data.memes.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--outline, #8e8e93)",
                fontFamily: "Oswald, sans-serif",
                fontSize: "14px"
              }}
            >
              No memes match this comparison filter.
            </div>
          ) : (
            /* Data Rows */
            data.memes.map((m) => {
              const aiMeta = getCategoryMeta(m.ai_category);
              const consensusMeta = getCategoryMeta(m.consensus_category);

              // Status calculation
              const hasAi = m.ai_category !== null && m.ai_category !== undefined;
              const hasConsensus = m.consensus_category !== null && m.consensus_category !== undefined;
              const isAgreed = hasAi && hasConsensus && String(m.ai_category) === String(m.consensus_category);

              // Confidence bar color
              const conf = m.ai_confidence ?? 0;
              const confColor = conf >= 0.7 ? "#34C759" : conf >= 0.5 ? "#FF9F0A" : "#FF3B30";

              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid #2a2a2a",
                    padding: "10px 16px",
                    minWidth: "760px",
                    transition: "background 0.1s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-container-high, #242424)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* MEME column: thumbnail 48x48 with 1px border #2a2a2a + truncated ID below */}
                  <div style={{ width: "160px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        border: "1px solid #2a2a2a",
                        backgroundColor: "#111",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0
                      }}
                    >
                      {m.image_url ? (
                        <img
                          src={m.image_url}
                          alt=""
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#555" }}>
                          image
                        </span>
                      )}
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontFamily: "Oswald, sans-serif",
                          fontSize: "11px",
                          color: "#8e8e93",
                          maxWidth: "96px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                        title={m.id}
                      >
                        {m.id}
                      </div>
                      {m.title && (
                        <div
                          style={{
                            fontFamily: "Oswald, sans-serif",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#e5e2e1",
                            maxWidth: "96px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                          title={m.title}
                        >
                          {m.title}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI DECISION column */}
                  <div style={{ width: "160px" }}>
                    {aiMeta ? (
                      <span
                        style={{
                          display: "inline-block",
                          backgroundColor: `${aiMeta.color}33`,
                          border: `1px solid ${aiMeta.color}`,
                          color: aiMeta.color,
                          padding: "3px 8px",
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
                      <span style={{ color: "#8e8e93", fontFamily: "Oswald", fontSize: "11px" }}>
                        Uncategorised
                      </span>
                    )}
                  </div>

                  {/* CONFIDENCE column: bar 60px wide + % beside it */}
                  <div style={{ width: "140px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "60px",
                        height: "7px",
                        backgroundColor: "#111",
                        border: "1px solid #333",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(conf * 100)}%`,
                          height: "100%",
                          backgroundColor: confColor,
                          transition: "width 0.2s ease"
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "Oswald, sans-serif",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: confColor
                      }}
                    >
                      {Math.round(conf * 100)}%
                    </span>
                  </div>

                  {/* HUMAN CONSENSUS column */}
                  <div style={{ width: "160px" }}>
                    {consensusMeta ? (
                      <span
                        style={{
                          display: "inline-block",
                          backgroundColor: `${consensusMeta.color}33`,
                          border: `1px solid ${consensusMeta.color}`,
                          color: consensusMeta.color,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontFamily: "Oswald, sans-serif",
                          fontWeight: 700,
                          fontSize: "12px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}
                      >
                        {consensusMeta.label}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          backgroundColor: "rgba(142, 142, 147, 0.2)",
                          border: "1px solid #8e8e93",
                          color: "#8e8e93",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontFamily: "Oswald, sans-serif",
                          fontWeight: 700,
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}
                      >
                        NO CONSENSUS
                      </span>
                    )}
                  </div>

                  {/* STATUS column: AGREE (green) or DISAGREE (pink) */}
                  <div style={{ width: "110px" }}>
                    {hasConsensus ? (
                      isAgreed ? (
                        <span
                          style={{
                            fontFamily: "Oswald, sans-serif",
                            fontWeight: 700,
                            fontSize: "12px",
                            color: "#34C759",
                            textTransform: "uppercase"
                          }}
                        >
                          AGREE
                        </span>
                      ) : (
                        <span
                          style={{
                            fontFamily: "Oswald, sans-serif",
                            fontWeight: 700,
                            fontSize: "12px",
                            color: "#dd0061",
                            textTransform: "uppercase"
                          }}
                        >
                          DISAGREE
                        </span>
                      )
                    ) : (
                      <span
                        style={{
                          fontFamily: "Oswald, sans-serif",
                          fontWeight: 600,
                          fontSize: "11px",
                          color: "#8e8e93",
                          textTransform: "uppercase"
                        }}
                      >
                        PENDING
                      </span>
                    )}
                  </div>

                  {/* ACTION column: small REVIEW button */}
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => setReviewingMeme(m)}
                      className="brutalist-border-sm brutalist-interactive"
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontFamily: "Oswald, sans-serif",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        backgroundColor: "var(--surface-container, #201f1f)",
                        color: "var(--primary, #dcb8ff)",
                        border: "1px solid var(--primary, #dcb8ff)",
                        cursor: "pointer"
                      }}
                    >
                      REVIEW
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. Pagination Controls at the Bottom */}
      {data && data.total_pages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "var(--surface-container, #201f1f)",
            border: "2px solid black"
          }}
        >
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="brutalist-border-sm brutalist-interactive"
            style={{
              padding: "6px 16px",
              fontFamily: "Oswald, sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              backgroundColor: currentPage <= 1 ? "var(--surface-container-lowest, #0e0e0e)" : "var(--surface, #1c1b1b)",
              color: "var(--on-surface, #e5e2e1)",
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              opacity: currentPage <= 1 ? 0.4 : 1
            }}
          >
            ◀ PREV
          </button>

          <span
            style={{
              fontFamily: "Oswald, sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              color: "#f4c300"
            }}
          >
            PAGE {currentPage} OF {data.total_pages}
          </span>

          <button
            type="button"
            disabled={currentPage >= data.total_pages}
            onClick={() => onPageChange(currentPage + 1)}
            className="brutalist-border-sm brutalist-interactive"
            style={{
              padding: "6px 16px",
              fontFamily: "Oswald, sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              backgroundColor: currentPage >= data.total_pages ? "var(--surface-container-lowest, #0e0e0e)" : "var(--surface, #1c1b1b)",
              color: "var(--on-surface, #e5e2e1)",
              cursor: currentPage >= data.total_pages ? "not-allowed" : "pointer",
              opacity: currentPage >= data.total_pages ? 0.4 : 1
            }}
          >
            NEXT ▶
          </button>
        </div>
      )}

      {/* 6. Override Drawer */}
      <AiOverrideDrawer
        meme={reviewingMeme}
        isOpen={Boolean(reviewingMeme)}
        isConfirming={isConfirmingOverride}
        onClose={() => setReviewingMeme(null)}
        onConfirm={handleConfirmOverride}
      />
    </div>
  );
}
