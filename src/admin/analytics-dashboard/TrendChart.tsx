import React from "react";

interface TrendChartProps {
  data: {
    date: string;
    total_views: number;
    total_likes: number;
    total_shares: number;
    total_downloads: number;
    total_skips: number;
  }[];
  metric: "total_views" | "total_likes" | "total_shares" | "total_downloads" | "total_skips";
}

export default function TrendChart({ data, metric }: TrendChartProps) {
  if (!data || data.length === 0) {
    return <div className="brutalist-border-sm" style={{ padding: '24px', textAlign: 'center' }}>No trend data available</div>;
  }

  const width = 600;
  const height = 200;
  const padding = 20;

  const values = data.map(d => d[metric]);
  const maxVal = Math.max(...values, 10);
  const minVal = 0;

  // Map data to SVG coordinates
  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((d[metric] - minVal) / (maxVal - minVal)) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="trend-chart-container brutalist-border brutalist-shadow-black">
      <h4 style={{ margin: '16px 16px 0', textTransform: 'uppercase' }}>30-Day Trend: {metric.replace("total_", "")}</h4>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', margin: '16px 0' }}>
        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--outline-variant)" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Line */}
        <polyline
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          points={points}
          strokeLinejoin="round"
        />

        {/* Points */}
        {data.map((d, i) => {
          const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
          const y = height - padding - ((d[metric] - minVal) / (maxVal - minVal)) * (height - padding * 2);
          return (
            <circle key={d.date} cx={x} cy={y} r="4" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 16px', fontSize: '12px', color: 'var(--outline)' }}>
        <span>{new Date(data[0].date).toLocaleDateString()}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
