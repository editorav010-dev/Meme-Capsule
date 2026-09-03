/**
 * API client for the Superadmin AI Categorisation dashboard.
 */

export interface AiCategoryDistItem {
  ai_category: number | string;
  count: number;
  avg_confidence: number;
}

export interface AiStatsResponse {
  total_memes: number;
  total_ai_categorised: number;
  total_uncategorised: number;
  percent_complete: number;
  avg_confidence: number;
  low_confidence_count: number;
  category_distribution: AiCategoryDistItem[];
}

export interface AiComparisonMeme {
  id: string;
  image_url: string | null;
  title: string | null;
  ai_category: number | string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_model: string | null;
  consensus_category: number | null;
  confidence_score: number | null;
  vote_breakdown: string | Record<string | number, number> | null;
  is_resolved: number | boolean | null;
  final_category: number | null;
}

export interface AiComparisonResponse {
  memes: AiComparisonMeme[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  filter: string;
}

export interface AiOverrideResponse {
  success: boolean;
  meme_id: string;
  category_id: number;
  category_label?: string;
  error?: string;
}

const authHeaders = (adminToken: string) => ({
  Authorization: `Bearer ${adminToken}`,
  "X-Admin-Token": adminToken
});

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload as T;
};

/**
 * Fetch AI categorization statistics for dashboard overview.
 */
export const fetchAiStats = async (token: string): Promise<AiStatsResponse> => {
  const response = await fetch("/api/admin/ai-stats", {
    headers: authHeaders(token),
    cache: "no-store"
  });
  return parseJsonResponse<AiStatsResponse>(response);
};

/**
 * Fetch AI vs Human comparison items with filter and pagination.
 */
export const fetchAiComparison = async (
  token: string,
  filter = "all",
  page = 1,
  perPage = 50
): Promise<AiComparisonResponse> => {
  const params = new URLSearchParams({
    filter,
    page: String(page),
    per_page: String(perPage)
  });

  const response = await fetch(`/api/admin/ai-comparison?${params.toString()}`, {
    headers: authHeaders(token),
    cache: "no-store"
  });
  return parseJsonResponse<AiComparisonResponse>(response);
};

/**
 * Manually override or confirm the category of a meme.
 */
export const overrideAiDecision = async (
  token: string,
  memeId: string,
  categoryId: number
): Promise<AiOverrideResponse> => {
  const response = await fetch("/api/admin/ai/override", {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      meme_id: memeId,
      category_id: categoryId
    })
  });
  return parseJsonResponse<AiOverrideResponse>(response);
};
