import { useState, useEffect, useCallback } from "react";
import type { CatOverview, CatPaginatedMemes, CatUser } from "../catTypes";
import { catGetOverview, catGetMemesAnalytics, catConfirmCategory } from "../catApi";
import JudgeProgress from "./JudgeProgress";
import CategoryDistribution from "./CategoryDistribution";
import MemeComparisonTable from "./MemeComparisonTable";

interface SuperDashboardProps {
  token: string;
  user: CatUser;
  onLogout: () => void;
  onSwitchToJudgeMode: () => void;
}

export default function SuperDashboard({
  token,
  user,
  onLogout,
  onSwitchToJudgeMode
}: SuperDashboardProps) {
  const [overview, setOverview] = useState<CatOverview | null>(null);
  const [paginatedMemes, setPaginatedMemes] = useState<CatPaginatedMemes | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [ovData, memesData] = await Promise.all([
        catGetOverview(token),
        catGetMemesAnalytics(token, { page, per_page: 25, filter })
      ]);
      setOverview(ovData);
      setPaginatedMemes(memesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load superadmin analytics.");
    } finally {
      setLoading(false);
    }
  }, [token, page, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmCategory = async (memeId: string, finalCat: number) => {
    try {
      await catConfirmCategory(token, memeId, finalCat);
      loadData();
    } catch (err) {
      console.error("Confirmation error:", err);
    }
  };

  const completionPercent = overview && overview.total_memes > 0
    ? Math.min(100, Math.round((overview.resolved_memes / overview.total_memes) * 100))
    : 0;

  return (
    <div className="cat-root">
      {/* Top Header */}
      <header className="cat-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span className="cat-font-anton cat-text-gold" style={{ fontSize: "20px" }}>
            MEME CAPSULE — MASTER ANALYTICS
          </span>
          <span style={{ fontSize: "11px", background: "#dd0061", padding: "2px 8px", borderRadius: "2px", color: "#fff", fontWeight: "bold" }}>
            SUPERADMIN CONSOLE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            type="button"
            onClick={onSwitchToJudgeMode}
            style={{
              background: "#9b30ff",
              border: "1px solid #f4c300",
              color: "#fff",
              padding: "5px 12px",
              fontFamily: "Anton",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            SWITCH TO JUDGE INTERFACE ➔
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{
              background: "#262626",
              border: "1px solid #444",
              color: "#f4c300",
              padding: "5px 12px",
              fontFamily: "Oswald",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            {loading ? "REFRESHING..." : "REFRESH DATA"}
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{ background: "transparent", border: "none", color: "#dd0061", cursor: "pointer", fontSize: "12px", fontFamily: "Oswald" }}
          >
            LOG OUT ({user.display_name})
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <div className="cat-admin-container">
        {error && (
          <div style={{ background: "#331111", border: "1px solid #dd0061", color: "#ff8888", padding: "12px 16px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        {/* Section 1: Global Progress Card */}
        {overview && (
          <div className="cat-stat-card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="cat-font-anton cat-text-purple" style={{ fontSize: "20px" }}>
                OVERALL CONSENSUS COMPLETION
              </span>
              <span style={{ fontSize: "16px", fontFamily: "monospace", color: "#f4c300", fontWeight: "bold" }}>
                {overview.resolved_memes} / {overview.total_memes} MEMES ({completionPercent}%)
              </span>
            </div>

            {/* Thick Brutalist Progress Bar */}
            <div style={{ height: "16px", background: "#262626", border: "2px solid #9b30ff", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${completionPercent}%`,
                  background: "linear-gradient(90deg, #9b30ff 0%, #f4c300 100%)",
                  transition: "width 0.4s ease"
                }}
              />
            </div>
          </div>
        )}

        {/* Top Key Metrics Grid */}
        {overview && (
          <div className="cat-stat-grid">
            <div className="cat-stat-card">
              <div className="cat-text-muted" style={{ fontSize: "11px" }}>TOTAL DECISIONS</div>
              <div className="cat-font-anton" style={{ fontSize: "32px", color: "#fff" }}>
                {overview.total_decisions}
              </div>
            </div>

            <div className="cat-stat-card accent">
              <div className="cat-text-muted" style={{ fontSize: "11px" }}>DISAGREEMENT RATE</div>
              <div className="cat-font-anton" style={{ fontSize: "32px", color: overview.disagreement_rate > 20 ? "#dd0061" : "#34C759" }}>
                {overview.disagreement_rate}%
              </div>
            </div>

            <div className="cat-stat-card">
              <div className="cat-text-muted" style={{ fontSize: "11px" }}>FULLY JUDGED (ALL JUDGES)</div>
              <div className="cat-font-anton" style={{ fontSize: "32px", color: "#34C759" }}>
                {overview.fully_categorised}
              </div>
            </div>

            <div className="cat-stat-card">
              <div className="cat-text-muted" style={{ fontSize: "11px" }}>PENDING UNRESOLVED</div>
              <div className="cat-font-anton" style={{ fontSize: "32px", color: "#FF9F0A" }}>
                {overview.unresolved_memes}
              </div>
            </div>
          </div>
        )}

        {/* Section 2 & 3: Judge Progress & Category Distribution */}
        {overview && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
            <JudgeProgress judges={overview.judges} />
            <CategoryDistribution distribution={overview.category_distribution} />
          </div>
        )}

        {/* Section 4 & 5: Meme Comparison and Disagreement Table */}
        {paginatedMemes && (
          <div>
            <h3 className="cat-font-anton cat-text-gold" style={{ margin: "0 0 12px 0", fontSize: "20px" }}>
              MEME DECISIONS & DISAGREEMENT QUEUE
            </h3>
            <MemeComparisonTable
              memes={paginatedMemes.memes}
              page={page}
              totalPages={paginatedMemes.total_pages}
              filter={filter}
              onPageChange={(p) => setPage(p)}
              onFilterChange={(f) => {
                setFilter(f);
                setPage(1);
              }}
              onConfirmCategory={handleConfirmCategory}
            />
          </div>
        )}
      </div>
    </div>
  );
}
