import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

interface AdminGateProps {
  children: React.ReactNode;
}

export default function AdminGate({ children }: AdminGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedPin = sessionStorage.getItem("admin-pin");
    const validPin = import.meta.env.VITE_ADMIN_PIN || "123456";
    if (savedPin && validPin && savedPin === validPin) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validPin = import.meta.env.VITE_ADMIN_PIN || "123456";
    
    if (!validPin) {
      setError("Admin PIN not configured on server (VITE_ADMIN_PIN missing)");
      return;
    }

    if (pin === validPin) {
      sessionStorage.setItem("admin-pin", pin);
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid PIN");
      setPin("");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "var(--background)",
      color: "var(--on-background)",
      fontFamily: "var(--font-sans)"
    }}>
      <form 
        onSubmit={handleSubmit}
        style={{
          padding: "32px",
          borderRadius: "16px",
          background: "var(--surface)",
          border: "1px solid var(--outline-variant)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "24px"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{ 
            width: "56px", 
            height: "56px", 
            borderRadius: "50%", 
            background: "var(--primary-container)", 
            color: "var(--on-primary-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>Restricted Access</h2>
          <p style={{ margin: 0, color: "var(--on-surface-variant)", textAlign: "center", fontSize: "14px" }}>
            Enter your admin PIN to access this area.
          </p>
        </div>

        <div>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN..."
            autoFocus
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "8px",
              border: `2px solid ${error ? "var(--error)" : "var(--outline)"}`,
              background: "var(--surface-container-highest)",
              color: "var(--on-surface)",
              fontSize: "18px",
              letterSpacing: "4px",
              textAlign: "center",
              outline: "none",
              transition: "border-color 0.2s"
            }}
          />
          {error && <p style={{ color: "var(--error)", margin: "8px 0 0 0", fontSize: "14px", textAlign: "center" }}>{error}</p>}
        </div>

        <button 
          type="submit"
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "8px",
            background: "var(--primary)",
            color: "var(--on-primary)",
            border: "none",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 0.2s"
          }}
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
