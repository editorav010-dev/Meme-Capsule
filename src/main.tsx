import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "./admin/AdminApp";
import AdminGate from "./admin/AdminGate";
import CatApp from "./categorise/CatApp";
import CurateApp from "./curate/CurateApp";
import App from "./App";
import "./styles.css";

function RootRouter() {
  const [route, setRoute] = useState(() => ({
    pathname: window.location.pathname,
    hash: window.location.hash
  }));

  useEffect(() => {
    const handleNavigation = () => {
      setRoute({
        pathname: window.location.pathname,
        hash: window.location.hash
      });
    };

    window.addEventListener("hashchange", handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    return () => {
      window.removeEventListener("hashchange", handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  if (route.pathname.startsWith("/admin")) {
    return (
      <div className="admin-theme" style={{ minHeight: "100vh", background: "var(--background)", color: "var(--on-surface)" }}>
        <AdminGate>
          <AdminApp />
        </AdminGate>
      </div>
    );
  }

  if (route.pathname.startsWith("/curate") || route.hash.startsWith("#/curate")) {
    return <CurateApp />;
  }

  if (route.pathname.startsWith("/categorise") || route.hash.startsWith("#/categorise")) {
    return <CatApp />;
  }

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app remains fully usable without the service worker.
    });
  });
}
