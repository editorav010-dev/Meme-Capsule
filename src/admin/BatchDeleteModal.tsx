import React, { useState } from "react";
import { deleteIngestionBatch } from "../lib/adminApi";
import { formatBytes } from "./bulkIngestion";

interface BatchDeleteModalProps {
  batchId: string;
  totalItems: number;
  totalBytes: number;
  adminToken: string;
  onClose: () => void;
  onDeleted: (batchId: string) => void;
}

export default function BatchDeleteModal({
  batchId,
  totalItems,
  totalBytes,
  adminToken,
  onClose,
  onDeleted
}: BatchDeleteModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmPurge = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteIngestionBatch(adminToken, batchId);
      onDeleted(batchId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purge batch.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        className="brutalist-border brutalist-shadow-black"
        style={{
          background: "#161616",
          color: "#fff",
          maxWidth: "560px",
          width: "100%",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          border: "3px solid #ff3366"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #333", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="material-symbols-outlined" style={{ color: "#ff3366", fontSize: "24px" }}>delete_forever</span>
            <h2 style={{ margin: 0, fontSize: "17px", textTransform: "uppercase", letterSpacing: "1px", color: "#ff3366" }}>
              {step === 1 ? "PURGE BATCH — STEP 1 OF 2" : "FINAL CONFIRMATION — STEP 2 OF 2"}
            </h2>
          </div>
          {!isDeleting && (
            <button
              type="button"
              className="brutalist-border-sm"
              onClick={onClose}
              style={{
                background: "#222",
                color: "#fff",
                border: "1px solid #444",
                padding: "2px 8px",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: "12px", background: "#ff336622", border: "1px solid #ff3366", color: "#ff6688", fontSize: "12px", fontFamily: "monospace" }}>
            {error}
          </div>
        )}

        {step === 1 ? (
          <>
            {/* Step 1: Impact Assessment */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", lineHeight: "1.5" }}>
              <p style={{ margin: 0 }}>
                You are preparing to purge batch <code style={{ color: "#ffe600", background: "#222", padding: "2px 6px" }}>{batchId}</code>.
              </p>
              <div style={{ background: "#202020", padding: "12px", border: "1px solid #333", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontFamily: "monospace", fontSize: "11px" }}>
                <div><strong>Total Items:</strong> {totalItems}</div>
                <div><strong>R2 Storage Footprint:</strong> {formatBytes(totalBytes)}</div>
              </div>
              <div style={{ background: "#ff336618", borderLeft: "4px solid #ff3366", padding: "10px 14px", color: "#ff8899", fontSize: "12px" }}>
                <strong>WARNING:</strong> This action permanently wipes all uncurated draft memes, ingestion jobs, AI evaluation logs, and R2 media files belonging exclusively to this batch.
              </div>
              <div style={{ background: "#00bb7718", borderLeft: "4px solid #00bb77", padding: "10px 14px", color: "#00dd88", fontSize: "12px" }}>
                <strong>PROTECTION GUARANTEE:</strong> Any meme from this batch that has already been approved and published to the active collection (<code>is_active = 1</code>) is strictly protected and will NOT be deleted.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "2px solid #333", paddingTop: "14px" }}>
              <button
                type="button"
                className="brutalist-border-sm"
                style={{ padding: "8px 14px", background: "#333", color: "#fff", cursor: "pointer" }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="brutalist-border-sm"
                style={{
                  padding: "8px 16px",
                  background: "#ff3366",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                onClick={() => setStep(2)}
              >
                Proceed to Final Confirmation →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Deliberate Action */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <p style={{ margin: 0, color: "#ffe600", fontWeight: 700 }}>
                Are you absolutely sure you want to permanently purge this batch?
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#aaa" }}>
                All draft media and records for <code style={{ color: "#fff" }}>{batchId}</code> will be removed from Cloudflare R2 and D1 immediately.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "2px solid #333", paddingTop: "14px" }}>
              <button
                type="button"
                className="brutalist-border-sm"
                style={{ padding: "8px 14px", background: "#333", color: "#fff", cursor: "pointer" }}
                onClick={() => setStep(1)}
                disabled={isDeleting}
              >
                ← Back
              </button>
              <button
                type="button"
                className="brutalist-border-sm"
                style={{
                  padding: "8px 16px",
                  background: "#ff2a2a",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: isDeleting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                disabled={isDeleting}
                onClick={handleConfirmPurge}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete_forever</span>
                {isDeleting ? "Purging from R2 and D1..." : "CONFIRM COMPLETE PURGE"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
