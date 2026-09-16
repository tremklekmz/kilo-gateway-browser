import { createMemo, For, Show } from "solid-js";
import type { AIModel } from "@/lib/types";
import {
  areCostAssumptionsDefault,
  formatCostAssumptionSummary,
  formatPercent,
  formatProviderName,
  getAveragePricePerMillion,
  getProviderFromId,
  getUniqueProviders,
  hasPublishedPrice,
  isFreeModel,
  relevanceScore,
  splitProviderParam,
} from "@/lib/utils";
import { pickBenchValueLeader } from "@/lib/bench";
import { UNPRICED_CHIP_SUFFIX } from "@/lib/appState";
import { SearchFilter } from "@/components/SearchFilter";
import { ModelCard } from "@/components/ModelCard";
import { ViewToggle } from "@/components/ViewToggle";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { Pagination } from "@/components/Pagination";
import { BenchValueStrip } from "@/components/BenchValue";
import { FreshnessStamp } from "@/components/FreshnessStamp";
import { createAppState } from "@/lib/appState";

/** A filter chip is amber when it flags unpriced models hidden by the price filter. */
function chipClass(chip: string): string {
  return chip.endsWith(UNPRICED_CHIP_SUFFIX)
    ? "px-2 py-0.5 rounded-full text-caption bg-amber-500/10 text-amber-300 border border-amber-500/20"
    : "px-2 py-0.5 rounded-full text-caption bg-zinc-800/80 text-zinc-300 border border-zinc-700";
}

function ErrorState(props: { message: string; onRetry: () => void }) {
  return (
    <div class="flex flex-col items-center justify-center py-24 text-center" role="alert">
      <div class="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-red-400"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <h3 class="text-headline text-zinc-200 mb-2">Models are unavailable</h3>
      <p class="text-body text-zinc-400 mb-1 max-w-sm">{props.message}</p>
      <p class="text-caption text-zinc-400 max-w-sm mb-6">Check your connection, then try again.</p>
      <button
        onClick={props.onRetry}
        class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-body font-medium rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState(props: {
  hasFilters: boolean;
  filterChips: string[];
  onReset: () => void;
}) {
  return (
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-zinc-500"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 class="text-headline text-zinc-200 mb-2">No models found</h3>
      <p class="text-body text-zinc-400">
        {props.hasFilters
          ? "No models match the active filters."
          : "No models are available at this time."}
      </p>
      <Show when={props.hasFilters && props.filterChips.length > 0}>
        <div class="flex flex-wrap justify-center gap-1.5 mt-4 max-w-md">
          <For each={props.filterChips}>
            {(chip) => (
              <span class={chipClass(chip)}>
                {chip}
              </span>
            )}
          </For>
        </div>
      </Show>
      <Show when={props.hasFilters}>
        <button
          onClick={props.onReset}
          class="mt-6 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-body font-medium rounded-lg transition-colors duration-200"
        >
          Clear all filters
        </button>
      </Show>
    </div>
  );
}

/**
 * SPA shell and orchestrator. Owns the filter/sort pipeline as memos over the
 * reactive app state; all filter writes go through the state engine, which
 * keeps the URL as the shareable truth.
 */
export default function App() {
  const app = createAppState();
  const SORT_LABELS: Record<string, string> = {
    newest: "Newest first",
    default: "Provider default order",
    oldest: "Oldest first",
    "price-asc": "Price: low to high",
    "price-desc": "Price: high to low",
    "bench-asc": "Benchmark: low to high",
    "bench-desc": "Benchmark: high to low",
  };

  const providers = createMemo(() => getUniqueProviders(app.models()));

  const filtered = createMemo(() => {
    const { models, search, selectedProvider, freeOnly, sortBy, userPickedSort, priceMin, priceMax, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions } = {
      ...app.filters(),
      models: app.models(),
      userPickedSort: app.userPickedSort(),
    };
    // Shared per-million-token avg price helper, reused by range filter and
    // price sorting so the same formula powers card display, filtering, and
    // sorting.
    const getAvgPriceForModel = (model: AIModel) =>
      getAveragePricePerMillion(model, costAssumptions);

    // Parse range bounds once. Empty strings or malformed values become null
    // (treated as "no bound on this side"). Negative price inputs are ignored.
    const parsedPriceMin = priceMin === "" ? NaN : Number(priceMin);
    const parsedPriceMax = priceMax === "" ? NaN : Number(priceMax);
    const minPriceNum = Number.isFinite(parsedPriceMin) && parsedPriceMin >= 0 ? parsedPriceMin : null;
    const maxPriceNum = Number.isFinite(parsedPriceMax) && parsedPriceMax >= 0 ? parsedPriceMax : null;
    const priceBoundActive = minPriceNum != null || maxPriceNum != null;

    const parsedFromMs = dateFrom === "" ? NaN : Date.parse(dateFrom);
    const parsedToMs = dateTo === "" ? NaN : Date.parse(dateTo);
    // Convert to Unix seconds (matching AIModel.created). Shift `to` to end of
    // day so e.g. dateTo=2024-01-15 is inclusive of any time on that calendar
    // day (UTC-based to keep behaviour predictable across timezones).
    const fromTs = Number.isFinite(parsedFromMs) ? parsedFromMs / 1000 : null;
    const toTs = Number.isFinite(parsedToMs) ? (parsedToMs + 86_399_999) / 1000 : null;
    const dateActive = fromTs != null || toTs != null;

    // TerminalBench filters. When either bound is active, models without any
    // benchmark data are excluded (per product spec). The max-cost bound keeps
    // models that have a score but no cost recorded.
    const parsedBenchMin = benchMin === "" ? NaN : Number(benchMin);
    const benchMinNum =
      Number.isFinite(parsedBenchMin) && parsedBenchMin >= 0 && parsedBenchMin <= 1
        ? parsedBenchMin
        : null;
    const parsedBenchMaxCost = benchMaxCost === "" ? NaN : Number(benchMaxCost);
    const benchMaxCostNum =
      Number.isFinite(parsedBenchMaxCost) && parsedBenchMaxCost >= 0 ? parsedBenchMaxCost : null;
    const benchActive = benchMinNum != null || benchMaxCostNum != null;

    // `provider` may hold a CSV selection ("anthropic,openai") from the
    // provider combobox — membership test against the split set.
    const providerSet = selectedProvider ? splitProviderParam(selectedProvider) : null;

    const matchesNonPricePredicates = (model: AIModel) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        model.name.toLowerCase().includes(searchLower) ||
        model.id.toLowerCase().includes(searchLower) ||
        (model.description?.toLowerCase().includes(searchLower) ?? false);

      const matchesProvider = !providerSet || providerSet.includes(getProviderFromId(model.id));
      const matchesFree = !freeOnly || isFreeModel(model);

      // Date range — model.created is a Unix timestamp (seconds). Models with
      // `created === 0` are meta/router placeholders with no real date and are
      // excluded whenever any date bound is active.
      const matchesDate =
        !dateActive ||
        (model.created !== 0 &&
          (fromTs == null || model.created >= fromTs) &&
          (toTs == null || model.created <= toTs));

      // TerminalBench filters. When either bound is active, models missing
      // benchmark data are dropped. The max-cost bound additionally keeps
      // models that have a score but no `avgAttemptCostUsd` recorded.
      const bench = model.terminalBench;
      const matchesBench =
        !benchActive ||
        (bench != null &&
          (benchMinNum == null || bench.overallScore >= benchMinNum) &&
          (benchMaxCostNum == null ||
            bench.avgAttemptCostUsd == null ||
            bench.avgAttemptCostUsd <= benchMaxCostNum));

      return matchesSearch && matchesProvider && matchesFree && matchesDate && matchesBench;
    };

    const filtered = models.filter((model) => {
      // Avg price range — compared in $/1M tokens to match the unit shown on
      // ModelCard and in the filter inputs. Unpriced models (NaN average from
      // -1 sentinels) fail both bounds and are filtered out.
      const avgPerMillion = priceBoundActive ? getAvgPriceForModel(model) : 0;
      const matchesPriceMin = minPriceNum == null || avgPerMillion >= minPriceNum;
      const matchesPriceMax = maxPriceNum == null || avgPerMillion <= maxPriceNum;
      return matchesNonPricePredicates(model) && matchesPriceMin && matchesPriceMax;
    });

    // Models whose ONLY failing bound is the price filter: unpriced (no
    // published prices) while a price bound is active and every other
    // predicate passes. Reported to SearchFilter/EmptyState; never counts
    // toward filteredCount.
    const hiddenUnpricedCount = priceBoundActive
      ? models.filter((model) => !hasPublishedPrice(model) && matchesNonPricePredicates(model)).length
      : 0;

    // Relevance ordering: while a query is active and the user hasn't picked a
    // sort this session, relevanceScore wins. Ties break by newest `created`
    // first; placeholders (created === 0) always sink to the end.
    if (search && !userPickedSort) {
      const query = search;
      return {
        models: [...filtered].sort((a, b) => {
          const scoreDiff = relevanceScore(b, query) - relevanceScore(a, query);
          if (scoreDiff !== 0) return scoreDiff;
          if ((a.created === 0) !== (b.created === 0)) return a.created === 0 ? 1 : -1;
          return b.created - a.created;
        }),
        hiddenUnpricedCount,
      };
    }

    // "newest" is the recency-first overview order; placeholders (created === 0)
    // sink to the end. "default" preserves the gateway's own API order.
    if (sortBy === "newest") {
      return {
        models: [...filtered].sort((a, b) => {
          if ((a.created === 0) !== (b.created === 0)) return a.created === 0 ? 1 : -1;
          return b.created - a.created;
        }),
        hiddenUnpricedCount,
      };
    }
    if (sortBy === "oldest") {
      return {
        models: [...filtered].sort((a, b) => {
          if ((a.created === 0) !== (b.created === 0)) return a.created === 0 ? 1 : -1;
          return a.created - b.created;
        }),
        hiddenUnpricedCount,
      };
    }
    if (sortBy === "price-asc" || sortBy === "price-desc") {
      // Models with unpublished prices (-1 sentinels → NaN average, shown as
      // "Varies") sink to the end regardless of direction.
      return {
        models: [...filtered].sort((a, b) => {
          const aPrice = getAvgPriceForModel(a);
          const bPrice = getAvgPriceForModel(b);
          const aOk = Number.isFinite(aPrice);
          const bOk = Number.isFinite(bPrice);
          if (!aOk && !bOk) return 0;
          if (aOk !== bOk) return aOk ? -1 : 1;
          return sortBy === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
        }),
        hiddenUnpricedCount,
      };
    }
    if (sortBy === "bench-asc" || sortBy === "bench-desc") {
      return {
        models: [...filtered].sort((a, b) => {
          // Models with no benchmark data sink to the end regardless of direction.
          const aHas = a.terminalBench != null;
          const bHas = b.terminalBench != null;
          if (!aHas && !bHas) return 0;
          if (aHas !== bHas) return aHas ? -1 : 1;
          const aScore = a.terminalBench!.overallScore;
          const bScore = b.terminalBench!.overallScore;
          return sortBy === "bench-asc" ? aScore - bScore : bScore - aScore;
        }),
        hiddenUnpricedCount,
      };
    }
    return { models: filtered, hiddenUnpricedCount };
  });

  const filteredModels = () => filtered().models;
  const hiddenUnpricedCount = () => filtered().hiddenUnpricedCount;

  const costAssumptionsActive = () => !areCostAssumptionsDefault(app.filters().costAssumptions);
  const hasFilterCriteria = () => {
    const f = app.filters();
    return (
      !!f.search ||
      !!f.selectedProvider ||
      f.freeOnly ||
      f.sortBy !== "newest" ||
      !!f.priceMin ||
      !!f.priceMax ||
      !!f.benchMin ||
      !!f.benchMaxCost ||
      !!f.dateFrom ||
      !!f.dateTo
    );
  };
  const hasFilters = () => hasFilterCriteria() || costAssumptionsActive();

  const activeFilterChips = createMemo(() => {
    const f = app.filters();
    const assumptionsActive = !areCostAssumptionsDefault(f.costAssumptions);
    const chips: string[] = [];
    if (f.search) chips.push(`Search: "${f.search}"`);
    if (f.selectedProvider) {
      const providerNames = splitProviderParam(f.selectedProvider)
        .map((provider) => formatProviderName(provider))
        .join(", ");
      chips.push(`Provider: ${providerNames}`);
    }
    if (f.freeOnly) chips.push("Free only");
    if (f.sortBy !== "newest") {
      chips.push(`Sort: ${SORT_LABELS[f.sortBy] ?? f.sortBy}`);
    }
    if (f.priceMin) chips.push(`Avg ≥ $${f.priceMin}`);
    if (f.priceMax) chips.push(`Avg ≤ $${f.priceMax}`);
    if (f.benchMin) chips.push(`TerminalBench ≥ ${formatPercent(Number(f.benchMin), 0)}`);
    if (f.benchMaxCost) chips.push(`Bench cost ≤ $${f.benchMaxCost}`);
    if (f.dateFrom) chips.push(`From ${f.dateFrom}`);
    if (f.dateTo) chips.push(`To ${f.dateTo}`);
    if (assumptionsActive) chips.push(formatCostAssumptionSummary(f.costAssumptions));
    if (hiddenUnpricedCount() > 0) {
      chips.push(`${hiddenUnpricedCount()} ${UNPRICED_CHIP_SUFFIX}`);
    }
    return chips;
  });

  const visibleModels = () => filteredModels().slice(0, app.visibleCount());
  const benchValueLeader = () => pickBenchValueLeader(filteredModels());
  const hasMore = () => app.visibleCount() < filteredModels().length;

  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100">
      <header class="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
        <div class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              {/* Logo mark */}
              <div class="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-violet-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <p class="text-title font-bold text-zinc-100 leading-none">Kilo Gateway</p>
                <p class="text-caption text-zinc-400 leading-none mt-0.5">AI Model Explorer</p>
              </div>
            </div>
            <ViewToggle
              view={app.filters().view}
              onViewChange={(view) => app.updateFilters({ view })}
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div class="mb-8">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 class="text-display-sm sm:text-display text-zinc-100">Latest AI Models</h1>
            <Show when={app.dataUpdatedAt() != null}>
              <FreshnessStamp
                updatedAt={app.dataUpdatedAt()!}
                class="text-caption tabular-nums text-zinc-300"
              />
            </Show>
          </div>
          <p class="mt-2 text-zinc-400 text-body max-w-2xl">
            Newest releases across every provider on the Kilo Gateway — compare price, context,
            and capability to pick the current best.
          </p>
          <p class="mt-2 text-caption text-zinc-400">
            Newest first · NEW marks releases from the last 14 days
          </p>
        </div>

        {/* Search & Filter */}
        <Show when={!app.loading() && !app.error()}>
          <SearchFilter
            app={app}
            providers={providers()}
            filteredCount={filteredModels().length}
            totalCount={app.models().length}
            hasFilters={hasFilters()}
            hasFilterCriteria={hasFilterCriteria()}
            hiddenUnpricedCount={hiddenUnpricedCount()}
            relevanceActive={!app.userPickedSort() && !!app.filters().search}
          />
        </Show>

        {/* Shared-URL cost assumptions that were out of range got clamped — tell the recipient. */}
        <Show when={app.assumptionsAdjustedNotice()}>
          <div
            role="status"
            class="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-caption text-amber-300"
          >
            <span>Shared cost assumptions were outside 0–100% and were adjusted.</span>
            <button
              type="button"
              onClick={app.dismissAssumptionsNotice}
              class="shrink-0 font-semibold text-amber-400 hover:text-amber-200 transition-colors flex items-center justify-center max-sm:min-h-11 max-sm:min-w-11 -my-2 max-sm:-mx-1"
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        </Show>
        {/* Shared URL carried filter params that failed validation — list them once. */}
        <Show when={app.invalidParamsNotice()}>
          <div
            role="status"
            class="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-caption text-amber-300"
          >
            <span>
              Ignored invalid filter(s) from link: {app.invalidParamsNotice()!.join(", ")}
            </span>
            <button
              type="button"
              onClick={app.dismissInvalidParamsNotice}
              class="shrink-0 font-semibold text-amber-400 hover:text-amber-200 transition-colors flex items-center justify-center max-sm:min-h-11 max-sm:min-w-11 -my-2 max-sm:-mx-1"
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        </Show>
      </div>

      <main class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Show
          when={!app.loading()}
          fallback={<SkeletonGrid count={12} view={app.filters().view} />}
        >
          <Show when={!app.error()} fallback={<ErrorState message={app.error()!} onRetry={app.refresh} />}>
            <Show
              when={filteredModels().length > 0}
              fallback={
                <EmptyState
                  hasFilters={hasFilters()}
                  filterChips={activeFilterChips()}
                  onReset={app.resetAll}
                />
              }
            >
              <Show when={benchValueLeader()}>
                {(leader) => (
                  <div class="mb-4">
                    <BenchValueStrip
                      leader={leader()}
                      scoredCount={filteredModels().filter((m) => m.terminalBench != null).length}
                      totalCount={filteredModels().length}
                    />
                  </div>
                )}
              </Show>
              {/* Content: list view renders as a comparison table — a sticky
                  labeled header row sharing the exact grid template with each
                  ModelCard list row, so numeric columns align for scanning.
                  A footer line carries the shared per-1M assumption basis. */}
              <Show
                when={app.filters().view === "list"}
                fallback={
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <For each={visibleModels()}>
                      {(model) => (
                        <ModelCard
                          model={model}
                          view="grid"
                          costAssumptions={app.filters().costAssumptions}
                          isBenchValueLeader={benchValueLeader()?.id === model.id}
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
                    <For each={visibleModels()}>
                      {(model) => (
                        <ModelCard
                          model={model}
                          view="list"
                          costAssumptions={app.filters().costAssumptions}
                          isBenchValueLeader={benchValueLeader()?.id === model.id}
                        />
                      )}
                    </For>
                  </div>
                  <p class="px-4 py-2.5 text-micro text-zinc-400 border border-zinc-800 rounded-xl bg-zinc-900/40 mt-3">
                    Prices per 1M tokens · avg assumes{" "}
                    {formatCostAssumptionSummary(app.filters().costAssumptions)}
                    {costAssumptionsActive() && " (custom — adjust in More filters)"}
                  </p>
                </div>
              </Show>
              <Show when={hasMore()}>
                <Pagination
                  visibleCount={visibleModels().length}
                  totalCount={filteredModels().length}
                  onLoadMore={() => app.loadMore(filteredModels().length)}
                />
              </Show>
              <Show when={app.loadMoreMessage()}>
                <p role="status" aria-live="polite" class="sr-only">
                  {app.loadMoreMessage()}
                </p>
              </Show>
              <Show when={!hasMore()}>
                <div class="text-center text-caption py-8">
                  <p role="status" class="text-zinc-400">
                    All {filteredModels().length} models shown
                  </p>
                  <Show when={app.dataUpdatedAt() != null}>
                    <FreshnessStamp
                      updatedAt={app.dataUpdatedAt()!}
                      class="mt-1 inline-block text-zinc-400"
                    />
                  </Show>
                </div>
              </Show>
            </Show>
          </Show>
        </Show>
      </main>

      {/* Footer */}
      <footer class="border-t border-zinc-800/60 py-6">
        <div class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-caption text-zinc-400">
          Data sourced from{" "}
          <a
            href="https://api.kilo.ai/api/gateway/models"
            target="_blank"
            rel="noopener noreferrer"
            class="text-violet-400 hover:text-violet-300 transition-colors"
          >
            api.kilo.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
