import { useState, useEffect, useCallback, useRef } from "react";
import {
  CURATION_TOPICS,
  CURATION_TONES,
  CURATION_MECHANISMS,
  type CurateMemeItem,
  type CorpusStatus,
  type CuratorUser
} from "./curateTypes";
import { fetchNextMeme, saveCuration } from "./curateApi";
import EditorialButtons from "./EditorialButtons";
import CategorizationPanel from "./CategorizationPanel";
import CurationStatsModal from "./CurationStatsModal";
import CurateLogin from "./CurateLogin";
import CurateSuperDashboard from "./super/CurateSuperDashboard";
import CurateAccountModal from "./CurateAccountModal";
import AiPreJudgePanel from "./AiPreJudgePanel";
import type { AiJudgeConfig, AiJudgeDecision } from "./ai-judge/aiJudgeTypes";
import { DEFAULT_AI_JUDGE_CONFIG } from "./ai-judge/aiJudgeTypes";
import AiJudgeConsole from "./ai-judge/AiJudgeConsole";
import { useAiJudgeLoop } from "./ai-judge/useAiJudgeLoop";
import "./curate.css";

interface UndoHistoryItem {
  meme: CurateMemeItem;
  status: CorpusStatus;
  topics: string[];
  tone: string | null;
  mechanisms: string[];
  duplicateOf: string;
  note: string;
}

export default function CurateApp() {
  // Authentication State
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("curator_token"));
  const [user, setUser] = useState<CuratorUser | null>(() => {
    const raw = sessionStorage.getItem("curator_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const [viewMode, setViewMode] = useState<"super" | "judge">(() => {
    const raw = sessionStorage.getItem("curator_user");
    if (!raw) return "judge";
    try {
      const u = JSON.parse(raw);
      return u.role === "superadmin" ? "super" : "judge";
    } catch {
      return "judge";
    }
  });

  const [currentMeme, setCurrentMeme] = useState<CurateMemeItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterQueue, setFilterQueue] = useState<string>("unreviewed");
  const [stats, setStats] = useState({ total: 4485, reviewed: 0, remaining: 4485, current_index: 1 });
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);

  // Form State for current meme
  const [status, setStatus] = useState<CorpusStatus | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [tone, setTone] = useState<string | null>(null);
  const [mechanisms, setMechanisms] = useState<string[]>([]);
  const [duplicateOf, setDuplicateOf] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [undoStack, setUndoStack] = useState<UndoHistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // AI Judge State & Hook
  const [aiConfig, setAiConfig] = useState<AiJudgeConfig>(DEFAULT_AI_JUDGE_CONFIG);

  const handleApplyAiDecision = useCallback((_decision: AiJudgeDecision) => {
    // AI previews remain advisory and must never populate human judge fields.
  }, []);

  const aiLoop = useAiJudgeLoop({
    currentMeme,
    config: aiConfig,
    onApplyDecision: handleApplyAiDecision,
    onAdvance: () => {
      const memeId = stateRef.current.currentMeme?.id;
      return memeId ? loadMeme(memeId, "next") : Promise.resolve(null);
    }
  });

  const aiLoopRef = useRef(aiLoop);
  useEffect(() => {
    aiLoopRef.current = aiLoop;
  }, [aiLoop]);

  // Refs for zero-latency keyboard shortcut execution (prevents stale closure issues)
  const stateRef = useRef({
    status,
    topics,
    tone,
    mechanisms,
    duplicateOf,
    note,
    currentMeme,
    isSaving: false,
    undoStack
  });

  useEffect(() => {
    stateRef.current = {
      status,
      topics,
      tone,
      mechanisms,
      duplicateOf,
      note,
      currentMeme,
      isSaving,
      undoStack
    };
  }, [status, topics, tone, mechanisms, duplicateOf, note, currentMeme, isSaving, undoStack]);

  const handleLoginSuccess = (newToken: string, newUser: CuratorUser) => {
    sessionStorage.setItem("curator_token", newToken);
    sessionStorage.setItem("curator_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setViewMode(newUser.role === "superadmin" ? "super" : "judge");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("curator_token");
    sessionStorage.removeItem("curator_user");
    setToken(null);
    setUser(null);
    setViewMode("judge");
  };

  const preloadImage = (url: string) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  };

  const loadMeme = useCallback(async (currentId?: string, direction: "next" | "prev" = "next"): Promise<CurateMemeItem | null> => {
    if (!token) return null;
    try {
      setLoading(true);
      const res = await fetchNextMeme(filterQueue, currentId, direction);
      setCurrentMeme(res.meme);
      setStats(res.stats);

      if (res.meme) {
        preloadImage(res.meme.image_url);

        if (res.meme.curation) {
          setStatus(res.meme.curation.corpus_status);
          setTopics(res.meme.curation.topics || []);
          setTone(res.meme.curation.tone || null);
          setMechanisms(res.meme.curation.humour_mechanisms || []);
          setDuplicateOf(res.meme.curation.duplicate_of || "");
          setNote(res.meme.curation.curator_note || "");
        } else {
          setStatus(null);
          setTopics([]);
          setTone(null);
          setMechanisms([]);
          setDuplicateOf("");
          setNote("");
        }
      }
      return res.meme;
    } catch (err) {
      console.error("Error loading meme:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [filterQueue, token]);

  useEffect(() => {
    if (token && viewMode === "judge") {
      loadMeme();
    }
  }, [token, viewMode, loadMeme]);

  // Save current decision and advance
  const handleSaveAndAdvance = useCallback(async (forcedStatus?: CorpusStatus): Promise<CurateMemeItem | null> => {
    const s = stateRef.current;
    if (!s.currentMeme || s.isSaving) return null;
    const activeStatus = forcedStatus || s.status || "keep";
    const currentMemeId = s.currentMeme.id;

    setIsSaving(true);
    stateRef.current.isSaving = true;

    const snapshot: UndoHistoryItem = {
      meme: s.currentMeme,
      status: activeStatus,
      topics: s.topics,
      tone: s.tone,
      mechanisms: s.mechanisms,
      duplicateOf: s.duplicateOf,
      note: s.note
    };

    setUndoStack((prev) => [...prev.slice(-20), snapshot]);

    try {
      await saveCuration({
        meme_id: currentMemeId,
        corpus_status: activeStatus,
        duplicate_of: activeStatus === "duplicate" ? s.duplicateOf : null,
        topics: activeStatus === "keep" ? s.topics : [],
        tone: activeStatus === "keep" ? s.tone : null,
        humour_mechanisms: activeStatus === "keep" ? s.mechanisms : [],
        curator_note: s.note || null,
        user_id: user?.id,
        user_name: user?.display_name
      });
    } catch (err) {
      console.error("Failed to save curation decision:", err);
    } finally {
      setIsSaving(false);
      stateRef.current.isSaving = false;
    }

    const nextMeme = await loadMeme(currentMemeId, "next");
    return nextMeme;
  }, [user, loadMeme]);

  // Topic Toggle (Max 3)
  const handleToggleTopic = useCallback((topicId: string) => {
    setTopics((prev) => {
      if (prev.includes(topicId)) {
        return prev.filter((t) => t !== topicId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), topicId];
      }
      return [...prev, topicId];
    });
  }, []);

  // Tone Select (1 Dominant Tone)
  const handleSelectTone = useCallback((toneId: string) => {
    setTone((prev) => (prev === toneId ? null : toneId));
  }, []);

  // Humour Mechanism Toggle (Max 2)
  const handleToggleMechanism = useCallback((mechId: string) => {
    setMechanisms((prev) => {
      if (prev.includes(mechId)) {
        return prev.filter((m) => m !== mechId);
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), mechId];
      }
      return [...prev, mechId];
    });
  }, []);

  // Undo Last Action
  const handleUndo = useCallback(() => {
    const s = stateRef.current;
    if (s.undoStack.length === 0 || s.isSaving) return;
    const last = s.undoStack[s.undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setCurrentMeme(last.meme);
    setStatus(last.status);
    setTopics(last.topics);
    setTone(last.tone);
    setMechanisms(last.mechanisms);
    setDuplicateOf(last.duplicateOf);
    setNote(last.note);
  }, []);

  // Conflict-free Keyboard Event Listener (Active only in Judge view)
  useEffect(() => {
    if (viewMode !== "judge") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Escape stops AI Mode if running
      if (e.key === "Escape" && aiLoopRef.current.isRunning) {
        e.preventDefault();
        aiLoopRef.current.stop("Stopped via ESC key");
        return;
      }

      // 1. Layer 0 Editorial Shortcuts
      if (key === "k") {
        e.preventDefault();
        setStatus("keep");
        return;
      }
      if (key === "x") {
        e.preventDefault();
        setStatus("excluded");
        handleSaveAndAdvance("excluded");
        return;
      }
      if (key === "d") {
        e.preventDefault();
        setStatus("duplicate");
        return;
      }
      if (key === "r") {
        e.preventDefault();
        setStatus("review_later");
        handleSaveAndAdvance("review_later");
        return;
      }

      // 2. Save / Advance on Enter or Space
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleSaveAndAdvance();
        return;
      }

      // 3. Undo on U or Backspace
      if (key === "u" || e.key === "Backspace") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 4. Prev / Next on Left/Right Arrows
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (stateRef.current.currentMeme) {
          loadMeme(stateRef.current.currentMeme.id, "prev");
        }
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (stateRef.current.currentMeme) {
          loadMeme(stateRef.current.currentMeme.id, "next");
        }
        return;
      }

      // 5. Topics shortcuts: 1-9, 0, -, =
      const matchedTopic = CURATION_TOPICS.find((t) => t.key.toLowerCase() === key);
      if (matchedTopic) {
        e.preventDefault();
        handleToggleTopic(matchedTopic.id);
        return;
      }

      // 6. Tones shortcuts: Q, W, E, A, S, F
      const matchedTone = CURATION_TONES.find((t) => t.key.toLowerCase() === key);
      if (matchedTone) {
        e.preventDefault();
        handleSelectTone(matchedTone.id);
        return;
      }

      // 7. Mechanisms shortcuts: Z, C, V, B, N, M, J, P, O
      const matchedMech = CURATION_MECHANISMS.find((m) => m.key.toLowerCase() === key);
      if (matchedMech) {
        e.preventDefault();
        handleToggleMechanism(matchedMech.id);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, handleSaveAndAdvance, handleUndo, handleToggleTopic, handleSelectTone, handleToggleMechanism, loadMeme]);

  if (!token || !user) {
    return <CurateLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Superadmin Command Center View
  if (user.role === "superadmin" && viewMode === "super") {
    return (
      <CurateSuperDashboard
        onSwitchToJudgeMode={() => setViewMode("judge")}
        onLogout={handleLogout}
      />
    );
  }

  const percentComplete = stats.total > 0
    ? Math.min(100, Math.round((stats.reviewed / stats.total) * 100))
    : 0;

  return (
    <div className="curate-root">
      {/* Top Header */}
      <header className="curate-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span className="curate-anton" style={{ fontSize: "20px", color: "#9b30ff" }}>
            MEME CAPSULE CURATOR
          </span>
          <span style={{ fontSize: "11px", background: "#262626", padding: "3px 8px", borderRadius: "2px", color: "#f4c300", fontFamily: "monospace" }}>
            {stats.reviewed} / {stats.total} REVIEWED ({percentComplete}%)
          </span>
        </div>

        {/* Center: Queue Selector & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "#888" }}>QUEUE:</span>
          <select
            value={filterQueue}
            onChange={(e) => setFilterQueue(e.target.value)}
            style={{
              background: "#262626",
              border: "1px solid #9b30ff",
              color: "#f4c300",
              padding: "4px 10px",
              fontFamily: "Oswald",
              fontSize: "12px",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="unreviewed">Unreviewed Memes</option>
            <option value="review_later">⚠️ Review Later Queue</option>
            <option value="keep">✓ Kept Active Memes</option>
            <option value="excluded">✕ Excluded Memes</option>
            <option value="duplicate">⎘ Duplicates</option>
            <option value="all">All Corpus</option>
          </select>

          <button
            type="button"
            onClick={() => loadMeme(currentMeme?.id)}
            disabled={loading}
            style={{
              background: "#222",
              border: "1px solid #555",
              color: "#f4c300",
              padding: "4px 10px",
              fontFamily: "Anton",
              fontSize: "12px",
              cursor: "pointer"
            }}
            title="Reload queue from server"
          >
            {loading ? "..." : "🔄 REFRESH"}
          </button>

          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            style={{
              background: "#9b30ff",
              border: "1px solid #f4c300",
              color: "#fff",
              padding: "4px 12px",
              fontFamily: "Anton",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            📊 STATS & EXPORT
          </button>
        </div>

        {/* Right: User profile, superadmin switch and logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {user.role === "superadmin" && (
            <button
              type="button"
              onClick={() => setViewMode("super")}
              style={{
                background: "#f4c300",
                color: "#121212",
                border: "none",
                padding: "4px 10px",
                fontFamily: "Anton",
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              🛡️ SUPER ADMIN VIEW
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            style={{
              background: "#262626",
              border: "1px solid #9b30ff",
              color: "#f4c300",
              padding: "4px 10px",
              fontFamily: "Oswald",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
            title="Manage your username, display name, and password"
          >
            <span>👤 {user.display_name}</span>
            <span style={{ fontSize: "10px", color: "#aaa", fontFamily: "monospace" }}>({user.username})</span>
            <span style={{ fontSize: "10px", color: "#9b30ff" }}>⚙️</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "none",
              color: "#FF3B30",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "Oswald",
              letterSpacing: "0.5px"
            }}
          >
            LOG OUT
          </button>
        </div>

        {/* Progress Bar Line */}
        <div className="curate-progress-bar">
          <div className="curate-progress-fill" style={{ width: `${percentComplete}%` }} />
        </div>
      </header>

      {/* AI Judge Continuous Console */}
      <div style={{ padding: "0 24px", maxWidth: "1600px", width: "100%", margin: "16px auto 0 auto" }}>
        <AiJudgeConsole
          userId={user?.id}
          config={aiConfig}
          onUpdateConfig={setAiConfig}
          isRunning={aiLoop.isRunning}
          loopState={aiLoop.loopState}
          statusMessage={aiLoop.statusMessage}
          previewProgress={aiLoop.previewProgress}
          lastDecision={aiLoop.lastDecision}
          errorMessage={aiLoop.errorMessage}
          batchProcessed={aiLoop.batchProcessed}
          onStart={aiLoop.start}
          onStop={aiLoop.stop}
        />
      </div>

      {/* Main Curation Workspace */}
      <main className="curate-main-grid">
        {/* Left: Large Meme Stage */}
        <section className="curate-meme-card">
          <div className="curate-meme-display">
            {loading && !currentMeme ? (
              <div style={{ color: "#888" }}>LOADING MEME...</div>
            ) : currentMeme ? (
              <img
                key={currentMeme.id}
                src={currentMeme.image_url}
                alt={currentMeme.title}
                className="curate-meme-img"
              />
            ) : (
              <div style={{ textAlign: "center", color: "#888" }}>
                <h3 className="curate-anton" style={{ color: "#34C759", fontSize: "28px" }}>ALL DONE IN THIS QUEUE!</h3>
                <p style={{ fontSize: "13px" }}>Switch queues or export your curated dataset.</p>
              </div>
            )}
          </div>

          {currentMeme && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #282828" }}>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#888" }}>ID: {currentMeme.id}</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>{currentMeme.title}</div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => loadMeme(currentMeme.id, "prev")}
                  style={{ background: "#222", border: "1px solid #444", color: "#fff", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}
                  title="Previous Meme (Left Arrow)"
                >
                  ← PREV
                </button>
                <button
                  type="button"
                  onClick={() => loadMeme(currentMeme.id, "next")}
                  style={{ background: "#222", border: "1px solid #444", color: "#fff", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}
                  title="Next Meme (Right Arrow)"
                >
                  NEXT →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right: Layer 0 Editorial & Multi-Dimensional Categorization */}
        <section style={{ display: "flex", flexDirection: "column" }}>
          <AiPreJudgePanel prediction={currentMeme?.ai_prediction ?? null} />

          {/* Layer 0: Editorial Judgment */}
          <EditorialButtons
            currentStatus={status}
            duplicateOf={duplicateOf}
            onSelectStatus={(s) => {
              setStatus(s);
              if (s === "excluded" || s === "review_later") {
                handleSaveAndAdvance(s);
              }
            }}
            onChangeDuplicateOf={setDuplicateOf}
          />

          {/* Layer 1: Multi-Dimensional Categorization (Topics, Tone, Mechanisms) */}
          <CategorizationPanel
            topics={topics}
            tone={tone}
            mechanisms={mechanisms}
            note={note}
            onToggleTopic={handleToggleTopic}
            onSelectTone={handleSelectTone}
            onToggleMechanism={handleToggleMechanism}
            onChangeNote={setNote}
          />

          {/* Confirm & Save Button */}
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            <button
              type="button"
              onClick={() => handleSaveAndAdvance()}
              disabled={isSaving || !currentMeme}
              style={{
                flex: 1,
                background: "#34C759",
                color: "#121212",
                border: "2px solid #f4c300",
                padding: "12px",
                fontFamily: "Anton",
                fontSize: "18px",
                cursor: "pointer",
                boxShadow: "3px 3px 0px #f4c300"
              }}
            >
              {isSaving ? "SAVING..." : "CONFIRM & ADVANCE ➔ [ENTER / SPACE]"}
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              style={{
                background: "#262626",
                border: "1px solid #444",
                color: "#f4c300",
                padding: "12px 18px",
                fontFamily: "Anton",
                fontSize: "14px",
                cursor: "pointer",
                opacity: undoStack.length ? 1 : 0.4
              }}
              title="Undo last action [Key: U / Backspace]"
            >
              UNDO [U]
            </button>
          </div>
        </section>
      </main>

      {/* Keyboard Shortcuts Footer Strip */}
      <footer className="curate-shortcuts-footer">
        <span><span className="curate-hotkey-tag">K</span> KEEP</span>
        <span><span className="curate-hotkey-tag">X</span> EXCLUDE</span>
        <span><span className="curate-hotkey-tag">D</span> DUPLICATE</span>
        <span><span className="curate-hotkey-tag">R</span> LATER</span>
        <span><span className="curate-hotkey-tag">1-9,0,-,=</span> TOPICS (MAX 3)</span>
        <span><span className="curate-hotkey-tag">Q,W,E,A,S,F</span> TONE (1)</span>
        <span><span className="curate-hotkey-tag">Z,C,V,B,N,M,J,P,O</span> MECHANISM (MAX 2)</span>
        <span><span className="curate-hotkey-tag">ENTER</span> CONFIRM</span>
        <span><span className="curate-hotkey-tag">U</span> UNDO</span>
        <span><span className="curate-hotkey-tag">←/→</span> PREV/NEXT</span>
      </footer>

      {/* Stats & Export Modal */}
      {showStatsModal && <CurationStatsModal onClose={() => setShowStatsModal(false)} />}

      {/* Account Settings Modal */}
      {showAccountModal && user && (
        <CurateAccountModal
          user={user}
          onClose={() => setShowAccountModal(false)}
          onAccountUpdated={(updated) => {
            setUser(updated);
            sessionStorage.setItem("curator_user", JSON.stringify(updated));
          }}
        />
      )}
    </div>
  );
}
