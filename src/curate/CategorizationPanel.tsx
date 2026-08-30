import React from "react";
import {
  CURATION_TOPICS,
  CURATION_TONES,
  CURATION_MECHANISMS
} from "./curateTypes";

interface CategorizationPanelProps {
  topics: string[];
  tone: string | null;
  mechanisms: string[];
  note: string;
  onToggleTopic: (topicId: string) => void;
  onSelectTone: (toneId: string) => void;
  onToggleMechanism: (mechId: string) => void;
  onChangeNote: (note: string) => void;
}

export default function CategorizationPanel({
  topics,
  tone,
  mechanisms,
  note,
  onToggleTopic,
  onSelectTone,
  onToggleMechanism,
  onChangeNote
}: CategorizationPanelProps) {
  return (
    <div>
      {/* 1. TOPIC (Multi-select, Max 3) */}
      <div className="curate-section-card">
        <div className="curate-section-header">
          <span className="curate-anton" style={{ fontSize: "14px", color: "#9b30ff" }}>
            1. TOPIC (WHAT IS IT ABOUT?)
          </span>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: topics.length >= 3 ? "#f4c300" : "#888" }}>
            {topics.length} / 3 MAX
          </span>
        </div>

        <div className="curate-pill-grid">
          {CURATION_TOPICS.map((t) => {
            const isSelected = topics.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`curate-pill ${isSelected ? "selected" : ""}`}
                style={{
                  "--pill-color": "#9b30ff",
                  background: isSelected ? "#9b30ff" : "#242424",
                  color: isSelected ? "#ffffff" : "#dddddd",
                  borderColor: isSelected ? "#f4c300" : "#444"
                } as React.CSSProperties}
                onClick={() => onToggleTopic(t.id)}
                title={`Hotkey: ${t.key}`}
              >
                <span className="curate-pill-key">[{t.key}]</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TONE (Single-select, 1 Dominant Tone) */}
      <div className="curate-section-card">
        <div className="curate-section-header">
          <span className="curate-anton" style={{ fontSize: "14px", color: "#f4c300" }}>
            2. DOMINANT TONE (EMOTIONAL ATMOSPHERE)
          </span>
          <span style={{ fontSize: "12px", color: "#888" }}>
            {tone ? `SELECTED: ${tone.toUpperCase()}` : "1 DOMINANT TONE [Q, W, E, A, S, F]"}
          </span>
        </div>

        <div className="curate-pill-grid">
          {CURATION_TONES.map((t) => {
            const isSelected = tone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`curate-pill ${isSelected ? "selected" : ""}`}
                style={{
                  "--pill-color": t.color,
                  background: isSelected ? t.color : "#242424",
                  color: isSelected ? "#121212" : "#dddddd",
                  borderColor: isSelected ? "#ffffff" : "#444",
                  fontWeight: isSelected ? "bold" : "normal"
                } as React.CSSProperties}
                onClick={() => onSelectTone(t.id)}
                title={`Hotkey: ${t.key}`}
              >
                <span className="curate-pill-key">[{t.key}]</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. HUMOUR MECHANISM (Multi-select, Max 2) */}
      <div className="curate-section-card">
        <div className="curate-section-header">
          <span className="curate-anton" style={{ fontSize: "14px", color: "#5AC8FA" }}>
            3. HUMOUR MECHANISM (WHAT MAKES IT FUNNY?)
          </span>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: mechanisms.length >= 2 ? "#f4c300" : "#888" }}>
            {mechanisms.length} / 2 MAX
          </span>
        </div>

        <div className="curate-pill-grid">
          {CURATION_MECHANISMS.map((m) => {
            const isSelected = mechanisms.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={`curate-pill ${isSelected ? "selected" : ""}`}
                style={{
                  "--pill-color": "#5AC8FA",
                  background: isSelected ? "#5AC8FA" : "#242424",
                  color: isSelected ? "#121212" : "#dddddd",
                  borderColor: isSelected ? "#ffffff" : "#444",
                  fontWeight: isSelected ? "bold" : "normal"
                } as React.CSSProperties}
                onClick={() => onToggleMechanism(m.id)}
                title={`Hotkey: ${m.key}`}
              >
                <span className="curate-pill-key">[{m.key}]</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Note */}
      <div style={{ marginTop: "8px" }}>
        <input
          type="text"
          placeholder="Optional curator notes / context..."
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          style={{
            width: "100%",
            background: "#181818",
            border: "1px solid #333",
            color: "#fff",
            padding: "8px 12px",
            fontSize: "12px",
            fontFamily: "Oswald",
            outline: "none"
          }}
        />
      </div>
    </div>
  );
}
