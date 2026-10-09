import { useState, useEffect, useCallback } from "react";
import type { CatUser } from "../catTypes";
import { catForceRemove } from "../catApi";

interface ForceRemovalRecord {
  id: string;
  meme_id: string;
  title: string | null;
  removed_by_name: string;
  reason: string | null;
  r2_deleted: number;
  r2_error: string | null;
  removed_at: string;
}

interface ForceRemovalAuditProps {
  token: string;
  user?: CatUser;
}

export default function ForceRemovalAudit({ token }: ForceRemovalAuditProps) {
  const [removals, setRemovals] = useState<ForceRemovalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  const loadRemovals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/cat/admin/force-removals", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRemovals(data.removals || []);
      } else {
        setError(data.error || "Failed to load force removals");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading removals");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRemovals();
  }, [loadRemovals]);

  const handleRetry = async (memeId: string) => {
    setRetrying((prev) => new Set(prev).add(memeId));
    try {
      await catForceRemove(token, memeId);
      // Reload list
      await loadRemovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying((prev) => {
        const next = new Set(prev);
        next.delete(memeId);
        return next;
      });
    }
  };

  if (loading) {
    return <div style={{ fontSize: "14px", color: "#8e8e93" }}>LOADING FORCE REMOVALS...</div>;
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2 className="cat-font-anton cat-text-gold" style={{ fontSize: "20px", margin: "0 0 16px 0" }}>
        FORCE REMOVED MEMES
      </h2>

      {error && (
        <div style={{ background: "#3d1f1f", color: "#FF3B30", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", border: "1px solid #663333" }}>
          {error}
        </div>
      )}

      {removals.length === 0 ? (
        <div style={{ fontSize: "13px", color: "#8e8e93" }}>NO FORCE REMOVALS YET</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: "monospace"
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #f4c300" }}>
                <th style={{ textAlign: "left", padding: "8px", color: "#f4c300", fontWeight: "bold" }}>
                  MEME ID
                </th>
                <th style={{ textAlign: "left", padding: "8px", color: "#f4c300", fontWeight: "bold" }}>
                  TITLE
                </th>
                <th style={{ textAlign: "left", padding: "8px", color: "#f4c300", fontWeight: "bold" }}>
                  REMOVED BY
                </th>
                <th style={{ textAlign: "left", padding: "8px", color: "#f4c300", fontWeight: "bold" }}>
                  TIME
                </th>
                <th style={{ textAlign: "left", padding: "8px", color: "#f4c300", fontWeight: "bold" }}>
                  REASON
                </th>
                <th style={{ textAlign: "center", padding: "8px", color: "#f4c300", fontWeight: "bold" }}>
                  R2 STATUS
                </th>
                <th style={{ textAlign: "center", padding: "8px", color: "#f4c300", fontWeight: "bold" }}>
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {removals.map((removal) => {
                const isDeleted = removal.r2_deleted === 1;
                const isFailed = removal.r2_deleted === 0;
                const isRetrying = retrying.has(removal.meme_id);

                return (
                  <tr key={removal.id} style={{ borderBottom: "1px solid #333", background: isDeleted ? "#1c1b1b" : "#262626" }}>
                    <td style={{ padding: "8px", color: "#34C759" }}>
                      {removal.meme_id}
                    </td>
                    <td style={{ padding: "8px", color: "#ddd", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {removal.title || "(untitled)"}
                    </td>
                    <td style={{ padding: "8px", color: "#9b30ff" }}>
                      {removal.removed_by_name}
                    </td>
                    <td style={{ padding: "8px", color: "#8e8e93" }}>
                      {new Date(removal.removed_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "8px", color: "#8e8e93", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {removal.reason || "—"}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        color: isDeleted ? "#34C759" : isFailed ? "#FF9500" : "#8e8e93",
                        fontWeight: "bold"
                      }}
                    >
                      {isDeleted ? "✓ DELETED" : isFailed ? "✗ FAILED" : "PENDING"}
                    </td>
                    <td style={{ textAlign: "center", padding: "8px" }}>
                      {isFailed && (
                        <button
                          onClick={() => handleRetry(removal.meme_id)}
                          disabled={isRetrying}
                          style={{
                            padding: "4px 8px",
                            background: "#FF9500",
                            border: "1px solid #FF9500",
                            color: "#000",
                            fontSize: "11px",
                            fontFamily: "Oswald",
                            cursor: isRetrying ? "not-allowed" : "pointer",
                            opacity: isRetrying ? 0.6 : 1
                          }}
                        >
                          {isRetrying ? "RETRYING..." : "RETRY"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
