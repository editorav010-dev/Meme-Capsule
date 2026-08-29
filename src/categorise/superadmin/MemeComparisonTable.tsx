import { useState } from "react";
import { MEME_CATEGORIES, type CatMemeComparisonItem } from "../catTypes";

interface MemeComparisonTableProps {
  memes: CatMemeComparisonItem[];
  page: number;
  totalPages: number;
  filter: string;
  onPageChange: (newPage: number) => void;
  onFilterChange: (newFilter: string) => void;
  onConfirmCategory: (memeId: string, finalCategory: number) => Promise<void>;
}

export default function MemeComparisonTable({
  memes,
  page,
  totalPages,
  filter,
  onPageChange,
  onFilterChange,
  onConfirmCategory
}: MemeComparisonTableProps) {
  const [selectedMeme, setSelectedMeme] = useState<CatMemeComparisonItem | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const getCategoryMeta = (catId: number | null) => {
    if (!catId) return null;
    return MEME_CATEGORIES.find((c) => c.id === catId);
  };

  const handleConfirm = async (memeId: string, catId: number) => {
    setConfirmingId(memeId);
    try {
      await onConfirmCategory(memeId, catId);
      if (selectedMeme && selectedMeme.meme_id === memeId) {
        setSelectedMeme((prev) => prev ? { ...prev, final_category: catId, is_resolved: true } : null);
      }
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div>
      {/* Filters Strip */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { key: "all", label: "ALL MEMES" },
            { key: "disagreement", label: "⚠️ DISAGREEMENTS" },
            { key: "unresolved", label: "⏳ UNRESOLVED" },
            { key: "resolved", label: "✓ RESOLVED" }
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              style={{
                background: filter === f.key ? "#9b30ff" : "#1c1b1b",
                color: filter === f.key ? "#fff" : "#8e8e93",
                border: "2px solid",
                borderColor: filter === f.key ? "#f4c300" : "#333",
                padding: "6px 12px",
                fontFamily: "Anton",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#8e8e93" }}>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            style={{ background: "#222", border: "1px solid #444", color: "#fff", padding: "4px 10px", cursor: "pointer", opacity: page <= 1 ? 0.3 : 1 }}
          >
            ← PREV
          </button>
          <span>PAGE {page} OF {totalPages || 1}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            style={{ background: "#222", border: "1px solid #444", color: "#fff", padding: "4px 10px", cursor: "pointer", opacity: page >= totalPages ? 0.3 : 1 }}
          >
            NEXT →
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="cat-table-wrap">
        <table className="cat-table">
          <thead>
            <tr>
              <th style={{ width: "80px" }}>PREVIEW</th>
              <th>MEME ID & TITLE</th>
              <th>JUDGE VOTES</th>
              <th>CONSENSUS</th>
              <th>CONFIDENCE</th>
              <th style={{ textAlign: "right" }}>CONFIRM CATEGORY</th>
            </tr>
          </thead>
          <tbody>
            {memes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#666" }}>
                  NO MEMES MATCHING FILTER
                </td>
              </tr>
            ) : (
              memes.map((m) => {
                const consensusMeta = getCategoryMeta(m.final_category || m.consensus_category);
                const hasDisagreement = m.decisions.length >= 2 && m.confidence_score <= 0.5 && !m.final_category;

                return (
                  <tr key={m.meme_id}>
                    {/* Thumbnail */}
                    <td>
                      <div
                        onClick={() => setSelectedMeme(m)}
                        style={{ width: "52px", height: "52px", background: "#111", border: "1px solid #444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
                      >
                        {m.image_url ? (
                          <img src={m.image_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "10px", color: "#666" }}>N/A</span>
                        )}
                      </div>
                    </td>

                    {/* Meme Info */}
                    <td>
                      <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#8e8e93" }}>
                        {m.meme_id}
                      </div>
                      <div style={{ fontWeight: 500, color: "#fff", maxWidth: "240px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.title}
                      </div>
                    </td>

                    {/* Judge Votes */}
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {m.decisions.length === 0 ? (
                          <span style={{ fontSize: "11px", color: "#666" }}>No votes yet</span>
                        ) : (
                          m.decisions.map((d) => {
                            const catMeta = getCategoryMeta(d.category_id);
                            return (
                              <span
                                key={d.user_id}
                                className="cat-pill"
                                style={{
                                  background: d.skipped ? "#333" : (catMeta?.color || "#9b30ff"),
                                  color: "#fff",
                                  border: "1px solid rgba(255,255,255,0.2)"
                                }}
                                title={`${d.display_name}: ${d.skipped ? "Skipped" : catMeta?.label}`}
                              >
                                {d.display_name.split(" ")[0]}: {d.skipped ? "SKIP" : (catMeta?.label || "None")}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>

                    {/* Consensus */}
                    <td>
                      {consensusMeta ? (
                        <span
                          className="cat-pill"
                          style={{ background: consensusMeta.color, color: "#fff" }}
                        >
                          {consensusMeta.label} {m.final_category ? "★" : ""}
                        </span>
                      ) : hasDisagreement ? (
                        <span className="cat-pill" style={{ background: "#dd0061", color: "#fff" }}>
                          DISAGREEMENT
                        </span>
                      ) : (
                        <span style={{ color: "#666", fontSize: "12px" }}>Pending</span>
                      )}
                    </td>

                    {/* Confidence Score */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "50px", height: "6px", background: "#333" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.round(m.confidence_score * 100)}%`,
                              background: m.confidence_score > 0.5 ? "#34C759" : "#FF9F0A"
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#8e8e93" }}>
                          {Math.round(m.confidence_score * 100)}%
                        </span>
                      </div>
                    </td>

                    {/* Confirm Action */}
                    <td style={{ textAlign: "right" }}>
                      <select
                        value={m.final_category || m.consensus_category || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 1 && val <= 7) {
                            handleConfirm(m.meme_id, val);
                          }
                        }}
                        disabled={confirmingId === m.meme_id}
                        style={{
                          background: "#262626",
                          border: "1px solid #9b30ff",
                          color: "#f4c300",
                          padding: "4px 8px",
                          fontFamily: "Oswald",
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        <option value="">CONFIRM AS...</option>
                        {MEME_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id}. {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Meme Detail & Override Modal */}
      {selectedMeme && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
          onClick={() => setSelectedMeme(null)}
        >
          <div
            style={{
              background: "#1c1b1b",
              border: "2px solid #9b30ff",
              boxShadow: "6px 6px 0px #f4c300",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 className="cat-font-anton cat-text-gold" style={{ margin: 0, fontSize: "22px" }}>
                MEME INSPECTION & OVERRIDE
              </h3>
              <button
                onClick={() => setSelectedMeme(null)}
                style={{ background: "transparent", border: "none", color: "#dd0061", fontSize: "16px", cursor: "pointer", fontFamily: "Anton" }}
              >
                ✕ CLOSE
              </button>
            </div>

            <div style={{ textAlign: "center", background: "#111", padding: "16px", border: "1px solid #333", marginBottom: "16px" }}>
              <img src={selectedMeme.image_url} alt="" style={{ maxHeight: "40vh", maxWidth: "100%", objectFit: "contain" }} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#8e8e93" }}>ID: {selectedMeme.meme_id}</div>
              <div style={{ fontSize: "16px", color: "#fff", fontWeight: "bold" }}>{selectedMeme.title}</div>
            </div>

            <h4 className="cat-font-anton cat-text-purple" style={{ margin: "0 0 8px 0" }}>
              JUDGE DECISIONS:
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
              {selectedMeme.decisions.map((d) => (
                <div key={d.user_id} style={{ display: "flex", justifyContent: "space-between", background: "#262626", padding: "8px 12px", fontSize: "13px" }}>
                  <span>{d.display_name}</span>
                  <span style={{ color: d.skipped ? "#dd0061" : "#f4c300" }}>
                    {d.skipped ? "SKIPPED" : d.category_label} (Conf: {d.confidence}/5)
                  </span>
                </div>
              ))}
            </div>

            <h4 className="cat-font-anton cat-text-gold" style={{ margin: "0 0 8px 0" }}>
              SET FINAL CONSENSUS CATEGORY:
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
              {MEME_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleConfirm(selectedMeme.meme_id, c.id)}
                  style={{
                    background: selectedMeme.final_category === c.id ? c.color : "#222",
                    border: `2px solid ${c.color}`,
                    color: "#fff",
                    padding: "8px",
                    fontFamily: "Anton",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  {c.id}. {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
