import type { CorpusStatus } from "./curateTypes";

interface EditorialButtonsProps {
  currentStatus: CorpusStatus | null;
  duplicateOf: string;
  onSelectStatus: (status: CorpusStatus) => void;
  onChangeDuplicateOf: (id: string) => void;
}

export default function EditorialButtons({
  currentStatus,
  duplicateOf,
  onSelectStatus,
  onChangeDuplicateOf
}: EditorialButtonsProps) {
  return (
    <div>
      <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
        <span className="curate-anton" style={{ fontSize: "14px", color: "#f4c300" }}>
          LAYER 0 — EDITORIAL ACTION
        </span>
        <span style={{ fontSize: "11px", color: "#888" }}>
          DECIDE CORPUS STATUS FIRST
        </span>
      </div>

      <div className="curate-editorial-strip">
        {/* KEEP */}
        <button
          type="button"
          className={`curate-action-btn ${currentStatus === "keep" ? "active" : ""}`}
          style={{ "--btn-border": "#34C759" } as React.CSSProperties}
          onClick={() => onSelectStatus("keep")}
          title="Keep in active collection [Key: K]"
        >
          <span className="curate-key-pill">[K]</span>
          <span className="curate-anton" style={{ fontSize: "15px" }}>KEEP</span>
          <span style={{ fontSize: "10px", opacity: 0.7 }}>Active Corpus</span>
        </button>

        {/* EXCLUDE */}
        <button
          type="button"
          className={`curate-action-btn ${currentStatus === "excluded" ? "active" : ""}`}
          style={{ "--btn-border": "#FF3B30" } as React.CSSProperties}
          onClick={() => onSelectStatus("excluded")}
          title="Exclude from active collection [Key: X]"
        >
          <span className="curate-key-pill">[X]</span>
          <span className="curate-anton" style={{ fontSize: "15px" }}>EXCLUDE</span>
          <span style={{ fontSize: "10px", opacity: 0.7 }}>Reversible</span>
        </button>

        {/* DUPLICATE */}
        <button
          type="button"
          className={`curate-action-btn ${currentStatus === "duplicate" ? "active" : ""}`}
          style={{ "--btn-border": "#FF9F0A" } as React.CSSProperties}
          onClick={() => onSelectStatus("duplicate")}
          title="Mark as duplicate meme [Key: D]"
        >
          <span className="curate-key-pill">[D]</span>
          <span className="curate-anton" style={{ fontSize: "15px" }}>DUPLICATE</span>
          <span style={{ fontSize: "10px", opacity: 0.7 }}>Mark Copy</span>
        </button>

        {/* REVIEW LATER */}
        <button
          type="button"
          className={`curate-action-btn ${currentStatus === "review_later" ? "active" : ""}`}
          style={{ "--btn-border": "#f4c300" } as React.CSSProperties}
          onClick={() => onSelectStatus("review_later")}
          title="Defer to review later queue [Key: R]"
        >
          <span className="curate-key-pill">[R]</span>
          <span className="curate-anton" style={{ fontSize: "15px" }}>LATER</span>
          <span style={{ fontSize: "10px", opacity: 0.7 }}>Defer Queue</span>
        </button>
      </div>

      {/* Duplicate-Of Input (if Duplicate is chosen) */}
      {currentStatus === "duplicate" && (
        <div style={{ background: "#221c16", border: "1px solid #FF9F0A", padding: "8px 12px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "#FF9F0A", fontWeight: "bold" }}>DUPLICATE OF MEME ID:</span>
          <input
            type="text"
            placeholder="e.g. meme-1234abcd"
            value={duplicateOf}
            onChange={(e) => onChangeDuplicateOf(e.target.value)}
            style={{
              background: "#121212",
              border: "1px solid #555",
              color: "#fff",
              padding: "4px 8px",
              fontFamily: "monospace",
              fontSize: "12px",
              flex: 1
            }}
          />
        </div>
      )}
    </div>
  );
}
