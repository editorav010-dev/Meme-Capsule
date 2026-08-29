import React, { useState } from "react";
import { catLogin } from "./catApi";
import type { CatUser } from "./catTypes";

interface CatLoginProps {
  onLoginSuccess: (token: string, user: CatUser) => void;
}

export default function CatLogin({ onLoginSuccess }: CatLoginProps) {
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
    } catch {
      setError("INVALID CREDENTIALS — TRY AGAIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cat-root cat-login-container">
      <div className="cat-login-card">
        <h2 className="cat-login-title">MEME CAPSULE</h2>
        <h1 className="cat-login-subtitle">JUDGE LOGIN</h1>
        <p className="cat-login-tagline">
          CATEGORISATION SYSTEM — AUTHORISED PERSONNEL ONLY
        </p>

        <form onSubmit={handleSubmit} className="cat-login-form">
          <div>
            <input
              type="text"
              className="cat-input"
              placeholder="USERNAME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              className="cat-input"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="cat-btn-primary" disabled={loading}>
            {loading ? "LOGGING IN..." : "LOG IN"}
          </button>

          {error && <div className="cat-error-box">{error}</div>}
        </form>
      </div>
    </div>
  );
}
