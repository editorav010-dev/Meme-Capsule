import React from "react";
import type { CurateMemeItem } from "./curateTypes";

interface AiPreJudgePanelProps {
  prediction: CurateMemeItem["ai_prediction"];
}

export default function AiPreJudgePanel({ prediction }: AiPreJudgePanelProps) {
  return (
    <section className="curate-ai-prejudge" aria-label="AI pre-judge advisory">
      <div className="curate-ai-prejudge-header">
        <span className="curate-anton">AI PRE-JUDGE</span>
        <span className="curate-ai-prejudge-badge">ADVISORY ONLY</span>
      </div>

      {!prediction ? (
        <p className="curate-ai-prejudge-empty">Not analysed yet.</p>
      ) : (
        <div className="curate-ai-prejudge-grid">
          <div>
            <span className="curate-ai-prejudge-label">Topics</span>
            <span className="curate-ai-prejudge-value">
              {prediction.topics.length > 0 ? prediction.topics.join(", ") : "None"}
            </span>
          </div>
          <div>
            <span className="curate-ai-prejudge-label">Tone</span>
            <span className="curate-ai-prejudge-value">{prediction.tone || "None"}</span>
          </div>
          <div>
            <span className="curate-ai-prejudge-label">Humour Mechanisms</span>
            <span className="curate-ai-prejudge-value">
              {prediction.humour_mechanisms.length > 0
                ? prediction.humour_mechanisms.join(", ")
                : "None"}
            </span>
          </div>
          <div>
            <span className="curate-ai-prejudge-label">Confidence</span>
            <span className="curate-ai-prejudge-value">
              {Math.round(Math.max(0, Math.min(1, prediction.confidence)) * 100)}%
            </span>
          </div>
          {prediction.reasoning && (
            <div className="curate-ai-prejudge-reasoning">
              <span className="curate-ai-prejudge-label">Reasoning</span>
              <span className="curate-ai-prejudge-value">{prediction.reasoning}</span>
            </div>
          )}
          {prediction.error && (
            <div className="curate-ai-prejudge-error">{prediction.error}</div>
          )}
        </div>
      )}

      <div className="curate-ai-prejudge-disclaimer">
        AI PRE-JUDGE is not a human vote and does not affect consensus or final curation.
        {prediction?.model ? ` Model: ${prediction.model}` : ""}
      </div>
    </section>
  );
}
