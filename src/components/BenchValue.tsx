import { Show } from "solid-js";
import type { AIModel } from "@/lib/types";
import { formatPercent, formatUsd } from "@/lib/utils";

/**
 * One-line summary strip above the results naming the benchmark-value leader
 * over the scored subset. Coverage-gated upstream (pickBenchValueLeader in
 * lib/bench.ts): renders only when the scored subset holds >= MIN_SCORED_SUBSET
 * models, and always states the coverage honestly.
 */
export function BenchValueStrip(props: {
  leader: AIModel;
  scoredCount: number;
  totalCount: number;
}) {
  const bench = () => props.leader.terminalBench!;
  return (
    <div class="flex items-start gap-3 px-4 py-3 rounded-lg border border-sky-500/25 bg-sky-500/5 text-body">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class="mt-[3px] text-sky-400 shrink-0"
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
      <div class="min-w-0 flex-1">
        <p class="text-zinc-300 leading-relaxed">
          Best benchmark value among scored models:{" "}
          <span class="font-semibold text-sky-300">{props.leader.name}</span>
          <span class="text-zinc-400">
            {" "}
            — {formatPercent(bench().overallScore, 1)} TerminalBench score (0–100),{" "}
            <Show
              when={bench().avgAttemptCostUsd == null}
              fallback={`${formatUsd(bench().avgAttemptCostUsd)} per attempt`}
            >
              no cost recorded
            </Show>
          </span>
        </p>
        <span class="mt-1 block text-micro text-zinc-400">
          benchmark measured for {props.scoredCount} of {props.totalCount} shown models
        </span>
      </div>
    </div>
  );
}
