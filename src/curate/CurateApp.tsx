import { useState, useEffect, useCallback, useRef } from "react";
import {
  CURATION_TOPICS,
  CURATION_TONES,
  CURATION_MECHANISMS,
  type CurateMemeItem,
  type CorpusStatus
} from "./curateTypes";
import { fetchNextMeme, saveCuration, getExportUrl } from "./curateApi";
import EditorialButtons from "./EditorialButtons";
import CategorizationPanel from "./CategorizationPanel";
import CurationStatsModal from "./CurationStatsModal";
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
  const [currentMeme, setCurrentMeme] = useState<CurateMemeItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterQueue, setFilterQueue] = useState<string>("unreviewed");
  const [stats, setStats] = useState({ total: 4485, reviewed: 0, remaining: 4485, current_index: 1 });
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // Form State for current meme
  const [status, setStatus] = useState<CorpusStatus | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [tone, setTone] = useState<string | null>(null);
  const [mechanisms, setMechanisms] = useState<string[]>([]);
  const [duplicateOf, setDuplicateOf] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [undoStack, setUndoStack] = useState<UndoHistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isSavingRef = useRef(false);

  const preloadImage = (url: string) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  };

  const loadMeme = useCallback(async (currentId?: string, direction: "next" | "prev" = "next") => {
    try {
      setLoading(true);
      const res = await fetchNextMeme(filterQueue, currentId, direction);
      setCurrentMeme(res.meme);
      setStats(res.stats);

      if (res.meme) {
        preloadImage(res.meme.image_url);

        // Populate existing curation metadata if already reviewed
        if (res.meme.curation) {
          setStatus(res.meme.curation.corpus_status);
          setTopics(res.meme.curation.topics || []);
          setTone(res.meme.curation.tone || null);
          setMechanisms(res.meme.curation.humour_mechanisms || []);
          setDuplicateOf(res.meme.curation.duplicate_of || "");
          setNote(res.meme.curation.curator_note || "");
        } else {
          // Fresh state
          setStatus(null);
          setTopics([]);
          setTone(null);
          setMechanisms([]);
          setDuplicateOf("");
          setNote("");
        }
      }
    } catch (err) {
      console.error("Error loading meme:", err);
    } finally {
      setLoading(false);
    }
  }, [filterQueue]);

  useEffect(() => {
    loadMeme();
  }, [loadMeme]);

  // Save current decision and advance
  const handleSaveAndAdvance = useCallback(async (forcedStatus?: CorpusStatus) => {
    if (!currentMeme || isSavingRef.current) return;
    const activeStatus = forcedStatus || status || "keep";

    isSavingRef.current = true;
    setIsSaving(true);

    const snapshot: UndoHistoryItem = {
      meme: currentMeme,
      status: activeStatus,
      topics,
      tone,
      mechanisms,
      duplicateOf,
      note
    };

    setUndoStack((prev) => [...prev.slice(-20), snapshot]);

    // Incremental async save
    saveCuration({
      meme_id: currentMeme.id,
      corpus_status: activeStatus,
      duplicate_of: activeStatus === "duplicate" ? duplicateOf : null,
      topics: activeStatus === "keep" ? topics : [],
      tone: activeStatus === "keep" ? tone : null,
      humour_mechanisms: activeStatus === "keep" ? mechanisms : [],
      curator_note: note || null
    }).catch(console.error);

    // Fast advance
    setTimeout(async () => {
      isSavingRef.current = false;
      setIsSaving(false);
      await loadMeme(currentMeme.id, "next");
    }, 180);
  }, [currentMeme, status, topics, tone, mechanisms, duplicateOf, note, loadMeme]);

  // Topic Toggle (Max 3)
  const handleToggleTopic = useCallback((topicId: string) => {
    setTopics((prev) => {
      if (prev.includes(topicId)) {
        return prev.filter((t) => t !== topicId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), topicId]; // Shift oldest or cap
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
        return [...prev.slice(1), mechId]; // Shift oldest or cap
      }
      return [...prev, mechId];
    });
  }, []);

  // Undo Last Action
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || isSavingRef.current) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setCurrentMeme(last.meme);
    setStatus(last.status);
    setTopics(last.topics);
    setTone(last.tone);
    setMechanisms(last.mechanisms);
    setDuplicateOf(last.duplicateOf);
    setNote(last.note);
  }, [undoStack]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Editorial Shortcuts
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

      // Enter / Space confirms & advances
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleSaveAndAdvance();
        return;
      }

      // Undo on Z or U
      if ((key === "z" || key === "u") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Prev / Next on Left/Right Arrows
      if (e.key === "ArrowLeft" && currentMeme) {
        e.preventDefault();
        loadMeme(currentMeme.id, "prev");
        return;
      }
      if (e.key === "ArrowRight" && currentMeme) {
        e.preventDefault();
        loadMeme(currentMeme.id, "next");
        return;
      }

      // Topic shortcuts (1 to 9, 0, -, =)
      const matchedTopic = CURATION_TOPICS.find((t) => t.key.toLowerCase() === key);
      if (matchedTopic) {
        e.preventDefault();
        handleToggleTopic(matchedTopic.id);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMeme, handleSaveAndAdvance, handleUndo, handleToggleTopic, loadMeme]);

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

        {/* Queue Selector */}
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

        {/* Progress Bar Line */}
        <div className="curate-progress-bar">
          <div className="curate-progress-fill" style={{ width: `${percentComplete}%` }} />
        </div>
      </header>

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
                  onClick={() => loadMeme(currentMeme.id, "prev")}
                  style={{ background: "#222", border: "1px solid #444", color: "#fff", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}
                  title="Previous Meme (Left Arrow)"
                >
                  ← PREV
                </button>
                <button
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
              title="Undo last action [Key: Z]"
            >
              UNDO [Z]
            </button>
          </div>
        </section>
      </main>

      {/* Keyboard Shortcuts Footer Strip */}
      <footer className="curate-shortcuts-footer">
        <span><span className="curate-hotkey-tag">K</span> KEEP</span>
        <span><span className="curate-hotkey-tag">X</span> EXCLUDE</span>
        <span><span className="curate-hotkey-tag">D</span> DUPLICATE</span>
        <span><span className="curate-hotkey-tag">R</span> REVIEW LATER</span>
        <span><span className="curate-hotkey-tag">1-9,0,-,=</span> TOPICS (MAX 3)</span>
        <span><span className="curate-hotkey-tag">ENTER</span> CONFIRM</span>
        <span><span className="curate-hotkey-tag">Z</span> UNDO</span>
        <span><span className="curate-hotkey-tag">←/→</span> PREV/NEXT</span>
      </footer>

      {/* Stats & Export Modal */}
      {showStatsModal && <CurationStatsModal onClose={() => setShowStatsModal(false)} />}
    </div>
  );
}
