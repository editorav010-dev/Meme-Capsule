import { useState } from "react";
import { useCatAuth } from "./useCatAuth";
import CatLogin from "./CatLogin";
import CatInterface from "./CatInterface";
import CatComplete from "./CatComplete";
import SuperDashboard from "./superadmin/SuperDashboard";
import "./cat.css";

export default function CatApp() {
  const { token, user, isLoading, isSuperAdmin, login, logout } = useCatAuth();
  const [isCompleted, setIsCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<"judge" | "superadmin">("superadmin");

  if (isLoading) {
    return (
      <div className="cat-root cat-login-container">
        <div className="cat-text-gold cat-font-anton" style={{ fontSize: "24px" }}>
          INITIALIZING CATEGORISATION PORTAL...
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <CatLogin onLoginSuccess={login} />;
  }

  // Superadmin Dashboard View
  if (isSuperAdmin && viewMode === "superadmin") {
    return (
      <SuperDashboard
        token={token}
        user={user}
        onLogout={logout}
        onSwitchToJudgeMode={() => setViewMode("judge")}
      />
    );
  }

  // Completion Screen View
  if (isCompleted) {
    return (
      <CatComplete
        user={user}
        onLogout={logout}
        onRestart={() => setIsCompleted(false)}
      />
    );
  }

  // Standard Judge Keyboard Interface View
  return (
    <CatInterface
      token={token}
      user={user}
      onLogout={logout}
      onAllDone={() => setIsCompleted(true)}
    />
  );
}
