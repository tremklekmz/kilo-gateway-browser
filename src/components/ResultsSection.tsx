import { For, Show } from "solid-js";
import type { AIModel } from "@/lib/types";
import type { CostAssumptions } from "@/lib/utils";
import { formatCostAssumptionSummary } from "@/lib/utils";
import { ModelCard } from "@/components/ModelCard";
import { Pagination } from "@/components/Pagination";
import { BenchValueStrip } from "@/components/BenchValue";
import { FreshnessStamp } from "@/components/FreshnessStamp";

export default function ResultsSection(props: {
  view: "grid" | "list";
  visibleModels: AIModel[];
  filteredTotal: number;
  hasMore: boolean;
  costAssumptions: CostAssumptions;
  benchLeader: AIModel | null;
  scoredCount: number;
  costAssumptionsActive: boolean;
  loadMoreMessage: string;
  dataUpdatedAt: number | null;
  onLoadMore: () => void;
}) {
  return (
    <>
      <Show when={props.benchLeader}>
        {(leader) => (
          <div class="mb-4">
            <BenchValueStrip
              leader={leader()}
              scoredCount={props.scoredCount}
              totalCount={props.filteredTotal}
            />
          </div>
        )}
      </Show>
      {/* Content: list view renders as a comparison table — a sticky
          labeled header row sharing the exact grid template with each
          ModelCard list row, so numeric columns align for scanning.
          A footer line carries the shared per-1M assumption basis. */}
      <Show
        when={props.view === "list"}
        fallback={
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <For each={props.visibleModels}>
              {(model) => (
                <ModelCard
                  model={model}
                  view="grid"
                  costAssumptions={props.costAssumptions}
                  isBenchValueLeader={props.benchLeader?.id === model.id}
                />
              )}
            </For>
          </div>
        }
      >
        <div>
          <div
            role="row"
            aria-rowindex={1}
            class="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_80px_96px_96px_96px_72px_64px_108px] sm:items-center sm:gap-x-4 sm:px-4 sm:py-2.5 sticky top-16 z-5 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 text-caption font-medium uppercase tracking-wide text-zinc-400"
          >
            <span>Model</span>
            <span class="text-right whitespace-nowrap">Context</span>
            <span class="text-right whitespace-nowrap">In $/1M</span>
            <span class="text-right whitespace-nowrap">Out $/1M</span>
            <span class="text-right whitespace-nowrap">Avg $/1M</span>
            <span class="text-center whitespace-nowrap">TB</span>
            <span class="text-right whitespace-nowrap">Age</span>
            <span class="sr-only">Actions</span>
          </div>
          <div class="flex flex-col gap-3 pt-3">
            <For each={props.visibleModels}>
              {(model) => (
                <ModelCard
                  model={model}
                  view="list"
                  costAssumptions={props.costAssumptions}
                  isBenchValueLeader={props.benchLeader?.id === model.id}
                />
              )}
            </For>
          </div>
          <p class="px-4 py-2.5 text-micro text-zinc-400 border border-zinc-800 rounded-xl bg-zinc-900/40 mt-3">
            Prices per 1M tokens · avg assumes{" "}
            {formatCostAssumptionSummary(props.costAssumptions)}
            {props.costAssumptionsActive && " (custom — adjust in More filters)"}
          </p>
        </div>
      </Show>
      <Show when={props.hasMore}>
        <Pagination
          visibleCount={props.visibleModels.length}
          totalCount={props.filteredTotal}
          onLoadMore={props.onLoadMore}
        />
      </Show>
      <Show when={props.loadMoreMessage}>
        <p role="status" aria-live="polite" class="sr-only">
          {props.loadMoreMessage}
        </p>
      </Show>
      <Show when={!props.hasMore}>
        <div class="text-center text-caption py-8">
          <p role="status" class="text-zinc-400">
            All {props.filteredTotal} models shown
          </p>
          <Show when={props.dataUpdatedAt != null}>
            <FreshnessStamp
              updatedAt={props.dataUpdatedAt!}
              class="mt-1 inline-block text-zinc-400"
            />
          </Show>
        </div>
      </Show>
    </>
  );
}
