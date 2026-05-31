import React, { useEffect, useState } from "react";
import TrendChart from "./TrendChart";

interface MemeDetailProps {
  memeId: string;
  adminToken: string;
  onBack: () => void;
}

export default function MemeDetail({ memeId, adminToken, onBack }: MemeDetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/analytics/meme/${memeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
      .then(res => res.json())
      .then(resData => setData(resData))
      .finally(() => setLoading(false));
  }, [memeId, adminToken]);

  if (loading) return <div style={{ padding: '24px' }}>Loading meme details...</div>;
  if (!data || data.error) return <div style={{ padding: '24px', color: 'var(--error)' }}>{data?.error || "Failed to load"}</div>;

  const { meme, analytics, percentiles, event_breakdown, daily_stats } = data;

  return (
    <div style={{ padding: '24px' }}>
      <button 
        onClick={onBack}
        className="brutalist-border-sm brutalist-interactive"
        style={{ padding: '8px 16px', background: 'transparent', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <span className="material-symbols-outlined">arrow_back</span> Back
      </button>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Media Preview */}
        <div className="brutalist-border brutalist-shadow-black" style={{ width: '300px', flexShrink: 0, padding: '16px', background: 'var(--surface)' }}>
          <div style={{ width: '100%', aspectRatio: '1', background: 'var(--surface-variant)', marginBottom: '16px' }}>
             {meme.url && <img src={meme.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
          </div>
          <h3 style={{ margin: '0 0 8px 0' }}>{meme.title}</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--outline)' }}>ID: {meme.id}</p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <span className="brutalist-border-sm" style={{ padding: '4px 8px', fontSize: '10px', textTransform: 'uppercase' }}>{meme.category}</span>
            <span className="brutalist-border-sm" style={{ padding: '4px 8px', fontSize: '10px', textTransform: 'uppercase' }}>{meme.status}</span>
          </div>
        </div>

        {/* Analytics Breakdown */}
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <StatBox label="Views" value={analytics.view_count} />
            <StatBox label="Likes" value={analytics.like_count} />
            <StatBox label="Shares" value={analytics.share_count} />
            <StatBox label="Downloads" value={analytics.download_count} />
            <StatBox label="Skip Rate" value={`${(Number(analytics.skip_rate) * 100).toFixed(1)}%`} />
            <StatBox label="Avg Time" value={`${(Number(analytics.avg_time_on_meme_ms) / 1000).toFixed(1)}s`} />
          </div>

          <div className="brutalist-border brutalist-shadow-black" style={{ padding: '16px', background: 'var(--surface)' }}>
            <h4 style={{ margin: '0 0 16px 0', textTransform: 'uppercase' }}>Scores & Percentiles</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <PercentileBar label="Engagement" score={analytics.engagement_score} percentile={percentiles.engagement} />
              <PercentileBar label="Virality" score={analytics.virality_score} percentile={percentiles.virality} />
              <PercentileBar label="Retention" score={analytics.retention_score} percentile={percentiles.retention} />
              <PercentileBar label="Trending" score={analytics.trending_score} percentile={percentiles.trending} />
            </div>
          </div>

          {daily_stats && daily_stats.length > 0 && (
             <TrendChart data={daily_stats} metric="total_views" />
          )}

        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="brutalist-border-sm" style={{ padding: '12px', background: 'var(--surface)' }}>
      <p style={{ margin: '0 0 4px', fontSize: '10px', textTransform: 'uppercase', color: 'var(--outline)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function PercentileBar({ label, score, percentile }: { label: string, score: number, percentile: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: 700 }}>
        <span>{label} ({Number(score).toFixed(1)})</span>
        <span>Top {100 - percentile}%</span>
      </div>
      <div style={{ width: '100%', height: '8px', background: 'var(--surface-variant)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${percentile}%`, height: '100%', background: 'var(--primary)' }}></div>
      </div>
    </div>
  );
}
