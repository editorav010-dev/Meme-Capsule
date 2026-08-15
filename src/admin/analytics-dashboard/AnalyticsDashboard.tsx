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

  const [isRecalculating, setIsRecalculating] = useState(false);

  // Reset Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleRecalculate = async () => {
    if (isRecalculating) return;
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/admin/analytics/recalculate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(`Recalculated successfully. Processed ${data.processed} memes in ${data.duration_ms}ms.`);
        window.location.reload();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch(err: any) {
      alert(err.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    const validPin = import.meta.env.VITE_ADMIN_PIN || "123456";
    const savedPin = sessionStorage.getItem("admin-pin");

    if (pinInput !== validPin && pinInput !== savedPin) {
      setResetError("Invalid Admin PIN. Verification failed.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch("/api/admin/analytics/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        alert("Analytics reset successfully! All interaction events and computed metrics have been wiped clean.");
        setIsResetModalOpen(false);
        window.location.reload();
      } else {
        setResetError(data.error || "Failed to reset analytics.");
      }
    } catch (err: any) {
      setResetError(err.message || "An unexpected error occurred.");
    } finally {
      setIsResetting(false);
    }
  };

  if (selectedMemeId) {
    return <MemeDetail memeId={selectedMemeId} adminToken={adminToken} onBack={() => setSelectedMemeId(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Sub-navigation */}
      <div style={{ 
        display: 'flex', gap: '8px', padding: '16px 24px', 
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-highest)',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="query_stats" label="Overview" />
        <TabButton active={activeTab === 'rankings'} onClick={() => setActiveTab('rankings')} icon="format_list_numbered" label="Rankings" />
        <TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon="lightbulb" label="Insights" />
        
        <div style={{ flex: 1 }} />
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="brutalist-interactive brutalist-border-sm"
            disabled={isRecalculating}
            style={{ 
              padding: '8px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'var(--surface)', 
              color: 'var(--on-surface)',
              fontWeight: 700,
              cursor: isRecalculating ? 'wait' : 'pointer',
              opacity: isRecalculating ? 0.7 : 1
            }}
            onClick={handleRecalculate}
          >
            <span
              className="material-symbols-outlined"
              style={{
                animation: isRecalculating ? 'spin 1s linear infinite' : 'none'
              }}
            >
              sync
            </span>
            {isRecalculating ? 'Recalculating...' : 'Recalculate Now'}
          </button>

          <button 
            className="brutalist-interactive brutalist-border-sm"
            style={{ 
              padding: '8px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'var(--surface-container-high)', 
              color: 'var(--error)',
              border: '2px solid var(--error)',
              fontWeight: 700,
              cursor: 'pointer' 
            }}
            onClick={() => {
              setPinInput("");
              setResetError("");
              setIsResetModalOpen(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ color: 'var(--error)' }}>restart_alt</span> Reset Analytics
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
        {activeTab === 'overview' && <Overview adminToken={adminToken} onMemeSelect={setSelectedMemeId} />}
        {activeTab === 'rankings' && <Rankings adminToken={adminToken} onMemeSelect={setSelectedMemeId} />}
        {activeTab === 'insights' && <InsightsList adminToken={adminToken} onMemeSelect={setSelectedMemeId} />}
      </div>

      {/* Admin PIN Verification Modal for Reset */}
      {isResetModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div 
            className="brutalist-border brutalist-shadow-black-lg"
            style={{
              background: 'var(--surface-container)',
              color: 'var(--on-surface)',
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: 'rgba(255, 180, 171, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--error)'
              }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: '28px' }}>warning</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--error)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Reset Analytics Engine
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                  Requires Admin PIN Verification
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--surface-container-highest)',
              borderLeft: '4px solid var(--error)',
              padding: '12px 16px',
              fontSize: '13px',
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div>
                ⚠️ <strong>Destructive Action:</strong> This will erase all recorded events, clear virality/retention scores, and reset the ranking algorithm to baseline.
              </div>
              <div style={{ color: 'var(--secondary)' }}>
                🛡️ <strong>Safety Guarantee:</strong> Your active memes and R2 image assets will <u>not</u> be touched or modified.
              </div>
            </div>

            <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Enter Admin PIN to Authorize:
                </label>
                <input 
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter PIN..."
                  autoFocus
                  disabled={isResetting}
                  className="brutalist-input"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '18px',
                    textAlign: 'center',
                    letterSpacing: '6px',
                    boxSizing: 'border-box'
                  }}
                />
                {resetError && (
                  <p style={{ color: 'var(--error)', margin: '8px 0 0 0', fontSize: '13px', fontWeight: 700 }}>
                    {resetError}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResetting}
                  className="brutalist-interactive brutalist-border-sm"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--surface)',
                    color: 'var(--on-surface)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !pinInput}
                  className="brutalist-interactive brutalist-border-sm"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--error)',
                    color: 'var(--on-error)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: isResetting || !pinInput ? 'not-allowed' : 'pointer',
                    opacity: isResetting || !pinInput ? 0.6 : 1
                  }}
                >
                  {isResetting ? (
                    <>
                      <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                      Reseting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">delete_forever</span>
                      Confirm & Reset
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

