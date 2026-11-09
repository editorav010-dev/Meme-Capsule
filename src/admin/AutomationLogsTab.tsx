import React, { useState, useEffect, useCallback } from "react";

interface SystemLogEntry {
  id: string;
  created_at: string;
  workflow: string;
  severity: "info" | "warning" | "error" | "fatal";
  actor: string;
  batch_id: string | null;
  item_id: string | null;
  provider: string | null;
  model: string | null;
  status_code: number | null;
  message: string;
  details_json: string | null;
}

interface AutomationLogsTabProps {
  adminToken: string;
}

export default function AutomationLogsTab({ adminToken }: AutomationLogsTabProps) {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [errors24h, setErrors24h] = useState(0);
  const [fatalCount, setFatalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<SystemLogEntry | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setStatusNotice(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (workflowFilter) params.set("workflow", workflowFilter);
      if (severityFilter) params.set("severity", severityFilter);

      const headers: Record<string, string> = {};
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;

      const res = await fetch(`/api/admin/system-logs?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setErrors24h(data.errors_24h || 0);
      setFatalCount(data.fatal_count || 0);
    } catch (err: unknown) {
      console.error("Failed to fetch system logs:", err);
      setStatusNotice("Failed to load logs from server.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, workflowFilter, severityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePruneLogs = async () => {
    if (!window.confirm("Purge logs older than 14 days?")) return;
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;
      const res = await fetch("/api/admin/system-logs?older_than_days=14", {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        setStatusNotice("Old logs pruned successfully.");
        fetchLogs();
      }
    } catch (err) {
      console.error("Prune error:", err);
    }
  };

  const getSeverityBadgeStyle = (severity: string) => {
    switch (severity) {
      case "fatal":
        return { background: "#ff0055", color: "#fff", border: "1px solid #ff3377" };
      case "error":
        return { background: "#ff4400", color: "#fff", border: "1px solid #ff6622" };
      case "warning":
        return { background: "#f4c300", color: "#000", border: "1px solid #ffdd33" };
      default:
        return { background: "#00f0ff", color: "#000", border: "1px solid #33f3ff" };
    }
  };

  return (
    <div className="automation-logs-container" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Header & Metric Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontFamily: "Anton", fontSize: "24px", color: "var(--foreground, #fff)", margin: 0, letterSpacing: "1px" }}>
            NOTIFICATIONS & AUTOMATION LOGS
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "#888", fontSize: "13px" }}>
            Real-time telemetry for AI Curation, Bulk Ingestion, and Background Sync
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            style={{
              background: "#222",
              border: "1px solid #444",
              color: "#fff",
              padding: "8px 16px",
              fontFamily: "Anton",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "2px 2px 0px #000"
            }}
          >
            {loading ? "REFRESHING..." : "🔄 REFRESH"}
          </button>
          <button
            type="button"
            onClick={handlePruneLogs}
            style={{
              background: "#181818",
              border: "1px solid #555",
              color: "#aaa",
              padding: "8px 14px",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            🗑 PRUNE &gt;14d
          </button>
        </div>
      </div>

      {statusNotice && (
        <div style={{ background: "#222", border: "1px solid #f4c300", color: "#f4c300", padding: "10px 14px", fontSize: "13px" }}>
          {statusNotice}
        </div>
      )}

      {/* 2. Top Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div style={{ background: "var(--card-bg, #1a1a1a)", border: "2px solid #ff4400", padding: "16px", boxShadow: "3px 3px 0px #ff4400" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontFamily: "monospace" }}>ERRORS (LAST 24H)</div>
          <div style={{ fontSize: "32px", fontFamily: "Anton", color: "#ff4400", marginTop: "4px" }}>{errors24h}</div>
        </div>
        <div style={{ background: "var(--card-bg, #1a1a1a)", border: "2px solid #ff0055", padding: "16px", boxShadow: "3px 3px 0px #ff0055" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontFamily: "monospace" }}>FATAL / RETIRED</div>
          <div style={{ fontSize: "32px", fontFamily: "Anton", color: "#ff0055", marginTop: "4px" }}>{fatalCount}</div>
        </div>
        <div style={{ background: "var(--card-bg, #1a1a1a)", border: "2px solid #00f0ff", padding: "16px", boxShadow: "3px 3px 0px #00f0ff" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontFamily: "monospace" }}>TOTAL LOGGED EVENTS</div>
          <div style={{ fontSize: "32px", fontFamily: "Anton", color: "#00f0ff", marginTop: "4px" }}>{total}</div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", background: "#1c1c1c", padding: "12px", border: "1px solid #333" }}>
        <span style={{ fontSize: "12px", color: "#888", fontFamily: "monospace" }}>FILTERS:</span>

        <select
          value={workflowFilter}
          onChange={(e) => setWorkflowFilter(e.target.value)}
          style={{ background: "#262626", color: "#fff", border: "1px solid #555", padding: "6px 12px", fontSize: "13px" }}
        >
          <option value="">All Workflows</option>
          <option value="ai_curation">AI Curation</option>
          <option value="bulk_upload">Bulk Upload</option>
          <option value="gdrive_ingestion">Google Drive Sync</option>
          <option value="deduplication">Deduplication</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ background: "#262626", color: "#fff", border: "1px solid #555", padding: "6px 12px", fontSize: "13px" }}
        >
          <option value="">All Severities</option>
          <option value="fatal">Fatal Only</option>
          <option value="error">Error Only</option>
          <option value="warning">Warning Only</option>
          <option value="info">Info Only</option>
        </select>
      </div>

      {/* 4. Event Stream Table */}
      <div style={{ overflowX: "auto", background: "var(--card-bg, #161616)", border: "1px solid #333" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#222", borderBottom: "2px solid #333", color: "#aaa", fontFamily: "monospace" }}>
              <th style={{ padding: "10px 12px" }}>TIME</th>
              <th style={{ padding: "10px 12px" }}>WORKFLOW</th>
              <th style={{ padding: "10px 12px" }}>SEVERITY</th>
              <th style={{ padding: "10px 12px" }}>ACTOR / MODEL</th>
              <th style={{ padding: "10px 12px" }}>ITEM / BATCH</th>
              <th style={{ padding: "10px 12px" }}>MESSAGE</th>
              <th style={{ padding: "10px 12px" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "#666" }}>
                  {loading ? "Loading event telemetry..." : "No events match the selected filters."}
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badgeStyle = getSeverityBadgeStyle(log.severity);
                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid #222" }}>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: "#888", fontFamily: "monospace" }}>
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "--"}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <span style={{ background: "#2a2a2a", padding: "2px 6px", fontSize: "11px", color: "#ccc" }}>
                        {log.workflow}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <span style={{ ...badgeStyle, padding: "2px 8px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
                        {log.severity}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#ccc" }}>
                      <div>{log.actor}</div>
                      {log.model && <div style={{ fontSize: "10px", color: "#777" }}>{log.model}</div>}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "11px", color: "#aaa" }}>
                      {log.item_id ? (
                        <div title={log.item_id}>{log.item_id.slice(0, 16)}...</div>
                      ) : log.batch_id ? (
                        <div title={log.batch_id}>{log.batch_id.slice(0, 16)}...</div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#eee", maxWidth: "350px", wordBreak: "break-word" }}>
                      {log.message}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        style={{
                          background: "#2a2a2a",
                          border: "1px solid #555",
                          color: "#00f0ff",
                          padding: "4px 8px",
                          fontSize: "11px",
                          cursor: "pointer"
                        }}
                      >
                        👁 Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Diagnostic Inspection Modal */}
      {selectedLog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: "#1c1b1b",
              border: "2px solid #00f0ff",
              boxShadow: "6px 6px 0px #00f0ff",
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontFamily: "Anton", fontSize: "18px", color: "#00f0ff", letterSpacing: "1px" }}>
                DIAGNOSTIC EVENT INSPECTION
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: "#262626", border: "1px solid #555", color: "#fff", cursor: "pointer", padding: "4px 10px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div><strong>Time:</strong> {selectedLog.created_at}</div>
              <div><strong>Workflow:</strong> {selectedLog.workflow}</div>
              <div><strong>Severity:</strong> <span style={{ ...getSeverityBadgeStyle(selectedLog.severity), padding: "2px 6px", fontSize: "10px" }}>{selectedLog.severity.toUpperCase()}</span></div>
              <div><strong>Actor:</strong> {selectedLog.actor}</div>
              {selectedLog.provider && <div><strong>Provider:</strong> {selectedLog.provider}</div>}
              {selectedLog.model && <div><strong>Model:</strong> {selectedLog.model}</div>}
              {selectedLog.item_id && <div><strong>Meme ID:</strong> <code>{selectedLog.item_id}</code></div>}
              {selectedLog.batch_id && <div><strong>Batch ID:</strong> <code>{selectedLog.batch_id}</code></div>}
              {selectedLog.status_code && <div><strong>HTTP Status Code:</strong> <code>{selectedLog.status_code}</code></div>}
              <div><strong>Message:</strong> <p style={{ color: "#ff8888", margin: "4px 0" }}>{selectedLog.message}</p></div>

              {selectedLog.details_json && (
                <div>
                  <strong>Structured Payload Diagnostics:</strong>
                  <pre style={{ background: "#111", border: "1px solid #333", padding: "10px", color: "#00f0ff", fontSize: "11px", overflowX: "auto", maxHeight: "200px" }}>
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.details_json), null, 2);
                      } catch {
                        return selectedLog.details_json;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: "#00f0ff", color: "#000", border: "none", padding: "8px 16px", fontFamily: "Anton", fontSize: "14px", cursor: "pointer" }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
