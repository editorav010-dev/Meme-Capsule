import React from "react";
import type { AiStatsResponse } from "./aiApi";
import { MEME_CATEGORIES } from "./categories";

interface AiOverviewProps {
  stats: AiStatsResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRetry: () => void;
}

export default function AiOverview({
  stats,
  loading,
  error,
  lastUpdated,
  onRetry
}: AiOverviewProps) {
  if (loading && !stats) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <style>{`
          @keyframes aiPulseShimmer {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}</style>
        {/* Progress skeleton */}
        <div
          style={{
            height: "180px",
            background: "#2a2a2a",
            border: "2px solid #333",
            animation: "aiPulseShimmer 1.5s ease-in-out infinite"
          }}
        />
        {/* Category grid skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px"
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div
              key={n}
              style={{
                height: "130px",
                background: "#2a2a2a",
                border: "2px solid #333",
                animation: "aiPulseShimmer 1.5s ease-in-out infinite"
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
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
    );
  }

  if (!stats) return null;

  const total = stats.total_memes;
  const categorised = stats.total_ai_categorised;
  const percentComplete = stats.percent_complete;
  const avgConfidence = stats.avg_confidence;
  const lowConfCount = stats.low_confidence_count;
  const uncategorised = stats.total_uncategorised;

  // Build counts per category from the distribution
  const countsByCat: Record<number, { count: number; avg_conf: number }> = {};
  for (const item of stats.category_distribution || []) {
    const catNum = Number(item.ai_category);
    if (!isNaN(catNum)) {
      countsByCat[catNum] = {
        count: item.count,
        avg_conf: item.avg_confidence
      };
    }
  }

  // Find max count to scale the proportion bars
  const maxCategoryCount = Math.max(
    ...MEME_CATEGORIES.map((c) => countsByCat[c.id]?.count || 0),
    1
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 1. Full-width Progress Card */}
      <section
        style={{
          border: "2px solid #9b30ff",
          backgroundColor: "var(--surface, #1c1b1b)",
          boxShadow: "4px 4px 0px #f4c300",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--outline, #968e99)",
                marginBottom: "4px"
              }}
            >
              AI CATEGORISATION PROGRESS
            </div>
            <div
              style={{
                fontFamily: "var(--font-display, 'Anton', sans-serif)",
                fontSize: "3rem",
                lineHeight: 1,
                color: "#f4c300",
                letterSpacing: "0.5px"
              }}
            >
              {categorised.toLocaleString()} / {total.toLocaleString()}
              <span
                style={{
                  fontSize: "1.5rem",
                  color: "#e5e2e1",
                  marginLeft: "12px",
                  fontWeight: 400
                }}
              >
                MEMES CATEGORISED
              </span>
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--font-display, 'Anton', sans-serif)",
              fontSize: "2.2rem",
              color: "#9b30ff"
            }}
          >
            {percentComplete}%
          </div>
        </div>

        {/* Thick Brutalist Progress Bar */}
        <div
          style={{
            width: "100%",
            height: "20px",
            backgroundColor: "#111111",
            border: "2px solid black",
            overflow: "hidden",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)"
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, percentComplete))}%`,
              height: "100%",
              backgroundColor: "#9b30ff",
              transition: "width 0.4s ease-out"
            }}
          />
        </div>

        {/* Small stats below */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            paddingTop: "12px",
            borderTop: "1px solid #2a2a2a"
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--outline, #968e99)",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Average Confidence
            </div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: avgConfidence >= 0.7 ? "#34C759" : avgConfidence >= 0.5 ? "#f4c300" : "#dd0061"
              }}
            >
              {avgConfidence > 0 ? `${Math.round(avgConfidence * 100)}%` : "N/A"}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--outline, #968e99)",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Low Confidence (&lt;60%)
            </div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: lowConfCount > 0 ? "#FF9F0A" : "#34C759"
              }}
            >
              {lowConfCount.toLocaleString()}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--outline, #968e99)",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Uncategorised Remaining
            </div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: "#e5e2e1"
              }}
            >
              {uncategorised.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Seven Category Cards Grid */}
      <section>
        <div
          style={{
            fontFamily: "var(--font-display, 'Anton', sans-serif)",
            fontSize: "18px",
            color: "var(--on-surface, #e5e2e1)",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: "16px"
          }}
        >
          Category Distribution
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px"
          }}
        >
          {MEME_CATEGORIES.map((cat) => {
            const data = countsByCat[cat.id];
            const count = data?.count || 0;
            const proportion = Math.round((count / maxCategoryCount) * 100);

            return (
              <div
                key={cat.id}
                className="brutalist-interactive"
                style={{
                  backgroundColor: "var(--surface, #1c1b1b)",
                  border: `2px solid ${cat.color}`,
                  boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  position: "relative"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display, 'Anton', sans-serif)",
                      fontSize: "20px",
                      color: cat.color,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase"
                    }}
                  >
                    {cat.label}
                  </span>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: cat.color,
                      boxShadow: `0 0 6px ${cat.color}`
                    }}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display, 'Anton', sans-serif)",
                      fontSize: "32px",
                      lineHeight: 1,
                      color: "#ffffff"
                    }}
                  >
                    {count.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "11px",
                      color: "#8e8e93",
                      marginTop: "2px"
                    }}
                  >
                    {total > 0 ? `${Math.round((count / total) * 100)}% of total` : "0%"}
                  </div>
                </div>

                {/* Proportion relative to highest category */}
                <div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      backgroundColor: "#111111",
                      border: "1px solid #2a2a2a",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        width: `${proportion}%`,
                        height: "100%",
                        backgroundColor: cat.color,
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Last Updated Timestamp */}
      <div
        style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: "11px",
          color: "var(--outline, #8e8e93)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          paddingTop: "8px"
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
          schedule
        </span>
        <span>
          Last updated:{" "}
          {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
        </span>
      </div>
    </div>
  );
}
