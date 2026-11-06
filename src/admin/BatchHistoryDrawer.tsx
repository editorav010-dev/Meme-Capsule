import React, { useEffect, useState, useCallback } from "react";
import { listIngestionBatches, type IngestionBatchSummary } from "../lib/adminApi";
import { formatBytes } from "./bulkIngestion";
import BatchInfoModal from "./BatchInfoModal";
import BatchDeleteModal from "./BatchDeleteModal";

interface BatchHistoryDrawerProps {
  adminToken: string;
  isOpen: boolean;
  onToggle: () => void;
  onInspectBatch?: (batchId: string) => void;
  onBatchDeleted?: (batchId: string) => void;
}

export default function BatchHistoryDrawer({
  adminToken,
  isOpen,
  onToggle,
  onInspectBatch,
  onBatchDeleted
}: BatchHistoryDrawerProps) {
  const [batches, setBatches] = useState<IngestionBatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [inspectModalBatchId, setInspectModalBatchId] = useState<string | null>(null);
  const [deleteModalBatch, setDeleteModalBatch] = useState<IngestionBatchSummary | null>(null);

  const fetchBatches = useCallback(async () => {
    if (!adminToken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listIngestionBatches(adminToken, 30, 0);
      setBatches(res.batches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch history.");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
    }
  }, [isOpen, fetchBatches]);

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "complete":
        return { bg: "#00bb7722", text: "#00bb77", border: "#00bb77" };
      case "processing":
        return { bg: "#00f0ff22", text: "#00f0ff", border: "#00f0ff" };
      case "partial":
        return { bg: "#ff990022", text: "#ff9900", border: "#ff9900" };
      case "failed":
        return { bg: "#ff336622", text: "#ff3366", border: "#ff3366" };
      default:
        return { bg: "#ffe60022", text: "#ffe600", border: "#ffe600" };
    }
  };

  return (
    <>
      <aside
        className={`batch-history-drawer brutalist-border ${isOpen ? "open" : "collapsed"}`}
        style={{
          width: isOpen ? "380px" : "48px",
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          background: "var(--surface-container)",
          borderLeft: "2px solid var(--outline)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden"
        }}
      >
        {/* Drawer Header / Collapse Bar */}
        <div
          style={{
            padding: "12px",
            background: "var(--surface-container-high)",
            borderBottom: "2px solid var(--outline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer"
          }}
          onClick={onToggle}
          title={isOpen ? "Collapse Batch Drawer" : "Expand Batch Drawer"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: "20px" }}>
              history
            </span>
            {isOpen && (
              <span style={{ fontWeight: 900, fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase" }}>
                Batch Ledger ({batches.length})
              </span>
            )}
          </div>
          <button
            type="button"
            className="brutalist-border-sm"
            style={{
              padding: "2px 6px",
              background: "transparent",
              color: "var(--on-surface)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              {isOpen ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        {isOpen && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "var(--outline)", fontFamily: "monospace" }}>
                Cloudflare D1 Ledger
              </span>
              <button
                type="button"
                className="brutalist-border-sm"
                style={{
                  padding: "4px 8px",
                  fontSize: "11px",
                  background: "var(--surface)",
                  color: "var(--on-surface)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
                onClick={fetchBatches}
                disabled={loading}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  {loading ? "sync" : "refresh"}
                </span>
                {loading ? "Syncing..." : "Refresh"}
              </button>
            </div>

            {error && (
              <div style={{ padding: "8px 10px", background: "#ff336622", border: "1px solid #ff3366", color: "#ff6688", fontSize: "11px" }}>
                {error}
              </div>
            )}

            {batches.length === 0 && !loading && (
              <div style={{ padding: "30px 10px", textAlign: "center", color: "var(--outline)", fontSize: "12px", fontFamily: "monospace" }}>
                No batch history found in D1.
              </div>
            )}

            {/* Batch Cards */}
            {batches.map((batch) => {
              const badge = statusBadgeColor(batch.status);
              return (
                <div
                  key={batch.id}
                  className="brutalist-border-sm brutalist-shadow-black-sm"
                  style={{
                    background: "var(--surface)",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    borderLeft: `3px solid ${badge.border}`
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          fontFamily: "monospace",
                          color: "var(--on-surface)",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap"
                        }}
                        title={batch.id}
                      >
                        {batch.id}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--outline)", fontFamily: "monospace" }}>
                        {batch.created_at ? new Date(batch.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                    <span
                      className="badge brutalist-border-sm"
                      style={{
                        fontSize: "9px",
                        fontWeight: 900,
                        background: badge.bg,
                        color: badge.text,
                        borderColor: badge.border
                      }}
                    >
                      {batch.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Progress & Storage Footprint */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "6px",
                      background: "var(--surface-container-low)",
                      padding: "6px 8px",
                      fontSize: "10px",
                      fontFamily: "monospace"
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--outline)" }}>Uploaded: </span>
                      <strong style={{ color: "#fff" }}>
                        {batch.uploaded_items} / {batch.total_items}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--outline)" }}>R2 Storage: </span>
                      <strong style={{ color: "#fff" }}>
                        {formatBytes(batch.uploaded_bytes || batch.total_bytes)}
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                    <button
                      type="button"
                      className="brutalist-border-sm"
                      style={{
                        padding: "4px 8px",
                        fontSize: "10px",
                        fontWeight: 800,
                        background: "var(--surface-container-high)",
                        color: "var(--primary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px"
                      }}
                      onClick={() => setInspectModalBatchId(batch.id)}
                      title="View complete telemetry, lifecycle, and item breakdown"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>info</span>
                      Batch Info
                    </button>

                    {onInspectBatch && (
                      <button
                        type="button"
                        className="brutalist-border-sm"
                        style={{
                          padding: "4px 8px",
                          fontSize: "10px",
                          fontWeight: 800,
                          background: "#ffe60022",
                          color: "#ffe600",
                          border: "1px solid #ffe60066",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                        onClick={() => onInspectBatch(batch.id)}
                        title="Filter Meme Vault to inspect memes from this batch"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>filter_alt</span>
                        Vault Inspect
                      </button>
                    )}

                    <button
                      type="button"
                      className="brutalist-border-sm"
                      style={{
                        padding: "4px 8px",
                        fontSize: "10px",
                        fontWeight: 800,
                        background: "#ff336618",
                        color: "#ff3366",
                        border: "1px solid #ff336666",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        marginLeft: "auto"
                      }}
                      onClick={() => setDeleteModalBatch(batch)}
                      title="Safely purge uncurated drafts and batch files"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>delete</span>
                      Purge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* Batch Info Modal */}
      {inspectModalBatchId && (
        <BatchInfoModal
          batchId={inspectModalBatchId}
          adminToken={adminToken}
          onClose={() => setInspectModalBatchId(null)}
          onInspectInVault={onInspectBatch}
        />
      )}

      {/* Batch Delete Modal */}
      {deleteModalBatch && (
        <BatchDeleteModal
          batchId={deleteModalBatch.id}
          totalItems={deleteModalBatch.total_items}
          totalBytes={deleteModalBatch.uploaded_bytes || deleteModalBatch.total_bytes}
          adminToken={adminToken}
          onClose={() => setDeleteModalBatch(null)}
          onDeleted={(deletedId) => {
            setBatches((prev) => prev.filter((b) => b.id !== deletedId));
            if (onBatchDeleted) onBatchDeleted(deletedId);
          }}
        />
      )}
    </>
  );
}
