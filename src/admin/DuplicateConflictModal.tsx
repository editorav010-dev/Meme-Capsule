import React, { useState } from "react";
import { formatBytes, type BulkDraftItem, type ConflictResolution } from "./bulkIngestion";

export type DuplicateConflictItem = {
  item: BulkDraftItem;
  conflictIndex: number;
  totalConflicts: number;
};

interface DuplicateConflictModalProps {
  conflictedItems: BulkDraftItem[];
  onResolve: (clientItemId: string, resolution: ConflictResolution, applyToRemaining: boolean) => void;
  onCancelBatch: () => void;
  onClose: () => void;
}

export default function DuplicateConflictModal({
  conflictedItems,
  onResolve,
  onCancelBatch,
  onClose
}: DuplicateConflictModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [applyToAllRemaining, setApplyToAllRemaining] = useState(false);

  if (conflictedItems.length === 0) return null;

  const safeIndex = Math.min(currentIndex, conflictedItems.length - 1);
  const currentItem = conflictedItems[safeIndex];
  const conflict = currentItem.duplicateConflict;

  const handleAction = (resolution: ConflictResolution) => {
    if (resolution === "cancel") {
      onCancelBatch();
      return;
    }

    onResolve(currentItem.clientItemId, resolution, applyToAllRemaining);
    if (!applyToAllRemaining && safeIndex < conflictedItems.length - 1) {
      // Stay or move to next item
    } else if (applyToAllRemaining || safeIndex >= conflictedItems.length - 1) {
      onClose();
    }
  };

  const remainingCount = conflictedItems.length - safeIndex;

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
          maxWidth: "860px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          border: "3px solid #ff3366"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #333", paddingBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ color: "#ff3366", fontSize: "24px" }}>warning</span>
              <h2 style={{ margin: 0, fontSize: "18px", textTransform: "uppercase", letterSpacing: "1px", color: "#ff3366" }}>
                DUPLICATE FILE CONFLICT DETECTED
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", fontFamily: "monospace", color: "#aaa" }}>
              Item {safeIndex + 1} of {conflictedItems.length} Conflicts ({remainingCount} remaining to resolve)
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

        {/* Side by side comparison */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px"
          }}
        >
          {/* Incoming Upload */}
          <div
            className="brutalist-border-sm"
            style={{
              background: "#1c1c1c",
              padding: "16px",
              border: "2px solid #00f0ff",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 900, color: "#00f0ff", letterSpacing: "1px" }}>
                INCOMING UPLOAD (NEW)
              </span>
              <span className="badge brutalist-border-sm" style={{ background: "#00f0ff22", color: "#00f0ff", fontSize: "10px" }}>
                STAGED DRAFT
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "220px",
                background: "#0a0a0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid #333"
              }}
            >
              {currentItem.previewUrl ? (
                <img
                  src={currentItem.previewUrl}
                  alt={currentItem.fileName}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#444" }}>image</span>
              )}
            </div>

            <div style={{ fontSize: "11px", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div><strong>Filename:</strong> <span style={{ color: "#eee" }}>{currentItem.fileName}</span></div>
              <div><strong>Size:</strong> <span style={{ color: "#eee" }}>{formatBytes(currentItem.byteSize)} ({currentItem.mimeType})</span></div>
              <div style={{ wordBreak: "break-all" }}>
                <strong>SHA-256:</strong> <span style={{ color: "#888" }}>{currentItem.contentHash.slice(0, 24)}...</span>
              </div>
              <div style={{ marginTop: "4px", padding: "4px 8px", background: "#ff336622", borderLeft: "3px solid #ff3366", color: "#ff6688" }}>
                <strong>MATCH REASON:</strong> {conflict?.matchReason || "Exact SHA-256 Content Hash Match"}
              </div>
            </div>
          </div>

          {/* Existing in Collection */}
          <div
            className="brutalist-border-sm"
            style={{
              background: "#1c1c1c",
              padding: "16px",
              border: "2px solid #ffe600",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 900, color: "#ffe600", letterSpacing: "1px" }}>
                EXISTING IN COLLECTION (CURRENT)
              </span>
              <span
                className="badge brutalist-border-sm"
                style={{
                  background: conflict?.existingStatus === "active" ? "#00bb7733" : "#ffe60022",
                  color: conflict?.existingStatus === "active" ? "#00bb77" : "#ffe600",
                  fontSize: "10px",
                  fontWeight: 800
                }}
              >
                {conflict?.existingStatus?.toUpperCase() || "RECORDED"}
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "220px",
                background: "#0a0a0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid #333"
              }}
            >
              {conflict?.existingUrl ? (
                <img
                  src={conflict.existingUrl}
                  alt={conflict.existingTitle || "Existing meme preview"}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#444" }}>cloud_done</span>
              )}
            </div>

            <div style={{ fontSize: "11px", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div><strong>Title / Name:</strong> <span style={{ color: "#eee" }}>{conflict?.existingTitle || conflict?.existingFilename || "Existing Meme"}</span></div>
              <div><strong>Size:</strong> <span style={{ color: "#eee" }}>{conflict?.existingSize ? formatBytes(conflict.existingSize) : "Recorded"} ({conflict?.existingMimeType || "image"})</span></div>
              <div style={{ wordBreak: "break-all" }}>
                <strong>SHA-256:</strong> <span style={{ color: "#00bb77" }}>{currentItem.contentHash.slice(0, 24)}... (MATCH)</span>
              </div>
              <div>
                <strong>Meme ID:</strong> <span style={{ color: "#ffe600" }}>{conflict?.existingMemeId || conflict?.existingJobId || "Recorded Job"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Action Toggle */}
        {remainingCount > 1 && (
          <div
            style={{
              padding: "10px 14px",
              background: "#222",
              border: "1px solid #444",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer"
            }}
            onClick={() => setApplyToAllRemaining(!applyToAllRemaining)}
          >
            <input
              type="checkbox"
              id="apply-remaining-checkbox"
              checked={applyToAllRemaining}
              onChange={(e) => setApplyToAllRemaining(e.target.checked)}
              style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#00f0ff" }}
            />
            <label htmlFor="apply-remaining-checkbox" style={{ cursor: "pointer", fontSize: "12px", fontWeight: 700, color: applyToAllRemaining ? "#00f0ff" : "#ddd" }}>
              Apply this action to all {remainingCount} remaining conflicts
            </label>
          </div>
        )}

        {/* Actions Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #333",
            paddingTop: "16px"
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="brutalist-border-sm brutalist-shadow-black"
              style={{
                padding: "10px 16px",
                background: "#222",
                color: "#00bb77",
                border: "2px solid #00bb77",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onClick={() => handleAction("keep_existing")}
              title="Keep the existing collection meme and skip uploading this incoming file"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
              1. Keep Existing (Skip Incoming)
            </button>

            <button
              type="button"
              className="brutalist-border-sm brutalist-shadow-black"
              style={{
                padding: "10px 16px",
                background: "#ffe600",
                color: "#000",
                border: "2px solid #ffe600",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onClick={() => handleAction("replace_existing")}
              title="Upload new file and replace existing media in R2/D1 while preserving meme identity and curation"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>swap_horiz</span>
              2. Replace Existing with New
            </button>
          </div>

          <button
            type="button"
            className="brutalist-border-sm"
            style={{
              padding: "10px 16px",
              background: "transparent",
              color: "#ff3366",
              border: "1px solid #ff3366",
              fontWeight: 700,
              cursor: "pointer"
            }}
            onClick={() => handleAction("cancel")}
          >
            3. Cancel Batch
          </button>
        </div>
      </div>
    </div>
  );
}
