import React, { useEffect, useState } from "react";
import { getIngestionBatch, type IngestionBatchStatus } from "../lib/adminApi";
import { formatBytes } from "./bulkIngestion";

interface BatchInfoModalProps {
  batchId: string;
  adminToken: string;
  onClose: () => void;
  onInspectInVault?: (batchId: string) => void;
}

export default function BatchInfoModal({
  batchId,
  adminToken,
  onClose,
  onInspectInVault
}: BatchInfoModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<IngestionBatchStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getIngestionBatch(adminToken, batchId)
      .then((data) => {
        if (isMounted) setStatus(data);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load batch telemetry.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [adminToken, batchId]);

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="brutalist-border brutalist-shadow-black"
        style={{
          background: "#161616",
          color: "#fff",
          maxWidth: "760px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          border: "3px solid #00f0ff"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #333", paddingBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ color: "#00f0ff", fontSize: "24px" }}>info</span>
              <h2 style={{ margin: 0, fontSize: "18px", textTransform: "uppercase", letterSpacing: "1px", color: "#00f0ff" }}>
                BATCH TELEMETRY & LIFECYCLE SUMMARY
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", fontFamily: "monospace", color: "#aaa" }}>
              Batch ID: {batchId}
            </p>
          </div>
          <button
            type="button"
            className="brutalist-border-sm"
            onClick={onClose}
            style={{
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              padding: "4px 10px",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#888", fontFamily: "monospace" }}>
            Loading batch telemetry from Cloudflare D1...
          </div>
        ) : error ? (
          <div style={{ padding: "20px", background: "#ff336622", border: "1px solid #ff3366", color: "#ff6688", fontFamily: "monospace" }}>
            {error}
          </div>
        ) : status ? (
          <>
            {/* Quick Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
              <div style={{ padding: "10px", background: "#202020", border: "1px solid #333" }}>
                <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Batch Status</span>
                <div style={{ fontSize: "14px", fontWeight: 900, color: status.batch.status === "complete" ? "#00bb77" : "#00f0ff" }}>
                  {status.batch.status.toUpperCase()}
                </div>
              </div>
              <div style={{ padding: "10px", background: "#202020", border: "1px solid #333" }}>
                <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Uploaded Memes</span>
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>
                  {status.batch.uploaded_items} / {status.batch.total_items}
                </div>
              </div>
              <div style={{ padding: "10px", background: "#202020", border: "1px solid #333" }}>
                <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Storage Transferred</span>
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>
                  {formatBytes(status.batch.total_bytes)}
                </div>
              </div>
              <div style={{ padding: "10px", background: "#202020", border: "1px solid #333" }}>
                <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Failed Network Files</span>
                <div style={{ fontSize: "14px", fontWeight: 900, color: (status.batch.upload_failed_items ?? 0) > 0 ? "#ff3366" : "#aaa" }}>
                  {status.batch.upload_failed_items ?? 0}
                </div>
              </div>
            </div>

            {/* Lifecycle Timestamps */}
            <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#bbb", background: "#1a1a1a", padding: "12px", border: "1px solid #2a2a2a", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><strong>Created:</strong> {status.batch.created_at}</div>
              <div><strong>Last Updated:</strong> {status.batch.updated_at}</div>
              <div><strong>Completed:</strong> {status.batch.completed_at || "In progress / Pending"}</div>
              <div><strong>Idempotency Key:</strong> {status.batch.idempotency_key}</div>
            </div>

            {/* Item Breakdown Snippet */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#ffe600", marginBottom: "8px" }}>
                Batch Items ({status.items.length})
              </div>
              <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #333", background: "#121212" }}>
                {status.items.map((item) => (
                  <div
                    key={item.job_id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderBottom: "1px solid #222",
                      fontSize: "11px",
                      fontFamily: "monospace"
                    }}
                  >
                    <span style={{ color: "#ddd", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.original_filename}
                    </span>
                    <span
                      className="badge brutalist-border-sm"
                      style={{
                        fontSize: "9px",
                        background: item.upload_state === "uploaded" ? "#00bb7722" : item.upload_state === "failed" ? "#ff336622" : "#333",
                        color: item.upload_state === "uploaded" ? "#00bb77" : item.upload_state === "failed" ? "#ff3366" : "#aaa"
                      }}
                    >
                      {item.upload_state.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #333", paddingTop: "14px" }}>
              {onInspectInVault && (
                <button
                  type="button"
                  className="brutalist-border-sm"
                  style={{
                    padding: "8px 14px",
                    background: "#ffe600",
                    color: "#000",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  onClick={() => {
                    onClose();
                    onInspectInVault(batchId);
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>filter_alt</span>
                  Inspect this batch in Meme Vault
                </button>
              )}
              <button
                type="button"
                className="brutalist-border-sm"
                style={{ padding: "8px 14px", background: "#333", color: "#fff", cursor: "pointer", marginLeft: "auto" }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
