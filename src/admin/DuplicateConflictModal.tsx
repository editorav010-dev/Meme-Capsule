import React, { useState } from "react";
import { formatBytes, type BulkDraftItem, type ConflictResolution } from "./bulkIngestion";

interface DuplicateConflictModalProps {
  conflictedItems: BulkDraftItem[];
  onResolveBatch: (resolutions: Record<string, ConflictResolution>) => void;
  onCancelBatch: () => void;
  onClose: () => void;
}

export default function DuplicateConflictModal({
  conflictedItems,
  onResolveBatch,
  onCancelBatch,
  onClose
}: DuplicateConflictModalProps) {
  // Pre-populate all conflicts with "keep_existing" by default for safety
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>(() => {
    const initial: Record<string, ConflictResolution> = {};
    for (const item of conflictedItems) {
      initial[item.clientItemId] = item.resolution || "keep_existing";
    }
    return initial;
  });

  if (conflictedItems.length === 0) return null;

  const setSingleResolution = (clientItemId: string, res: ConflictResolution) => {
    setResolutions((prev) => ({ ...prev, [clientItemId]: res }));
  };

  const applyBulk = (res: ConflictResolution) => {
    setResolutions((prev) => {
      const next = { ...prev };
      for (const item of conflictedItems) {
        next[item.clientItemId] = res;
      }
      return next;
    });
  };

  const keepCount = Object.values(resolutions).filter((r) => r === "keep_existing").length;
  const replaceCount = Object.values(resolutions).filter((r) => r === "replace_existing").length;

  const handleConfirmAndProceed = () => {
    onResolveBatch(resolutions);
    onClose();
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="brutalist-border brutalist-shadow-black"
        style={{
          background: "#141414",
          color: "#fff",
          maxWidth: "960px",
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          padding: "20px",
          border: "3px solid #ff3366"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #2a2a2a", paddingBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ color: "#ff3366", fontSize: "24px" }}>content_copy</span>
              <h2 style={{ margin: 0, fontSize: "17px", textTransform: "uppercase", letterSpacing: "1px", color: "#ff3366" }}>
                DUPLICATE FILE CONFLICT RESOLVER
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", fontFamily: "monospace", color: "#aaa" }}>
              {conflictedItems.length} duplicate conflicts detected. Choose whether to keep the existing collection meme or replace its media.
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
              padding: "2px 8px",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Global Bulk Action Strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#1c1c1c",
            padding: "8px 12px",
            border: "1px solid #333",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#ddd" }}>
            <strong>BULK ACTIONS FOR ALL {conflictedItems.length} CONFLICTS:</strong>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="brutalist-border-sm"
              onClick={() => applyBulk("keep_existing")}
              style={{
                background: keepCount === conflictedItems.length ? "#00bb77" : "#222",
                color: keepCount === conflictedItems.length ? "#000" : "#00dd88",
                border: "1px solid #00bb77",
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span>
              Keep All Existing ({conflictedItems.length})
            </button>
            <button
              type="button"
              className="brutalist-border-sm"
              onClick={() => applyBulk("replace_existing")}
              style={{
                background: replaceCount === conflictedItems.length ? "#ffe600" : "#222",
                color: replaceCount === conflictedItems.length ? "#000" : "#ffe600",
                border: "1px solid #ffe600",
                padding: "5px 12px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>swap_horiz</span>
              Replace All with New ({conflictedItems.length})
            </button>
          </div>
        </div>

        {/* Scrollable File Explorer Conflict List Table */}
        <div
          style={{
            flex: 1,
            maxHeight: "55vh",
            overflowY: "auto",
            border: "1px solid #333",
            background: "#0c0c0c"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "11px", fontFamily: "monospace" }}>
            <thead style={{ position: "sticky", top: 0, background: "#1c1c1c", zIndex: 2, borderBottom: "2px solid #333" }}>
              <tr>
                <th style={{ padding: "8px 10px", color: "#00f0ff", width: "35%" }}>INCOMING FILE (NEW)</th>
                <th style={{ padding: "8px 10px", color: "#ffe600", width: "35%" }}>EXISTING IN COLLECTION (CURRENT)</th>
                <th style={{ padding: "8px 10px", color: "#ff3366", width: "30%" }}>RESOLUTION ACTION</th>
              </tr>
            </thead>
            <tbody>
              {conflictedItems.map((item, idx) => {
                const conflict = item.duplicateConflict;
                const currentRes = resolutions[item.clientItemId] || "keep_existing";

                return (
                  <tr
                    key={item.clientItemId}
                    style={{
                      borderBottom: "1px solid #222",
                      background: idx % 2 === 0 ? "#111" : "#161616"
                    }}
                  >
                    {/* Incoming Upload */}
                    <td style={{ padding: "8px 10px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            background: "#050505",
                            border: "1px solid #00f0ff55",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0
                          }}
                        >
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.fileName}
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#444" }}>image</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span
                            style={{ color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}
                            title={item.fileName}
                          >
                            {item.fileName}
                          </span>
                          <span style={{ color: "#888", fontSize: "10px" }}>
                            {formatBytes(item.byteSize)} • {item.mimeType}
                          </span>
                          <span style={{ color: "#ff8899", fontSize: "9px" }}>
                            {conflict?.matchReason || "Exact SHA-256 match"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Existing Collection Meme */}
                    <td style={{ padding: "8px 10px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            background: "#050505",
                            border: "1px solid #ffe60055",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0
                          }}
                        >
                          {conflict?.existingUrl ? (
                            <img
                              src={conflict.existingUrl}
                              alt={conflict.existingTitle}
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#ffe600" }}>collections</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span
                            style={{ color: "#eee", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}
                            title={conflict?.existingTitle || conflict?.existingFilename || "Existing meme"}
                          >
                            {conflict?.existingTitle || conflict?.existingFilename || "Existing meme"}
                          </span>
                          <span style={{ color: "#888", fontSize: "10px" }}>
                            {conflict?.existingSize ? formatBytes(conflict.existingSize) : "Existing"} • Status:{" "}
                            <span style={{ color: conflict?.existingStatus === "active" ? "#00bb77" : "#ffe600" }}>
                              {(conflict?.existingStatus || "draft").toUpperCase()}
                            </span>
                          </span>
                          <span style={{ color: "#666", fontSize: "9px" }}>
                            ID: {conflict?.existingMemeId ? `${conflict.existingMemeId.slice(0, 16)}...` : "Collection"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Resolution Action Toggles */}
                    <td style={{ padding: "8px 10px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="brutalist-border-sm"
                          onClick={() => setSingleResolution(item.clientItemId, "keep_existing")}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            background: currentRes === "keep_existing" ? "#00bb77" : "#1a1a1a",
                            color: currentRes === "keep_existing" ? "#000" : "#aaa",
                            border: `1px solid ${currentRes === "keep_existing" ? "#00bb77" : "#333"}`,
                            fontSize: "10px",
                            fontWeight: 800,
                            cursor: "pointer",
                            textAlign: "center"
                          }}
                          title="Skip the incoming duplicate and keep the existing meme"
                        >
                          {currentRes === "keep_existing" ? "✓ KEEPING EXISTING" : "Keep Existing"}
                        </button>
                        <button
                          type="button"
                          className="brutalist-border-sm"
                          onClick={() => setSingleResolution(item.clientItemId, "replace_existing")}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            background: currentRes === "replace_existing" ? "#ffe600" : "#1a1a1a",
                            color: currentRes === "replace_existing" ? "#000" : "#aaa",
                            border: `1px solid ${currentRes === "replace_existing" ? "#ffe600" : "#333"}`,
                            fontSize: "10px",
                            fontWeight: 800,
                            cursor: "pointer",
                            textAlign: "center"
                          }}
                          title="Swap R2 image and update D1 storage_path, keeping meme ID and curation history"
                        >
                          {currentRes === "replace_existing" ? "⇄ REPLACING" : "Replace Media"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #2a2a2a", paddingTop: "12px" }}>
          <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#bbb" }}>
            Resolution Summary: <strong style={{ color: "#00dd88" }}>{keepCount} Keep Existing (Skip)</strong>, <strong style={{ color: "#ffe600" }}>{replaceCount} Replace Media</strong>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="brutalist-border-sm"
              onClick={onCancelBatch}
              style={{
                padding: "8px 14px",
                background: "#222",
                color: "#ff6688",
                border: "1px solid #ff3366",
                fontWeight: 700,
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              Cancel Entire Batch
            </button>
            <button
              type="button"
              className="brutalist-border-sm"
              onClick={handleConfirmAndProceed}
              style={{
                padding: "8px 18px",
                background: "#00bb77",
                color: "#000",
                fontWeight: 900,
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>done_all</span>
              Apply All Decisions & Continue Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
