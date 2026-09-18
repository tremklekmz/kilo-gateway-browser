import { Show } from "solid-js";
import type { AIModel } from "@/lib/types";
import { formatDisplayName } from "@/lib/utils";
import { FreeBadge, NewBadge, ProviderBadge } from "./badges";
import { CopyIcon } from "./CopyIcon";
import { TerminalBenchStat } from "./TerminalBenchStat";
import { TrainingWarning } from "./TrainingWarning";

export function ModelCardList(props: {
  model: AIModel;
  free: boolean;
  isNew: boolean;
  provider: string;
  promptPrice: string;
  completionPrice: string;
  contextLength: string;
  avgPrice: string;
  avgAssumptionSummary: string;
  createdDate: string | null;
  relativeAge: string | null;
  relativeAgeFresh: boolean;
  handleCopy: () => void;
  copied: boolean;
}) {
  const model = () => props.model;
  return (
    // Comparison-table row: an 8-column grid shared with the sticky header in
    // App (same template), so Context/In/Out/Avg/TB/Age align into true
    // columns. Mobile collapses to a stacked single column.
    <div class="group rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 max-sm:p-4 sm:grid sm:grid-cols-[minmax(0,2fr)_80px_96px_96px_96px_72px_64px_108px] sm:items-center sm:gap-x-4 sm:px-4 sm:py-3">
      {/* Model identity + badges: single description line (desktop truncates to 1,
          mobile clamps to 2) — the old dual-<p> split duplicated text to AT. */}
      <div class="min-w-0 max-sm:mb-1">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-title text-zinc-100 truncate leading-snug">
            {formatDisplayName(model().name)}
          </h3>
          <span class="flex shrink-0 items-center gap-1.5">
            <ProviderBadge provider={props.provider} />
            {props.free && <FreeBadge />}
            {props.isNew && <NewBadge />}
          </span>
        </div>
        <Show when={model().description}>
          <p class="text-caption text-zinc-400 leading-normal line-clamp-2 sm:line-clamp-1">
            {model().description}
          </p>
        </Show>
        <Show when={model().mayTrainOnYourPrompts}>
          <div class="mt-2">
            <TrainingWarning />
          </div>
        </Show>
      </div>
      {/* Context */}
      <span class="hidden sm:block text-value text-zinc-300 text-right tabular-nums whitespace-nowrap">
        {props.contextLength}
      </span>
      {/* In */}
      <span
        class={`hidden sm:block text-value text-right tabular-nums whitespace-nowrap ${
          props.free ? "text-neon-green" : "text-zinc-300"
        }`}
      >
        {props.promptPrice}
      </span>
      {/* Out */}
      <span
        class={`hidden sm:block text-value text-right tabular-nums whitespace-nowrap ${
          props.free ? "text-neon-green" : "text-zinc-300"
        }`}
      >
        {props.completionPrice}
      </span>
      {/* Avg */}
      <span
        class={`hidden sm:block text-value text-right tabular-nums whitespace-nowrap ${
          props.free ? "text-neon-green" : "text-zinc-300"
        }`}
      >
        {props.avgPrice}
      </span>
      {/* TB: sparse column — em-dash when unscored, honest absence */}
      <span class="hidden sm:flex justify-center">
        <Show
          when={model().terminalBench}
          fallback={
            <span class="text-body text-zinc-500" aria-hidden="true">
              —
            </span>
          }
        >
          {(bench) => (
            <TerminalBenchStat
              score={bench().overallScore}
              avgAttemptCostUsd={bench().avgAttemptCostUsd}
              compact
            />
          )}
        </Show>
      </span>
      {/* Age */}
      <span class="hidden sm:block text-caption font-medium text-right tabular-nums whitespace-nowrap">
        <Show when={props.relativeAge}>
          <span
            title={`Released ${props.createdDate}`}
            aria-label={`Released ${props.createdDate}`}
            class={
              props.isNew
                ? "text-violet-300"
                : props.relativeAgeFresh
                  ? "text-zinc-300"
                  : "text-zinc-400"
            }
          >
            {props.relativeAge}
          </span>
        </Show>
      </span>
      {/* Copy action */}
      <span class="hidden sm:flex justify-end">
        <button
          onClick={props.handleCopy}
          aria-live="polite"
          class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            props.copied
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-100 hover:border-zinc-600"
          }`}
        >
          <CopyIcon copied={props.copied} />
          {props.copied ? "Copied!" : "Copy ID"}
        </button>
      </span>
      {/* Mobile stack: everything desktop columns hold, card-style */}
      <div class="sm:hidden space-y-2.5">
        <div class="flex flex-wrap gap-x-3 gap-y-1.5 text-caption text-zinc-400">
          <Show when={model().terminalBench}>
            {(bench) => (
              <TerminalBenchStat
                score={bench().overallScore}
                avgAttemptCostUsd={bench().avgAttemptCostUsd}
                compact
              />
            )}
          </Show>
          <span class="flex items-center gap-1">
            Context: <span class="text-zinc-300 font-medium">{props.contextLength}</span>
          </span>
          <span class="flex items-center gap-1">
            In:{" "}
            <span class={`font-medium tabular-nums ${props.free ? "text-neon-green" : "text-zinc-300"}`}>
              {props.promptPrice}
            </span>
          </span>
          <span class="flex items-center gap-1">
            Out:{" "}
            <span class={`font-medium tabular-nums ${props.free ? "text-neon-green" : "text-zinc-300"}`}>
              {props.completionPrice}
            </span>
          </span>
          <span class="flex items-center gap-1">
            Avg:{" "}
            <span class={`font-medium tabular-nums ${props.free ? "text-neon-green" : "text-zinc-300"}`}>
              {props.avgPrice}
            </span>
          </span>
        </div>
        <div class="flex flex-wrap gap-3 text-micro text-zinc-400">
          <span>per 1M · {props.avgAssumptionSummary}</span>
          <Show when={props.relativeAge}>
            <span class="font-mono">{model().id}</span>
          </Show>
          <Show when={props.createdDate && props.relativeAge}>
            <span
              class={
                props.isNew
                  ? "text-violet-300"
                  : props.relativeAgeFresh
                    ? "text-zinc-300"
                    : "text-zinc-400"
              }
            >
              {props.relativeAge}
              <span class="text-zinc-500 font-normal tabular-nums"> · {props.createdDate}</span>
            </span>
          </Show>
        </div>
        <button
          onClick={props.handleCopy}
          aria-live="polite"
          class={`w-full min-h-[44px] flex items-center justify-center gap-1.5 px-4 rounded-lg text-caption font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            props.copied
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
          }`}
        >
          <CopyIcon copied={props.copied} />
          {props.copied ? "Copied!" : "Copy ID"}
        </button>
      </div>
    </div>
  );
}
