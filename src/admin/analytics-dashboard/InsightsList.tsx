import React, { useEffect, useState } from "react";

interface InsightsProps {
  adminToken: string;
  onMemeSelect: (memeId: string) => void;
}

const INSIGHT_ICONS: Record<string, string> = {
  top_performer: "star",
  hidden_gem: "diamond",
  worst_performer: "warning",
  stale: "timer"
};

const INSIGHT_COLORS: Record<string, string> = {
  top_performer: "var(--primary)",
  hidden_gem: "var(--tertiary-container)",
  worst_performer: "var(--error)",
  stale: "var(--outline)"
};

export default function InsightsList({ adminToken, onMemeSelect }: InsightsProps) {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/insights", {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
      .then(res => res.json())
      .then(data => setInsights(data.insights || []))
      .finally(() => setLoading(false));
  }, [adminToken]);

  if (loading) return <div style={{ padding: '24px' }}>Loading insights...</div>;
  if (insights.length === 0) return <div style={{ padding: '24px' }}>No insights available right now.</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 24px', textTransform: 'uppercase' }}>Actionable Insights</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {insights.map((insight, idx) => (
          <div 
            key={`${insight.meme_id}-${idx}`}
            className="brutalist-border brutalist-shadow-black brutalist-interactive"
            style={{ padding: '16px', display: 'flex', gap: '16px', background: 'var(--surface)', cursor: 'pointer' }}
            onClick={() => onMemeSelect(insight.meme_id)}
          >
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              background: INSIGHT_COLORS[insight.type],
              color: 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <span className="material-symbols-outlined">{INSIGHT_ICONS[insight.type] || "info"}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: INSIGHT_COLORS[insight.type] }}>
                  {insight.type.replace("_", " ")}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--outline)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                  {insight.title}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.4 }}>{insight.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
