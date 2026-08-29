/**
 * Types and Category Definitions for the Meme Categorisation System.
 */

export const MEME_CATEGORIES = [
  { id: 1, key: "1", label: "Dank",          color: "#9b30ff", description: "Classic internet dank memes" },
  { id: 2, key: "2", label: "Relatable",     color: "#f4c300", description: "Everyday life and situations" },
  { id: 3, key: "3", label: "Dark Humour",   color: "#dd0061", description: "Dark and edgy comedy" },
  { id: 4, key: "4", label: "Wholesome",     color: "#34C759", description: "Positive and feel-good content" },
  { id: 5, key: "5", label: "Cringe",        color: "#FF9F0A", description: "So bad it is funny" },
  { id: 6, key: "6", label: "Political",     color: "#5AC8FA", description: "Political and social commentary" },
  { id: 7, key: "7", label: "Cursed",        color: "#FF3B30", description: "Deeply unsettling or absurd" }
] as const;

export type MemeCategory = typeof MEME_CATEGORIES[number];
export type MemeCategoryId = MemeCategory["id"];

export interface CatUser {
  id: string;
  username: string;
  display_name: string;
  role: "judge" | "superadmin";
  is_active?: boolean;
}

export interface CatProgress {
  total_memes: number;
  categorised: number;
  skipped: number;
  remaining: number;
  percent_complete: number;
}

export interface CatNextMeme {
  id: string;
  image_url: string;
  title: string;
  position: number;
  total: number;
}

export interface CatJudgeDecision {
  user_id: string;
  display_name: string;
  category_id: number | null;
  category_label: string;
  confidence: number;
  skipped: boolean;
  decided_at: string;
}

export interface CatMemeComparisonItem {
  meme_id: string;
  title: string;
  image_url: string;
  consensus_category: number | null;
  confidence_score: number;
  vote_breakdown: Record<number, number>;
  is_resolved: boolean;
  final_category: number | null;
  decisions: CatJudgeDecision[];
}

export interface CatJudgeProgress {
  user_id: string;
  display_name: string;
  categorised: number;
  skipped: number;
  percent_complete: number;
}

export interface CatCategoryDistItem {
  category_id: number;
  label: string;
  count: number;
  percent: number;
}

export interface CatOverview {
  total_memes: number;
  total_decisions: number;
  resolved_memes: number;
  unresolved_memes: number;
  fully_categorised: number;
  judges: CatJudgeProgress[];
  category_distribution: CatCategoryDistItem[];
  disagreement_rate: number;
  last_activity: string;
}

export interface CatPaginatedMemes {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  memes: CatMemeComparisonItem[];
}
