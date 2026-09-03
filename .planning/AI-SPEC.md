# AI System Design Contract (AI-SPEC.md): Continuous AI Judging Mode

## 1. System Goal
Enable an automated, multimodal vision judging mode inside the existing human judges interface (`/curate`) that mimics a human curator by extracting visual & text satire from meme images and choosing the exact taxonomy attributes:
- Editorial Status (`keep`, `excluded`, `duplicate`, `review_later`)
- Topics (1 to 3 max, from `CURATION_TOPICS`)
- Dominant Tone (1 tone, from `CURATION_TONES`)
- Humour Mechanisms (1 to 2 max, from `CURATION_MECHANISMS`)
- Curator Rationale Note

---

## 2. Model & Framework Architecture
- **Inference Pattern**: Vision Model + Structured Output (Single round-trip JSON mode).
- **Protocol**: OpenAI-compatible `/v1/chat/completions` API format.
- **Payload Structure**:
  - Multimodal user message containing text instructions + image URL (or base64 URI).
  - `response_format: { type: "json_object" }` ensuring guaranteed parsing without markdown wrapping.
- **Provider Flexibility**:
  - **NVIDIA NIM** (Default): `https://integrate.api.nvidia.com/v1`, Model: `meta/llama-3.2-11b-vision-instruct`
  - **OpenRouter**: `https://openrouter.ai/api/v1`, Model: `google/gemini-2.0-flash-exp:free` or `qwen/qwen-2.5-vl-72b-instruct:free`
  - **Google AI Studio**: `https://generativelanguage.googleapis.com/v1beta/openai/`, Model: `gemini-2.0-flash`
  - **Groq Cloud**: `https://api.groq.com/openai/v1`, Model: `llama-3.2-11b-vision-preview`
  - **Local Ollama**: `http://localhost:11434/v1`, Model: `llama3.2-vision`
  - **Custom Base URL**: Any OpenAI-compatible vision server.

---

## 3. Taxonomy Alignment & Prompt Specification

```json
{
  "type": "object",
  "properties": {
    "corpus_status": {
      "type": "string",
      "enum": ["keep", "excluded", "duplicate", "review_later"]
    },
    "duplicate_of": {
      "type": "string",
      "nullable": true
    },
    "topics": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "Everyday Life", "Work / Education", "Relationships", "Family",
          "Politics / Society", "Internet Culture", "Pop Culture", "Gaming",
          "Animals", "Food", "Technology", "Other"
        ]
      },
      "maxItems": 3
    },
    "tone": {
      "type": "string",
      "enum": ["Wholesome", "Dark", "Chaotic", "Cynical", "Awkward", "Neutral"],
      "nullable": true
    },
    "humour_mechanisms": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "Relatability", "Absurdity", "Irony", "Satire", "Exaggeration",
          "Cringe", "Dark Humour", "Parody", "Surrealism"
        ]
      },
      "maxItems": 2
    },
    "curator_note": {
      "type": "string"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": ["corpus_status", "topics", "tone", "humour_mechanisms", "curator_note", "confidence"]
}
```

---

## 4. Execution Loop & Client FSM

```text
[IDLE] ──(Click Start)──► [FETCHING_MEME]
                                 │
                                 ▼
                         [AI_ANALYZING]
                                 │
                                 ▼
                         [PREVIEW_COUNTDOWN] (1.5s visual pause)
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
       (Preview finishes)               (User presses Stop / ESC)
                 ▼                               ▼
          [AUTO_SAVING]                      [STOPPED]
                 │
                 ▼
          [NEXT_MEME] ──► (Loop back to FETCHING_MEME)
```

---

## 5. Security & Failure Mitigations
1. **API Key Safety**: Keys are stored in the client's `localStorage` under `meme-capsule:ai-judge-config` and never sent to our database or logged.
2. **CORS Resilience**: Optional proxy route `POST /api/curate/ai-proxy` to ensure cross-origin restrictions from arbitrary base URLs never break the client.
3. **Parse Failures**: If model returns malformed JSON or invalid enums, the controller automatically sanitizes invalid options or marks the meme as `review_later` with curator note `[AI Parse Error]`.
4. **Rate Limit Handling**: Configurable rate limit throttle (default 1500ms preview pause + backoff on HTTP 429).
