import React, { useState } from "react";
import Overview from "./Overview";
import Rankings from "./Rankings";
import InsightsList from "./InsightsList";
import MemeDetail from "./MemeDetail";

interface AnalyticsDashboardProps {
  adminToken: string;
}

export default function AnalyticsDashboard({ adminToken }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "rankings" | "insights">("overview");
  const [selectedMemeId, setSelectedMemeId] = useState<string | null>(null);

  if (selectedMemeId) {
    return <MemeDetail memeId={selectedMemeId} adminToken={adminToken} onBack={() => setSelectedMemeId(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-navigation */}
      <div style={{ 
        display: 'flex', gap: '8px', padding: '16px 24px', 
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-highest)'
      }}>
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="query_stats" label="Overview" />
        <TabButton active={activeTab === 'rankings'} onClick={() => setActiveTab('rankings')} icon="format_list_numbered" label="Rankings" />
        <TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon="lightbulb" label="Insights" />
        
        <div style={{ flex: 1 }} />
        <button 
          className="brutalist-interactive brutalist-border-sm"
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', cursor: 'pointer' }}
          onClick={async () => {
            try {
              const res = await fetch('/api/admin/analytics/recalculate', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } });
              const data = await res.json();
              if (data.success) {
                alert(`Recalculated successfully. Processed ${data.processed} memes in ${data.duration_ms}ms.`);
                window.location.reload();
              } else {
                alert(`Error: ${data.error}`);
              }
            } catch(err: any) {
              alert(err.message);
            }
          }}
        >
          <span className="material-symbols-outlined">sync</span> Recalculate Now
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
        {activeTab === 'overview' && <Overview adminToken={adminToken} onMemeSelect={setSelectedMemeId} />}
        {activeTab === 'rankings' && <Rankings adminToken={adminToken} onMemeSelect={setSelectedMemeId} />}
        {activeTab === 'insights' && <InsightsList adminToken={adminToken} onMemeSelect={setSelectedMemeId} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 16px',
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'var(--on-primary)' : 'var(--on-surface)',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 700,
        cursor: 'pointer'
      }}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {label}
    </button>
  );
}
