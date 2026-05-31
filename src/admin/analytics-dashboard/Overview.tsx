import React, { useEffect, useState } from "react";
import TrendChart from "./TrendChart";

interface OverviewProps {
  adminToken: string;
  onMemeSelect: (memeId: string) => void;
}

export default function Overview({ adminToken, onMemeSelect }: OverviewProps) {
  const [data, setData] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/analytics/overview", {
        headers: { Authorization: `Bearer ${adminToken}` }
      }).then(res => res.json()),
      fetch("/api/admin/analytics/trends?days=30", {
        headers: { Authorization: `Bearer ${adminToken}` }
      }).then(res => res.json())
    ]).then(([overviewData, trendsData]) => {
      if (overviewData.error) throw new Error(overviewData.error);
      setData(overviewData);
      setTrends(trendsData);
    }).catch(err => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, [adminToken]);

  if (loading) return <div style={{ padding: '24px' }}>Loading overview...</div>;
  if (error) return <div style={{ color: 'var(--error)', padding: '24px' }}>{error}</div>;
  if (!data) return null;

  return (
    <div className="overview-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
      
      {/* Global Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
        {Object.entries(data.global).map(([key, value]) => {
          if (key === "last_aggregated_at") return null;
          return (
            <div key={key} className="stat-card brutalist-border brutalist-shadow-black">
              <p style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--outline)' }}>
                {key.replace(/_/g, " ")}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 700 }}>
                {typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(2)) : String(value)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Trend Chart */}
      {trends && trends.trends && (
        <TrendChart data={trends.trends} metric="total_views" />
      )}

      {/* Top Memes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <TopList title="Top by Engagement" items={data.top_memes.by_engagement} onSelect={onMemeSelect} />
        <TopList title="Top by Virality" items={data.top_memes.by_virality} onSelect={onMemeSelect} />
        <TopList title="Highest Skip Rate" items={data.top_memes.most_skipped} onSelect={onMemeSelect} />
      </div>
      
    </div>
  );
}

function TopList({ title, items, onSelect }: { title: string, items: any[], onSelect: (id: string) => void }) {
  return (
    <div className="brutalist-border brutalist-shadow-black" style={{ padding: '16px', background: 'var(--surface)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', textTransform: 'uppercase' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item: any, i: number) => (
          <div 
            key={item.meme_id} 
            className="brutalist-interactive"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px', border: '1px solid var(--outline-variant)' }}
            onClick={() => onSelect(item.meme_id)}
          >
            <span style={{ fontWeight: 700, width: '24px' }}>#{i + 1}</span>
            <div style={{ width: '40px', height: '40px', background: 'var(--surface-variant)', flexShrink: 0 }}>
              {item.url && <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
              <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>Score: {Number(item.score).toFixed(2)}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={{ fontSize: '12px', color: 'var(--outline)' }}>No data</div>}
      </div>
    </div>
  );
}
