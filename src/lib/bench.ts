import type { AIModel } from "@/lib/types";

/**
 * Minimum size of the currently-filtered TerminalBench-scored subset before
 * any value/leader signal renders. Below this, benchmark coverage is too
 * sparse to say anything honest — the strip renders nothing at all.
 */
export const MIN_SCORED_SUBSET = 5;

/**
 * Picks the benchmark-value leader over the scored subset of the currently
 * filtered results: capability first, cost second. The naive score-per-dollar
 * ratio crowns a free 0.155-score model, so instead the leader is the
 * cheapest model within the subset's top score quartile — it must already be
 * near the top on capability before cost breaks ties.
 *
 * Returns null when the subset is too small to speak for (see
 * MIN_SCORED_SUBSET). Callers must render nothing in that case.
 */
export function pickBenchValueLeader(filteredModels: AIModel[]): AIModel | null {
  const scored = filteredModels.filter((model) => model.terminalBench != null);
  if (scored.length < MIN_SCORED_SUBSET) return null;

  const byScore = [...scored].sort(
    (a, b) => b.terminalBench!.overallScore - a.terminalBench!.overallScore,
  );
  const topQuartileCutoff = byScore[Math.max(0, Math.floor(byScore.length / 4) - 1)]
    .terminalBench!.overallScore;
  const topTier = byScore.filter(
    (model) => model.terminalBench!.overallScore >= topQuartileCutoff,
  );

  // Cost tiebreak: models with no recorded attempt cost sort last.
  return [...topTier].sort((a, b) => {
    const aCost = a.terminalBench!.avgAttemptCostUsd;
    const bCost = b.terminalBench!.avgAttemptCostUsd;
    if (aCost == null && bCost == null) return 0;
    if (aCost == null) return 1;
    if (bCost == null) return -1;
    return aCost - bCost;
  })[0];
}
