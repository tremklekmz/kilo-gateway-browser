"use client";

import { AIModel } from "@/lib/types";
import { formatPercent, formatUsd } from "@/lib/utils";

/**
 * Minimum size of the currently-filtered TerminalBench-scored subset before
 * any value/leader signal renders. Below this, benchmark coverage is too
 * sparse to say anything honest — the strip renders nothing at all.
 */
const MIN_SCORED_SUBSET = 5;

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

/**
 * One-line summary strip above the results naming the benchmark-value leader
 * over the scored subset. Coverage-gated: renders only when the subset holds
 * >= MIN_SCORED_SUBSET models, and always states the coverage honestly.
 */
export function BenchValueStrip({
  leader,
  scoredCount,
  totalCount,
}: {
  leader: AIModel;
  scoredCount: number;
  totalCount: number;
}) {
  const bench = leader.terminalBench!;
  const cost =
    bench.avgAttemptCostUsd == null
      ? "no cost recorded"
      : `${formatUsd(bench.avgAttemptCostUsd)} per attempt`;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-2.5 rounded-lg border border-sky-500/25 bg-sky-500/5 text-sm">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-sky-400 shrink-0"
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
      <p className="text-zinc-300 leading-snug flex-1 min-w-[16rem] max-sm:min-w-0">
        Best benchmark value among scored models: {" "}
        <span className="font-semibold text-sky-300">{leader.name}</span>
        <span className="text-zinc-400">
          {" "}
          — {formatPercent(bench.overallScore, 1)} TerminalBench score (0–100), {cost}
        </span>
      </p>
      <span className="ml-auto max-sm:ml-0 max-sm:basis-full text-[11px] text-zinc-400 whitespace-nowrap">
        benchmark measured for {scoredCount} of {totalCount} shown models
      </span>
*** End
    </div>
  );
}