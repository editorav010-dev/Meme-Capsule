import React, { useState } from "react";
import { catLogin } from "../categorise/catApi";
import type { CuratorUser } from "./curateTypes";

interface CurateLoginProps {
  onLoginSuccess: (token: string, user: CuratorUser) => void;
}

export default function CurateLogin({ onLoginSuccess }: CurateLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("ENTER BOTH USERNAME AND PASSWORD");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await catLogin(username.trim(), password);
      onLoginSuccess(res.token, res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "INVALID CREDENTIALS — TRY AGAIN";
      setError(msg.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="curate-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "radial-gradient(circle at center, #1e1b24 0%, #121212 100%)" }}>
      <div style={{ width: "100%", maxWidth: "440px", backgroundColor: "#1a1a1a", border: "2px solid #9b30ff", boxShadow: "6px 6px 0px #f4c300", padding: "40px 32px", textAlign: "center" }}>
        <h2 className="curate-anton" style={{ fontSize: "24px", color: "#9b30ff", margin: "0 0 4px 0" }}>
          MEME CAPSULE
        </h2>
        <h1 className="curate-anton" style={{ fontSize: "38px", color: "#f4c300", margin: "0 0 8px 0" }}>
          CURATOR LOGIN
        </h1>
        <p style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#888", marginBottom: "28px" }}>
          EDITORIAL & MULTI-DIMENSIONAL CURATION SYSTEM
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <input
              type="text"
              placeholder="USERNAME (e.g. superadmin, judge1)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: "#121212",
                border: "2px solid #9b30ff",
                color: "#ffffff",
                padding: "12px 14px",
                fontFamily: "Oswald, sans-serif",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: "#121212",
                border: "2px solid #9b30ff",
                color: "#ffffff",
                padding: "12px 14px",
                fontFamily: "Oswald, sans-serif",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: "#9b30ff",
              color: "#ffffff",
              border: "2px solid #f4c300",
              boxShadow: "4px 4px 0px #f4c300",
              padding: "12px",
              fontFamily: "Anton, sans-serif",
              fontSize: "18px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: "pointer"
            }}
          >
            {loading ? "AUTHENTICATING..." : "ENTER CURATOR PORTAL ➔"}
          </button>

          {error && (
            <div style={{ color: "#FF3B30", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: "12px", fontSize: "11px", color: "#666" }}>
            Default accounts: <code>superadmin</code>, <code>judge1</code>, <code>judge2</code>, <code>judge3</code>
          </div>
        </form>
      </div>
    </div>
  );
}
