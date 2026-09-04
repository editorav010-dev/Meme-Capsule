import { useState, useEffect, useCallback } from "react";
import {
  fetchSuperSummary,
  fetchSuperMemes,
  bulkResolveSuper,
  getSuperExportUrl,
  type SuperSummaryResponse,
  type SuperMemeItem
} from "./curateSuperApi";
import CuratorComparisonTable from "./CuratorComparisonTable";

interface CurateSuperDashboardProps {
  onSwitchToJudgeMode: () => void;
  onLogout: () => void;
}

export default function CurateSuperDashboard({
  onSwitchToJudgeMode,
  onLogout
}: CurateSuperDashboardProps) {
  const [summary, setSummary] = useState<SuperSummaryResponse | null>(null);
  const [memes, setMemes] = useState<SuperMemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [batchLoading, setBatchLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, memesRes] = await Promise.all([
        fetchSuperSummary(),
        fetchSuperMemes(filter, page, 20, search)
      ]);
      setSummary(sumRes);
      setMemes(memesRes.memes);
      setTotalPages(memesRes.total_pages);
      setTotalCount(memesRes.total);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error loading superadmin dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBulkResolve = async (action: string) => {
    if (!confirm(`Are you sure you want to batch-resolve all ${action.replace("_", " ")} memes?`)) {
      return;
    }
    setBatchLoading(true);
    try {
      const res = await bulkResolveSuper(action);
      alert(res.message);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk resolve failed");
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="curate-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <header className="curate-topbar" style={{ borderColor: "#f4c300" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span className="curate-anton" style={{ fontSize: "20px", color: "#f4c300" }}>
            🛡️ CURATOR SUPER ADMIN COMMAND CENTER
          </span>
          <span style={{ fontSize: "11px", background: "#262626", padding: "3px 8px", borderRadius: "2px", color: "#34C759", fontFamily: "monospace" }}>
            {summary ? `${summary.resolved_count} / ${summary.total_memes} FINAL RESOLVED (${summary.percent_resolved}%)` : "LOADING..."}
          </span>
          {lastRefreshed && (
            <span style={{ fontSize: "10px", color: "#888", fontFamily: "monospace" }}>
              SYNCED: {lastRefreshed}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{
              background: "#1c1b1b",
              color: "#f4c300",
              border: "1px solid #f4c300",
              padding: "6px 14px",
              fontFamily: "Anton",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span style={{ display: "inline-block", transform: loading ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}>🔄</span>
            {loading ? "REFRESHING..." : "REFRESH DATA"}
          </button>

          <button
            type="button"
            onClick={onSwitchToJudgeMode}
            style={{
              background: "#9b30ff",
              color: "#ffffff",
              border: "1px solid #f4c300",
              padding: "6px 14px",
              fontFamily: "Anton",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            ⚡ QUICK JUDGE MODE
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: "transparent",
              border: "none",
              color: "#FF3B30",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "Oswald",
              letterSpacing: "0.5px"
            }}
          >
            LOG OUT
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "24px", width: "100%", flex: 1 }}>
        {/* KPI Cards Strip */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <div style={{ background: "#1c1b1b", border: "1px solid #444", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#888" }}>TOTAL CORPUS</div>
              <div className="curate-anton" style={{ fontSize: "26px", color: "#fff" }}>{summary.total_memes}</div>
            </div>

            <div style={{ background: "#1c1b1b", border: "1px solid #34C759", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#34C759" }}>AUTHORITATIVE RESOLVED</div>
              <div className="curate-anton" style={{ fontSize: "26px", color: "#34C759" }}>{summary.resolved_count}</div>
            </div>

            <div style={{ background: "#1c1b1b", border: "1px solid #FF9F0A", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#FF9F0A" }}>CONFLICTING / SPLIT</div>
              <div className="curate-anton" style={{ fontSize: "26px", color: "#FF9F0A" }}>
                {summary.consensus_metrics.conflicts}
              </div>
            </div>

            <div style={{ background: "#1c1b1b", border: "1px solid #9b30ff", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#9b30ff" }}>UNANIMOUS KEEP</div>
              <div className="curate-anton" style={{ fontSize: "26px", color: "#9b30ff" }}>
                {summary.consensus_metrics.unanimous_keep}
              </div>
            </div>

            <div style={{ background: "#1c1b1b", border: "1px solid #FF3B30", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#FF3B30" }}>UNANIMOUS EXCLUDE</div>
              <div className="curate-anton" style={{ fontSize: "26px", color: "#FF3B30" }}>
                {summary.consensus_metrics.unanimous_exclude}
              </div>
            </div>
          </div>
        )}

        {/* Judges Performance Strip */}
        {summary && (summary.judges.length > 0 || summary.ai_judge.total_reviewed > 0) && (
          <div style={{ background: "#181818", border: "1px solid #333", padding: "16px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 className="curate-anton" style={{ margin: 0, fontSize: "16px", color: "#f4c300" }}>
                CURATOR / JUDGES LIVE PROGRESS ({summary.judges.length} ACTIVE + AI)
              </h3>
              <button
                type="button"
                onClick={loadData}
                style={{ background: "transparent", border: "none", color: "#f4c300", cursor: "pointer", fontSize: "12px", fontFamily: "Oswald" }}
              >
                🔄 Update Counts
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              {summary.judges.map((j) => (
                <div key={j.user_id} style={{ background: "#222", border: "1px solid #3d3d3d", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ color: "#fff", fontSize: "14px" }}>{j.user_name}</strong>
                    <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#f4c300" }}>{j.total_reviewed} reviewed</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#aaa" }}>
                    <span style={{ color: "#34C759" }}>{j.kept} Kept</span>
                    <span>•</span>
                    <span style={{ color: "#FF3B30" }}>{j.excluded} Excl</span>
                    <span>•</span>
                    <span style={{ color: "#FF9F0A" }}>{j.duplicates} Dup</span>
                    <span>•</span>
                    <span style={{ color: "#f4c300" }}>{j.review_later} Later</span>
                  </div>
                </div>
              ))}
              <div style={{ background: "#222", border: "1px solid #6f4b8f", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ color: "#c58cff", fontSize: "14px" }}>AI Judge</strong>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#f4c300" }}>
                    {summary.ai_judge.total_reviewed} judged
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#aaa" }}>
                  <span style={{ color: "#34C759" }}>{summary.ai_judge.kept} Keep</span>
                  <span>•</span>
                  <span style={{ color: "#FF3B30" }}>{summary.ai_judge.excluded} Excl</span>
                  <span>•</span>
                  <span style={{ color: "#FF9F0A" }}>{summary.ai_judge.duplicates} Dup</span>
                  <span>•</span>
                  <span style={{ color: "#f4c300" }}>{summary.ai_judge.review_later} Later</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action & Filter Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          {/* Filters & Search */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              style={{
                background: "#222",
                border: "1px solid #9b30ff",
                color: "#f4c300",
                padding: "8px 12px",
                fontFamily: "Oswald",
                fontSize: "13px",
                outline: "none"
              }}
            >
              <option value="all">All Memes ({totalCount})</option>
              <option value="unresolved">Pending Superadmin Resolution</option>
              <option value="resolved">✓ Authoritatively Resolved</option>
            </select>

            <input
              type="text"
              placeholder="Search Meme ID or Title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                background: "#222",
                border: "1px solid #444",
                color: "#fff",
                padding: "8px 12px",
                fontSize: "13px",
                fontFamily: "Oswald",
                outline: "none",
                width: "240px"
              }}
            />

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              style={{
                background: "#333",
                border: "1px solid #666",
                color: "#fff",
                padding: "8px 14px",
                fontSize: "12px",
                fontFamily: "Anton",
                cursor: "pointer"
              }}
            >
              {loading ? "LOADING..." : "🔄 RELOAD"}
            </button>
          </div>

          {/* Batch Actions & Exports */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => handleBulkResolve("unanimous_keep")}
              disabled={batchLoading}
              style={{
                background: "#222",
                border: "1px solid #34C759",
                color: "#34C759",
                padding: "6px 12px",
                fontFamily: "Anton",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              ⚡ AUTO-RESOLVE ALL UNANIMOUS KEEP
            </button>

            <button
              type="button"
              onClick={() => handleBulkResolve("unanimous_exclude")}
              disabled={batchLoading}
              style={{
                background: "#222",
                border: "1px solid #FF3B30",
                color: "#FF3B30",
                padding: "6px 12px",
                fontFamily: "Anton",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              ⚡ AUTO-RESOLVE ALL UNANIMOUS EXCLUDE
            </button>

            <a
              href={getSuperExportUrl("final", "csv")}
              download="meme_capsule_curated_final.csv"
              style={{
                background: "#9b30ff",
                color: "#fff",
                border: "1px solid #f4c300",
                padding: "6px 12px",
                fontFamily: "Anton",
                fontSize: "12px",
                textDecoration: "none"
              }}
            >
              ↓ EXPORT FINAL DATASET (CSV)
            </a>
          </div>
        </div>

        {/* Meme Comparison Data Table */}
        <CuratorComparisonTable
          memes={memes}
          loading={loading}
          onRefresh={loadData}
        />

        {/* Pagination Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", color: "#888", fontSize: "12px" }}>
          <div>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total memes)
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ background: "#222", border: "1px solid #444", color: "#fff", padding: "6px 12px", cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >
              ← PREVIOUS
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ background: "#222", border: "1px solid #444", color: "#fff", padding: "6px 12px", cursor: page >= totalPages ? "not-allowed" : "pointer" }}
            >
              NEXT →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
