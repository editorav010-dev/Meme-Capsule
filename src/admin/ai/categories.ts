export interface MemeCategoryMeta {
  id: number;
  key: string;
  label: string;
  color: string;
  description: string;
}

export const MEME_CATEGORIES: MemeCategoryMeta[] = [
  { id: 1, key: "1", label: "Dank",          color: "#9b30ff", description: "Classic internet dank memes" },
  { id: 2, key: "2", label: "Relatable",     color: "#f4c300", description: "Everyday life and situations" },
  { id: 3, key: "3", label: "Dark Humour",   color: "#dd0061", description: "Dark and edgy comedy" },
  { id: 4, key: "4", label: "Wholesome",     color: "#34C759", description: "Positive and feel-good content" },
  { id: 5, key: "5", label: "Cringe",        color: "#FF9F0A", description: "So bad it is funny" },
  { id: 6, key: "6", label: "Political",     color: "#5AC8FA", description: "Political and social commentary" },
  { id: 7, key: "7", label: "Cursed",        color: "#FF3B30", description: "Deeply unsettling or absurd" }
];

export const getCategoryMeta = (cat: number | string | null | undefined): MemeCategoryMeta | null => {
  if (cat === null || cat === undefined) return null;
  const num = Number(cat);
  if (!isNaN(num)) {
    return MEME_CATEGORIES.find((c) => c.id === num) || null;
  }
  const str = String(cat).trim().toLowerCase();
  return MEME_CATEGORIES.find((c) => c.label.toLowerCase() === str) || null;
};
