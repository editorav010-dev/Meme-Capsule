/**
 * Logic for computing consensus across judge categorisation decisions.
 */

export function computeConsensus(
  votes: { category_id: number | null; skipped: number }[]
): {
  consensus_category: number | null;
  confidence_score: number;
  vote_breakdown: Record<number, number>;
  is_resolved: boolean;
} {
  const activeVotes = votes.filter(
    (v) => v.skipped === 0 && v.category_id !== null && v.category_id >= 1 && v.category_id <= 7
  );
  const breakdown: Record<number, number> = {};

  for (const vote of activeVotes) {
    const catId = vote.category_id as number;
    breakdown[catId] = (breakdown[catId] ?? 0) + 1;
  }

  const total = activeVotes.length;
  if (total === 0) {
    return {
      consensus_category: null,
      confidence_score: 0,
      vote_breakdown: breakdown,
      is_resolved: false
    };
  }

  // Find the category with the most votes
  let topCategory: number | null = null;
  let topCount = 0;
  for (const [cat, count] of Object.entries(breakdown)) {
    if (count > topCount) {
      topCount = count;
      topCategory = Number(cat);
    }
  }

  const confidenceScore = total > 0 ? topCount / total : 0;
  // Resolved when majority (>50%) of judges agree with at least 2 active votes
  const isResolved = confidenceScore > 0.5 && total >= 2;

  return {
    consensus_category: isResolved ? topCategory : null,
    confidence_score: confidenceScore,
    vote_breakdown: breakdown,
    is_resolved: isResolved
  };
}
