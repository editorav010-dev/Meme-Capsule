import { useState, useEffect, useRef, useCallback } from "react";
import { MEME_CATEGORIES, type CatNextMeme, type CatUser } from "./catTypes";
import { catGetNextMeme, catSubmitDecision, catGetMe } from "./catApi";

interface CatInterfaceProps {
  token: string;
  user: CatUser;
  onLogout: () => void;
  onAllDone: () => void;
}

interface DecisionHistoryItem {
  meme: CatNextMeme;
  categoryId: number;
  confidence: number;
}

export default function CatInterface({ token, user, onLogout, onAllDone }: CatInterfaceProps) {
  const [currentMeme, setCurrentMeme] = useState<CatNextMeme | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(3);
  const [history, setHistory] = useState<DecisionHistoryItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>({});
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [showStats, setShowStats] = useState<boolean>(false);
  const [nextPrefetchedMeme, setNextPrefetchedMeme] = useState<CatNextMeme | null>(null);

  const isSubmittingRef = useRef(false);

  // Preload an image URL into browser cache
  const preloadImage = (url: string) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  };

  // Fetch initial meme & user stats
  const loadNextMeme = useCallback(async () => {
    try {
      setLoading(true);
      const res = await catGetNextMeme(token);
      if (!res.meme) {
        onAllDone();
        return;
      }
      setCurrentMeme(res.meme);
      preloadImage(res.meme.image_url);

      // Also refresh initial total metrics
      catGetMe(token).catch(() => {});
    } catch (err) {
      console.error("Failed to load next meme:", err);
    } finally {
      setLoading(false);
    }
  }, [token, onAllDone]);

  useEffect(() => {
    loadNextMeme();
  }, [loadNextMeme]);

  // Handle classification action
  const handleCategorise = useCallback(async (catId: number, conf: number = confidence) => {
    if (!currentMeme || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSelectedKey(catId);

    const memeBeingDecided = currentMeme;

    // Track local session stats
    if (catId > 0) {
      setCategoryCounts((prev) => ({ ...prev, [catId]: (prev[catId] || 0) + 1 }));
    }
    setSessionCount((prev) => prev + 1);

    // Save to undo history
    setHistory((prev) => [...prev.slice(-30), { meme: memeBeingDecided, categoryId: catId, confidence: conf }]);

    // Non-blocking fire-and-forget API call with next meme preload
    catSubmitDecision(token, {
      meme_id: memeBeingDecided.id,
      category_id: catId,
      confidence: conf
    }).then((res) => {
      if (res.next_meme_id && (!nextPrefetchedMeme || nextPrefetchedMeme.id !== res.next_meme_id)) {
        // Pre-fetch next meme info in background
        catGetNextMeme(token).then((nextRes) => {
          if (nextRes.meme) {
            setNextPrefetchedMeme(nextRes.meme);
            preloadImage(nextRes.meme.image_url);
          }
        }).catch(() => {});
      }
    }).catch(console.error);

    // Fast 220ms auto-advance transition for distraction-free classifying
    setTimeout(async () => {
      setSelectedKey(null);
      isSubmittingRef.current = false;

      if (nextPrefetchedMeme && nextPrefetchedMeme.id !== memeBeingDecided.id) {
        setCurrentMeme(nextPrefetchedMeme);
        setNextPrefetchedMeme(null);
      } else {
        await loadNextMeme();
      }
    }, 220);
  }, [currentMeme, confidence, nextPrefetchedMeme, token, loadNextMeme]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0 || isSubmittingRef.current) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentMeme(last.meme);
    if (last.categoryId > 0) {
      setCategoryCounts((prev) => ({
        ...prev,
        [last.categoryId]: Math.max(0, (prev[last.categoryId] || 1) - 1)
      }));
    }
  }, [history]);

  // Global Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs/textareas
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Number keys 1-7
      if (["1", "2", "3", "4", "5", "6", "7"].includes(key)) {
        e.preventDefault();
        handleCategorise(parseInt(key, 10));
        return;
      }

      // Space to skip
      if (e.code === "Space" || key === " ") {
        e.preventDefault();
        handleCategorise(0); // 0 indicates skip
        return;
      }

      // Confidence modifiers (Q=low, W=medium, E=high)
      if (key === "q") {
        setConfidence(1);
        return;
      }
      if (key === "w") {
        setConfidence(3);
        return;
      }
      if (key === "e") {
        setConfidence(5);
        return;
      }

      // Undo on Z
      if (key === "z" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Arrow Left / Right
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Tab toggles session stats sidebar
      if (e.key === "Tab") {
        e.preventDefault();
        setShowStats((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCategorise, handleUndo]);

  const elapsedMins = Math.max(0.1, (Date.now() - sessionStartTime) / 60000);
  const memesPerMin = Math.round(sessionCount / elapsedMins);
  const progressPercent = currentMeme && currentMeme.total > 0
    ? Math.min(100, Math.round(((currentMeme.position - 1) / currentMeme.total) * 100))
    : 0;

  return (
    <div className="cat-root">
      {/* Top Bar */}
      <header className="cat-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span className="cat-font-anton cat-text-purple" style={{ fontSize: "19px" }}>
            MEME CAPSULE JUDGE
          </span>
          <span style={{ fontSize: "11px", background: "#262626", padding: "2px 8px", borderRadius: "2px", color: "#8e8e93" }}>
            {user.role.toUpperCase()}
          </span>
        </div>

        <div style={{ textAlign: "center" }}>
          <span className="cat-font-oswald cat-text-gold" style={{ fontSize: "14px", letterSpacing: "1px" }}>
            MEME {currentMeme?.position || 0} / {currentMeme?.total || "..."}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span className="cat-text-muted" style={{ fontSize: "13px" }}>
            {user.display_name}
          </span>
          <button
            onClick={() => setShowStats((p) => !p)}
            style={{ background: "transparent", border: "1px solid #444", color: "#f4c300", padding: "4px 8px", cursor: "pointer", fontSize: "11px", fontFamily: "Oswald" }}
            title="Toggle Session Stats (Tab)"
          >
            {showStats ? "HIDE STATS" : "STATS (TAB)"}
          </button>
          <button
            onClick={onLogout}
            style={{ background: "transparent", border: "none", color: "#dd0061", cursor: "pointer", fontSize: "12px", fontFamily: "Oswald", letterSpacing: "0.5px" }}
          >
            LOG OUT
          </button>
        </div>

        <div className="cat-progress-track">
          <div className="cat-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      {/* Main Layout */}
      <main className="cat-main-layout">
        {/* Left Column: Meme Display */}
        <section className="cat-meme-col">
          <div className="cat-meme-frame">
            {loading && !currentMeme ? (
              <div className="cat-text-muted" style={{ fontSize: "15px" }}>LOADING MEME...</div>
            ) : currentMeme ? (
              <img
                key={currentMeme.id}
                src={currentMeme.image_url}
                alt={currentMeme.title}
                className="cat-meme-image"
              />
            ) : (
              <div className="cat-text-muted">NO ACTIVE MEME</div>
            )}
          </div>

          {currentMeme && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 2px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#8e8e93", fontFamily: "monospace" }}>
                  ID: {currentMeme.id}
                </div>
                <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 500 }}>
                  {currentMeme.title}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  style={{ background: "#222", border: "1px solid #444", color: "#ddd", padding: "4px 10px", fontSize: "11px", cursor: "pointer", opacity: history.length ? 1 : 0.4 }}
                  title="Undo last decision (Z)"
                >
                  ← PREV (Z)
                </button>
                <button
                  onClick={() => handleCategorise(0)}
                  style={{ background: "#262626", border: "1px solid #dd0061", color: "#dd0061", padding: "4px 10px", fontSize: "11px", cursor: "pointer" }}
                  title="Skip this meme (Space)"
                >
                  SKIP (SPACE)
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Category Selection Buttons */}
        <section className="cat-category-col">
          <div style={{ marginBottom: "2px" }}>
            <h2 className="cat-font-anton cat-text-gold" style={{ fontSize: "24px", margin: "0 0 2px 0" }}>
              SELECT CATEGORY
            </h2>
            <p className="cat-text-muted" style={{ fontSize: "11px", letterSpacing: "1px", margin: 0 }}>
              USE KEYS 1–7 TO CATEGORISE · SPACE TO SKIP · Z TO UNDO
            </p>
          </div>

          {/* 7 Category Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {MEME_CATEGORIES.map((cat) => {
              const isSelected = selectedKey === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat-cat-button ${isSelected ? "selected" : ""}`}
                  style={{ "--cat-color": cat.color } as React.CSSProperties}
                  onClick={() => handleCategorise(cat.id)}
                >
                  <div className="cat-key-badge">[{cat.key}]</div>
                  <div className="cat-cat-info">
                    <span className="cat-cat-label">{cat.label.toUpperCase()}</span>
                    <span className="cat-cat-desc">{cat.description}</span>
                  </div>
                  <div className="cat-cat-count" title="Used this session">
                    {count}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confidence Indicator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#1c1b1b", border: "1px solid #333" }}>
            <span style={{ fontSize: "12px", color: "#8e8e93" }}>
              CONFIDENCE SCORE:
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { label: "Q: LOW (1)", val: 1 },
                { label: "W: MED (3)", val: 3 },
                { label: "E: HIGH (5)", val: 5 }
              ].map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setConfidence(c.val)}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontFamily: "Oswald",
                    border: "1px solid",
                    borderColor: confidence === c.val ? "#f4c300" : "#444",
                    background: confidence === c.val ? "#f4c300" : "#222",
                    color: confidence === c.val ? "#111" : "#888",
                    cursor: "pointer"
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts Helper Strip */}
          <div className="cat-shortcuts-strip">
            <span><span className="cat-key-chip">1-7</span> CATEGORISE</span>
            <span><span className="cat-key-chip">SPACE</span> SKIP</span>
            <span><span className="cat-key-chip">Z</span> UNDO</span>
            <span><span className="cat-key-chip">Q/W/E</span> CONFIDENCE</span>
            <span><span className="cat-key-chip">TAB</span> STATS</span>
          </div>
        </section>

        {/* Collapsible Session Stats Sidebar */}
        {showStats && (
          <aside style={{ flex: "0 0 260px", background: "#1c1b1b", border: "2px solid #f4c300", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "4px 4px 0px #9b30ff" }}>
            <h3 className="cat-font-anton cat-text-gold" style={{ margin: 0, fontSize: "18px" }}>
              SESSION STATS
            </h3>
            <div style={{ fontSize: "13px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", paddingBottom: "6px" }}>
              <span className="cat-text-muted">Total Judged:</span>
              <span style={{ fontWeight: "bold" }}>{sessionCount}</span>
            </div>
            <div style={{ fontSize: "13px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", paddingBottom: "6px" }}>
              <span className="cat-text-muted">Speed:</span>
              <span style={{ color: "#34C759", fontWeight: "bold" }}>{memesPerMin} / min</span>
            </div>
            <div style={{ fontSize: "13px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", paddingBottom: "6px" }}>
              <span className="cat-text-muted">Session Time:</span>
              <span>{Math.round(elapsedMins)} mins</span>
            </div>

            <h4 className="cat-font-anton" style={{ margin: "8px 0 4px 0", fontSize: "14px", color: "#9b30ff" }}>
              BREAKDOWN
            </h4>
            {MEME_CATEGORIES.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: c.color }}>{c.label}:</span>
                <span>{categoryCounts[c.id] || 0}</span>
              </div>
            ))}
          </aside>
        )}
      </main>
    </div>
  );
}
