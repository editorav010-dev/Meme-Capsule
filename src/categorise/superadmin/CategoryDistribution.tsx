import { MEME_CATEGORIES, type CatCategoryDistItem } from "../catTypes";

interface CategoryDistributionProps {
  distribution: CatCategoryDistItem[];
}

export default function CategoryDistribution({ distribution }: CategoryDistributionProps) {
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="cat-stat-card">
      <h3 className="cat-font-anton cat-text-gold" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
        CATEGORY DISTRIBUTION (CONSENSUS)
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {distribution.map((item) => {
          const categoryMeta = MEME_CATEGORIES.find((c) => c.id === item.category_id);
          const color = categoryMeta?.color || "#9b30ff";
          const barWidthPercent = (item.count / maxCount) * 100;

          return (
            <div key={item.category_id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Category Label */}
              <div style={{ width: "110px", fontSize: "12px", fontFamily: "Anton", color: color, textTransform: "uppercase" }}>
                {item.label}
              </div>

              {/* Bar Container */}
              <div style={{ flex: 1, height: "18px", background: "#262626", border: "1px solid #333", position: "relative" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${barWidthPercent}%`,
                    backgroundColor: color,
                    transition: "width 0.4s ease"
                  }}
                />
              </div>

              {/* Metrics */}
              <div style={{ width: "80px", textAlign: "right", fontSize: "12px", fontFamily: "monospace", color: "#ddd" }}>
                {item.count} <span style={{ color: "#8e8e93", fontSize: "10px" }}>({item.percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
