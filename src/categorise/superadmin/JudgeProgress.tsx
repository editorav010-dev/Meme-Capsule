import { type CatJudgeProgress } from "../catTypes";

interface JudgeProgressProps {
  judges: CatJudgeProgress[];
}

export default function JudgeProgress({ judges }: JudgeProgressProps) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h3 className="cat-font-anton cat-text-gold" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
        JUDGE COMPLETION PROGRESS
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {judges.map((j) => (
          <div key={j.user_id} className="cat-stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="cat-font-anton" style={{ fontSize: "16px", color: "#ffffff" }}>
                {j.display_name}
              </span>
              <span style={{ fontSize: "12px", color: "#f4c300", fontFamily: "monospace", fontWeight: "bold" }}>
                {j.percent_complete}%
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ height: "8px", background: "#262626", border: "1px solid #444", marginBottom: "12px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${j.percent_complete}%`,
                  background: j.percent_complete === 100 ? "#34C759" : "#9b30ff",
                  transition: "width 0.3s ease"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#8e8e93" }}>
              <span>Categorised: <strong style={{ color: "#ddd" }}>{j.categorised}</strong></span>
              <span>Skipped: <strong style={{ color: "#dd0061" }}>{j.skipped}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
