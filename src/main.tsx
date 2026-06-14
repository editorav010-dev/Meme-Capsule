import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "./admin/AdminApp";
import AdminGate from "./admin/AdminGate";
import App from "./App";
import "./styles.css";

const Root = window.location.pathname.startsWith("/admin") 
  ? () => (
      <div className="admin-theme" style={{ minHeight: "100vh", background: "var(--background)", color: "var(--on-surface)" }}>
        <AdminGate><AdminApp /></AdminGate>
      </div>
    )
  : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app remains fully usable without the service worker.
    });
  });
}
