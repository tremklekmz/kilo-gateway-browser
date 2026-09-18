import { Show } from "solid-js";
import type { AIModel } from "@/lib/types";
import { formatDisplayName } from "@/lib/utils";
import { BenchValueTick, FreeBadge, NewBadge, ProviderBadge } from "./badges";
import { CopyIcon } from "./CopyIcon";
import { ExpandableDescription } from "./ExpandableDescription";
import { ModalityBadges } from "./ModalityBadges";
import { TerminalBenchStat } from "./TerminalBenchStat";
import { TrainingWarning } from "./TrainingWarning";

export function ModelCardGrid(props: {
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
  isBenchValueLeader: boolean;
  handleCopy: () => void;
  copied: boolean;
}) {
  const model = () => props.model;
  return (
    <div class="group flex h-full flex-col p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      {/* Identity row: provider + status badges, age pinned right */}
      <div class="mb-2 flex items-center justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-1.5">
          <ProviderBadge provider={props.provider} />
          {props.free && <FreeBadge />}
          {props.isNew && <NewBadge />}
          <Show when={props.isBenchValueLeader}>
            <BenchValueTick />
          </Show>
        </div>
        <Show when={props.relativeAge}>
          <span
            title={props.createdDate ?? undefined}
            class={`shrink-0 text-caption font-medium tabular-nums ${
              props.isNew ? "text-violet-300" : "text-zinc-400"
            }`}
          >
            {props.relativeAge}
          </span>
        </Show>
      </div>
      <h3 class="text-title text-zinc-100 leading-snug line-clamp-2">
        {formatDisplayName(model().name)}
      </h3>
      <div class="mt-1">
        <ModalityBadges modalities={model().architecture?.input_modalities ?? []} />
      </div>
      <Show when={model().description}>
        <div class="mt-2">
          <ExpandableDescription
            text={model().description}
            lineClamp={2}
            class="text-caption text-zinc-400 break-words"
          />
        </div>
      </Show>
      <Show when={model().mayTrainOnYourPrompts}>
        <div class="mt-2">
          <TrainingWarning />
        </div>
      </Show>
      {/* Hero number + capability row. TB reuses the list-view compact chip
          (exact score + tap tooltip), never a rounded inline span. */}
      <div class="mt-3 border-y border-zinc-800 py-3">
        <p class="text-caption font-medium uppercase tracking-wide text-zinc-400">
          Avg cost · {props.avgAssumptionSummary}
        </p>
        <p class="text-display tabular-nums text-zinc-50">
          {props.avgPrice}
          <span class="text-caption font-normal text-zinc-400"> /1M</span>
        </p>
        <p class="mt-1 text-caption tabular-nums text-zinc-400">
          {props.contextLength} ctx · In {props.promptPrice} · Out {props.completionPrice}
        </p>
        <Show when={model().terminalBench}>
          {(bench) => (
            <div class="mt-2 flex items-center gap-2 border-t border-zinc-800 pt-2">
              <span class="text-caption font-medium uppercase tracking-wide text-zinc-400">
                Capability
              </span>
              <TerminalBenchStat
                score={bench().overallScore}
                avgAttemptCostUsd={bench().avgAttemptCostUsd}
                compact
              />
            </div>
          )}
        </Show>
      </div>
      {/* Bottom-pinned footer: mt-auto absorbs the slack from short descriptions
          so Released + ID/copy glue to the card bottom and row bottoms align. */}
      <div class="mt-auto pt-2">
      <Show when={props.createdDate}>
        <p class="text-micro tabular-nums text-zinc-400">
          Released {props.createdDate}
        </p>
      </Show>
      {/* Model ID + Copy */}
      <div class="mt-2 flex min-w-0 items-center gap-2 border-t border-zinc-800 pt-3">
        <code class="flex-1 truncate font-mono text-micro text-zinc-400">{model().id}</code>
        <button
          onClick={props.handleCopy}
          title="Copy model ID"
          aria-live="polite"
          class={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:justify-center max-sm:px-3 ${
            props.copied
              ? "text-emerald-400"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          }`}
        >
          <CopyIcon copied={props.copied} />
          <span class={props.copied ? "inline" : "hidden sm:inline"}>
            {props.copied ? "Copied!" : "Copy"}
          </span>
        </button>
      </div>
      </div>
    </div>
  );
}
