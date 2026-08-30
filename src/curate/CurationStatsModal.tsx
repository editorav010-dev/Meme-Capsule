import { useEffect, useState } from "react";
import { fetchCurationStats, getExportUrl } from "./curateApi";
import type { CurationStatsResponse } from "./curateTypes";

interface CurationStatsModalProps {
  onClose: () => void;
}

export default function CurationStatsModal({ onClose }: CurationStatsModalProps) {
  const [stats, setStats] = useState<CurationStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchCurationStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#1c1b1b",
          border: "2px solid #9b30ff",
          boxShadow: "6px 6px 0px #f4c300",
          maxWidth: "840px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "28px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "12px" }}>
          <div>
            <h2 className="curate-anton" style={{ margin: 0, fontSize: "24px", color: "#f4c300" }}>
              CORPUS CURATION STATISTICS
            </h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#888" }}>
              DISTRIBUTION ACROSS 4,485 RAW MEMES
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#FF3B30", fontSize: "18px", cursor: "pointer", fontFamily: "Anton" }}
          >
            ✕ CLOSE
          </button>
        </div>

        {loading || !stats ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            CALCULATING CORPUS STATS...
          </div>
        ) : (
          <div>
            {/* Top KPI Counts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "24px" }}>
              <div style={{ background: "#242424", padding: "10px 14px", border: "1px solid #444" }}>
                <div style={{ fontSize: "10px", color: "#888" }}>TOTAL CORPUS</div>
                <div className="curate-anton" style={{ fontSize: "22px", color: "#fff" }}>{stats.counts.total}</div>
              </div>
              <div style={{ background: "#242424", padding: "10px 14px", border: "1px solid #34C759" }}>
                <div style={{ fontSize: "10px", color: "#34C759" }}>KEPT ACTIVE</div>
                <div className="curate-anton" style={{ fontSize: "22px", color: "#34C759" }}>{stats.counts.kept}</div>
              </div>
              <div style={{ background: "#242424", padding: "10px 14px", border: "1px solid #FF3B30" }}>
                <div style={{ fontSize: "10px", color: "#FF3B30" }}>EXCLUDED</div>
                <div className="curate-anton" style={{ fontSize: "22px", color: "#FF3B30" }}>{stats.counts.excluded}</div>
              </div>
              <div style={{ background: "#242424", padding: "10px 14px", border: "1px solid #FF9F0A" }}>
                <div style={{ fontSize: "10px", color: "#FF9F0A" }}>DUPLICATES</div>
                <div className="curate-anton" style={{ fontSize: "22px", color: "#FF9F0A" }}>{stats.counts.duplicates}</div>
              </div>
              <div style={{ background: "#242424", padding: "10px 14px", border: "1px solid #f4c300" }}>
                <div style={{ fontSize: "10px", color: "#f4c300" }}>REVIEW LATER</div>
                <div className="curate-anton" style={{ fontSize: "22px", color: "#f4c300" }}>{stats.counts.review_later}</div>
              </div>
            </div>

            {/* Topic Distribution */}
            <div style={{ marginBottom: "20px" }}>
              <h3 className="curate-anton" style={{ fontSize: "16px", color: "#9b30ff", margin: "0 0 10px 0" }}>
                TOPIC BREAKDOWN
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {stats.distributions.topics.map((t) => (
                  <div key={t.topic} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                    <span style={{ width: "130px" }}>{t.topic}</span>
                    <div style={{ flex: 1, height: "12px", background: "#262626" }}>
                      <div style={{ width: `${t.percent}%`, height: "100%", background: "#9b30ff" }} />
                    </div>
                    <span style={{ width: "60px", textAlign: "right", fontFamily: "monospace" }}>{t.count} ({t.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tone Distribution */}
            <div style={{ marginBottom: "20px" }}>
              <h3 className="curate-anton" style={{ fontSize: "16px", color: "#f4c300", margin: "0 0 10px 0" }}>
                DOMINANT TONE BREAKDOWN
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {stats.distributions.tones.map((t) => (
                  <div key={t.tone} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                    <span style={{ width: "130px" }}>{t.tone}</span>
                    <div style={{ flex: 1, height: "12px", background: "#262626" }}>
                      <div style={{ width: `${t.percent}%`, height: "100%", background: "#f4c300" }} />
                    </div>
                    <span style={{ width: "60px", textAlign: "right", fontFamily: "monospace" }}>{t.count} ({t.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #333", paddingTop: "16px", marginTop: "24px" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>
                EXPORT FULL CURATED METADATA:
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <a
                  href={getExportUrl("csv")}
                  download="meme_capsule_curated.csv"
                  style={{
                    background: "#262626",
                    border: "1px solid #34C759",
                    color: "#34C759",
                    padding: "8px 14px",
                    fontFamily: "Anton",
                    fontSize: "13px",
                    textDecoration: "none"
                  }}
                >
                  ↓ EXPORT CSV
                </a>
                <a
                  href={getExportUrl("json")}
                  download="meme_capsule_curated.json"
                  style={{
                    background: "#262626",
                    border: "1px solid #9b30ff",
                    color: "#9b30ff",
                    padding: "8px 14px",
                    fontFamily: "Anton",
                    fontSize: "13px",
                    textDecoration: "none"
                  }}
                >
                  ↓ EXPORT JSON
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
