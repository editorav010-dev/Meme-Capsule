import React, { useEffect, useState, useCallback } from "react";
import {
  fetchAiStats,
  fetchAiComparison,
  overrideAiDecision,
  type AiStatsResponse,
  type AiComparisonResponse
} from "./aiApi";
import AiOverview from "./AiOverview";
import AiComparison from "./AiComparison";

interface AiTabProps {
  adminToken: string;
}

export default function AiTab({ adminToken }: AiTabProps) {
  const [subView, setSubView] = useState<"overview" | "comparison">("overview");

  // Overview state
  const [stats, setStats] = useState<AiStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Comparison state
  const [comparisonData, setComparisonData] = useState<AiComparisonResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonFilter, setComparisonFilter] = useState("all");
  const [comparisonPage, setComparisonPage] = useState(1);
  const [isConfirmingOverride, setIsConfirmingOverride] = useState(false);

  // Fetch Stats
  const loadStats = useCallback(async () => {
    if (!adminToken) {
      setStatsError("Admin API token is required to view AI stats.");
      return;
    }
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetchAiStats(adminToken);
      setStats(res);
      setLastUpdated(new Date());
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Failed to load AI statistics.");
    } finally {
      setStatsLoading(false);
    }
  }, [adminToken]);

  // Fetch Comparison
  const loadComparison = useCallback(
    async (filter = comparisonFilter, page = comparisonPage) => {
      if (!adminToken) {
        setComparisonError("Admin API token is required to view AI comparison.");
        return;
      }
      setComparisonLoading(true);
      setComparisonError(null);
      try {
        const res = await fetchAiComparison(adminToken, filter, page, 50);
        setComparisonData(res);
      } catch (err) {
        setComparisonError(err instanceof Error ? err.message : "Failed to load AI comparison.");
      } finally {
        setComparisonLoading(false);
      }
    },
    [adminToken, comparisonFilter, comparisonPage]
  );

  // Initial load
  useEffect(() => {
    if (adminToken) {
      loadStats();
    }
  }, [adminToken, loadStats]);

  // Load comparison when switching to comparison tab if not loaded
  useEffect(() => {
    if (subView === "comparison" && !comparisonData && adminToken) {
      loadComparison();
    }
  }, [subView, comparisonData, adminToken, loadComparison]);

  const handleFilterChange = (filter: string) => {
    setComparisonFilter(filter);
    setComparisonPage(1);
    loadComparison(filter, 1);
  };

  const handlePageChange = (page: number) => {
    setComparisonPage(page);
    loadComparison(comparisonFilter, page);
  };

  const handleRefresh = () => {
    if (subView === "overview") {
      loadStats();
    } else {
      loadComparison(comparisonFilter, comparisonPage);
      loadStats(); // also refresh stats in background
    }
  };

  // Optimistic override handler
  const handleOverride = async (memeId: string, categoryId: number) => {
    setIsConfirmingOverride(true);
    try {
      await overrideAiDecision(adminToken, memeId, categoryId);

      // Optimistically update row in table
      if (comparisonData) {
        setComparisonData({
          ...comparisonData,
          memes: comparisonData.memes.map((m) =>
            m.id === memeId
              ? {
                  ...m,
                  ai_category: categoryId,
                  ai_confidence: 1.0,
                  ai_reasoning: "Manually confirmed/overridden by superadmin",
                  consensus_category: categoryId,
                  final_category: categoryId
                }
              : m
          )
        });
      }

      // Refresh overview stats silently in background
      loadStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to override category.");
      throw err;
    } finally {
      setIsConfirmingOverride(false);
    }
  };

  const isRefreshing = subView === "overview" ? statsLoading : comparisonLoading;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "24px 32px",
        gap: "24px"
      }}
    >
      {/* Top Header Strip: Sub-view pills & REFRESH button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "2px solid #2a2a2a",
          paddingBottom: "16px"
        }}
      >
        {/* Switchable Pill Buttons: OVERVIEW & COMPARISON */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setSubView("overview")}
            className="brutalist-border-sm brutalist-interactive"
            style={{
              padding: "6px 16px",
              fontFamily: "Oswald, sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              backgroundColor: subView === "overview" ? "#f4c300" : "var(--surface, #1c1b1b)",
              color: subView === "overview" ? "#131313" : "var(--on-surface, #e5e2e1)",
              boxShadow: subView === "overview" ? "3px 3px 0px black" : "none",
              cursor: "pointer"
            }}
          >
            OVERVIEW
          </button>
          <button
            type="button"
            onClick={() => setSubView("comparison")}
            className="brutalist-border-sm brutalist-interactive"
            style={{
              padding: "6px 16px",
              fontFamily: "Oswald, sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              backgroundColor: subView === "comparison" ? "#f4c300" : "var(--surface, #1c1b1b)",
              color: subView === "comparison" ? "#131313" : "var(--on-surface, #e5e2e1)",
              boxShadow: subView === "comparison" ? "3px 3px 0px black" : "none",
              cursor: "pointer"
            }}
          >
            COMPARISON
          </button>
        </div>

        {/* REFRESH button in secondary button style */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="brutalist-border-sm brutalist-interactive"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "var(--surface, #1c1b1b)",
            color: "var(--secondary, #ffe08b)",
            border: "2px solid black",
            boxShadow: "3px 3px 0px black",
            fontFamily: "Oswald, sans-serif",
            fontWeight: 700,
            fontSize: "12px",
            textTransform: "uppercase",
            cursor: isRefreshing ? "wait" : "pointer",
            opacity: isRefreshing ? 0.7 : 1
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "16px",
              animation: isRefreshing ? "spin 1s linear infinite" : "none"
            }}
          >
            refresh
          </span>
          {isRefreshing ? "REFRESHING..." : "REFRESH"}
        </button>
      </div>

      {/* Main Sub-view Content */}
      <div style={{ flex: 1 }}>
        {subView === "overview" ? (
          <AiOverview
            stats={stats}
            loading={statsLoading}
            error={statsError}
            lastUpdated={lastUpdated}
            onRetry={loadStats}
          />
        ) : (
          <AiComparison
            data={comparisonData}
            loading={comparisonLoading}
            error={comparisonError}
            currentFilter={comparisonFilter}
            currentPage={comparisonPage}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onRetry={() => loadComparison(comparisonFilter, comparisonPage)}
            onOverride={handleOverride}
            isConfirmingOverride={isConfirmingOverride}
          />
        )}
      </div>
    </div>
  );
}
