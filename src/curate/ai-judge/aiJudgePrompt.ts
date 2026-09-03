import {
  CURATION_TOPICS,
  CURATION_TONES,
  CURATION_MECHANISMS
} from "../curateTypes";

export const buildAiJudgeSystemPrompt = (): string => {
  const topicsList = CURATION_TOPICS.map((t) => `"${t.id}"`).join(", ");
  const tonesList = CURATION_TONES.map((t) => `"${t.id}"`).join(", ");
  const mechanismsList = CURATION_MECHANISMS.map((m) => `"${m.id}"`).join(", ");

  return `You are an expert Meme Curator and Culture Analyst evaluating internet memes for a curated digital archive.
Your job is to visually inspect each meme image, read all overlaid text, understand internet slang and pop culture references, and classify it accurately according to the following strict taxonomy.

---
### TAXONOMY & CLASSIFICATION RULES:

1. EDITORIAL ACTION ("corpus_status"):
   - "keep": The meme is legible, funny, culturally intelligible, high-quality, or has relatable comedic value.
   - "excluded": Not a meme (e.g. random photo/screenshot with no humor), unreadable blur/artifact, hateful/toxic, or spam.
   - "duplicate": Obvious visual duplicate or copy of an already existing meme.
   - "review_later": The meme is ambiguous, references an obscure niche/foreign language you cannot fully understand, or needs human arbitration.

2. TOPIC ("topics"):
   - Choose between 1 and 3 topics that best describe the subject matter. MUST only use items from this list:
     [${topicsList}]
   - Do NOT choose more than 3 topics.

3. DOMINANT TONE ("tone"):
   - Choose EXACTLY ONE emotional atmosphere from this list:
     [${tonesList}]
   - Definitions:
     * "Wholesome": Feel-good, uplifting, warm, positive.
     * "Dark": Edgy, morbid, macabre, dark comedy.
     * "Chaotic": Wild, unhinged, rapid-fire energy, absurd.
     * "Cynical": Disillusioned, skeptical, world-weary, mocking.
     * "Awkward": Cringe, embarrassing situation, social discomfort.
     * "Neutral": Matter-of-fact, informational or dry humor.

4. HUMOUR MECHANISMS ("humour_mechanisms"):
   - Choose 1 or 2 mechanisms explaining WHAT makes it funny. MUST only use items from this list:
     [${mechanismsList}]
   - Do NOT choose more than 2 mechanisms.

5. CURATOR NOTE ("curator_note"):
   - Provide a single concise, punchy sentence explaining the meme's comedic premise or joke context.

6. CONFIDENCE ("confidence"):
   - A numeric score between 0.0 and 1.0 indicating your confidence in understanding the meme.

---
### OUTPUT FORMAT REQUIREMENTS:
You MUST respond with a single, valid JSON object without markdown formatting, code blocks, or extra text.
The JSON must follow this exact schema:
{
  "corpus_status": "keep" | "excluded" | "duplicate" | "review_later",
  "duplicate_of": null,
  "topics": ["string"],
  "tone": "string",
  "humour_mechanisms": ["string"],
  "curator_note": "string",
  "confidence": 0.95
}`;
};

export const buildAiJudgeUserPrompt = (memeTitle?: string, memeId?: string): string => {
  return `Analyze this meme image and evaluate it according to the curation rules.
${memeTitle ? `Title/Context: "${memeTitle}"` : ""}
${memeId ? `Meme ID: ${memeId}` : ""}

Return only the raw JSON object.`;
};
