import React, { useState } from "react";

interface SqlRunnerProps {
  adminToken: string;
}

export default function SqlRunner({ adminToken }: SqlRunnerProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [meta, setMeta] = useState<any | null>(null);

  const handleRun = async () => {
    if (!query.trim()) {
      setError("Query cannot be empty.");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);
    setMeta(null);

    try {
      const res = await fetch("/api/admin/sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ query }),
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error("Server returned an invalid or HTML response. Endpoint might be missing.");
      }

      if (!data.success) {
        throw new Error(data.error || "Query failed.");
      }

      setResults(data.results);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!results || results.length === 0) return;
    
    const columns = Object.keys(results[0]);
    const headerRow = columns.map(col => `"${col.replace(/"/g, '""')}"`).join(",");
    
    const dataRows = results.map(row => {
      return columns.map(col => {
        let val = row[col];
        if (typeof val === "object" && val !== null) {
          val = JSON.stringify(val);
        } else if (val === null) {
          val = "NULL";
        } else {
          val = String(val);
        }
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(",");
    });
    
    const csvContent = [headerRow, ...dataRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sql_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTable = () => {
    if (!results) return null;
    if (results.length === 0) {
      return <div style={{ padding: "16px", color: "var(--outline)" }}>Query executed successfully. No rows returned.</div>;
    }

    const columns = Object.keys(results[0]);

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "var(--on-surface)" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    background: "var(--surface-container-high)",
                    borderBottom: "2px solid var(--outline)",
                    color: "var(--on-surface)",
                    fontWeight: 700,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                {columns.map((col) => (
                  <td key={col} style={{ padding: "12px", verticalAlign: "top" }}>
                    {typeof row[col] === "object" && row[col] !== null
                      ? JSON.stringify(row[col])
                      : String(row[col] ?? "NULL")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", color: "var(--on-surface)" }}>
      {/* Header Area */}
      <div style={{ padding: "24px", borderBottom: "4px solid black", background: "var(--surface-container)" }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", textTransform: "uppercase", color: "var(--on-surface)" }}>SQL Playground</h2>
        <p style={{ margin: 0, color: "var(--outline)", fontSize: "14px" }}>
          Execute raw D1 queries directly. Note: D1 limits payload sizes. Use LIMIT for large tables.
        </p>

        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <textarea
            className="brutalist-input custom-scrollbar"
            style={{
              width: "100%",
              height: "150px",
              fontFamily: "monospace",
              fontSize: "16px",
              padding: "16px",
              resize: "vertical",
              background: "var(--surface-container-lowest)",
              color: "var(--on-surface)",
              border: "2px solid black"
            }}
            placeholder="SELECT * FROM memes LIMIT 10;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                handleRun();
              }
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={handleRun}
              disabled={loading}
              className="btn-primary brutalist-border brutalist-shadow-black brutalist-interactive"
              style={{ width: "fit-content", padding: "12px 32px", fontSize: "16px" }}
            >
              {loading ? "Executing..." : "Run Query"}
            </button>
            <span style={{ fontSize: "12px", color: "var(--outline)", marginRight: "auto" }}>Cmd/Ctrl + Enter</span>
            
            {results && results.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="brutalist-border brutalist-shadow-black brutalist-interactive"
                style={{ 
                  background: "var(--tertiary-container)", 
                  color: "var(--on-tertiary-container)", 
                  padding: "12px 24px", 
                  fontSize: "14px",
                  fontWeight: "bold",
                  textTransform: "uppercase"
                }}
              >
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div style={{ flex: 1, overflow: "auto", background: "var(--background)", padding: "24px" }} className="custom-scrollbar">
        {error && (
          <div style={{ padding: "16px", background: "var(--error-container)", color: "var(--on-error-container)", border: "2px solid var(--error)", fontWeight: 700, marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", opacity: 0.8, marginBottom: "4px" }}>Execution Error</div>
            {error}
          </div>
        )}

        {meta && !error && (
          <div style={{ display: "flex", gap: "24px", marginBottom: "16px", fontSize: "12px", color: "var(--outline)" }}>
            <span><strong style={{ color: "var(--primary)" }}>Duration:</strong> {meta.duration.toFixed(2)}ms</span>
            <span><strong style={{ color: "var(--primary)" }}>Rows Read:</strong> {meta.rows_read}</span>
            <span><strong style={{ color: "var(--primary)" }}>Rows Written:</strong> {meta.rows_written}</span>
            <span><strong style={{ color: "var(--primary)" }}>Size After:</strong> {meta.size_after} bytes</span>
          </div>
        )}

        <div className="brutalist-border-sm" style={{ background: "var(--surface-container-lowest)", minHeight: "200px" }}>
          {renderTable()}
          {!results && !loading && !error && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--outline-variant)" }}>
              Awaiting query...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
