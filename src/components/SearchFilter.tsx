import { createEffect, createMemo, createSignal, Show } from "solid-js";
import type { AppState } from "@/lib/appState";
import { DEFAULT_COST_ASSUMPTIONS, normalizeCostAssumptions } from "@/lib/utils";
import { ProviderCombobox } from "./search-filter/ProviderCombobox";
import { SortSelect } from "./search-filter/SortSelect";
import { FiltersPanel } from "./search-filter/FiltersPanel";
import { MobileFiltersSheet } from "./search-filter/MobileFiltersSheet";
import { SearchInput } from "./search-filter/SearchInput";
import { ResultsCount } from "./search-filter/ResultsCount";
import { ChevronDownIcon, ResetIcon, SlidersIcon } from "./search-filter/icons";

interface SearchFilterProps {
  app: AppState;
  providers: string[];
  filteredCount: number;
  totalCount: number;
  hasFilters: boolean;
  hasFilterCriteria: boolean;
  hiddenUnpricedCount: number;
  relevanceActive: boolean;
}

export function SearchFilter(props: SearchFilterProps) {
  const app = props.app;
  // Auto-expand on initial mount when any panel-only filter is active so a
  // user landing on a URL like `?priceMax=5` or `?free=true` immediately
  // sees the active control. Initializer-only — we deliberately do NOT
  // re-sync on change so the user's manual collapse choice is respected.
  const f0 = app.filters();
  const [expanded, setExpanded] = createSignal(
    !!(f0.freeOnly || f0.priceMin || f0.priceMax || f0.benchMin || f0.benchMaxCost || f0.dateFrom || f0.dateTo || f0.costAssumptions.outputTokenShare !== DEFAULT_COST_ASSUMPTIONS.outputTokenShare || f0.costAssumptions.inputCacheHitRate !== DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate),
  );

  // Mobile filters sheet (below sm): provider, sort, and the panel content
  // live here; the primary row collapses to search + Filters toggle + count.
  const [filtersOpen, setFiltersOpen] = createSignal(false);

  const activeRangeCount = createMemo(() => {
    const f = app.filters();
    const assumptionsActive =
      f.costAssumptions.outputTokenShare !== DEFAULT_COST_ASSUMPTIONS.outputTokenShare ||
      f.costAssumptions.inputCacheHitRate !== DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate;
    return (
      (f.freeOnly ? 1 : 0) +
      (f.priceMin ? 1 : 0) +
      (f.priceMax ? 1 : 0) +
      (f.benchMin ? 1 : 0) +
      (f.benchMaxCost ? 1 : 0) +
      (f.dateFrom ? 1 : 0) +
      (f.dateTo ? 1 : 0) +
      (assumptionsActive ? 1 : 0)
    );
  });

  // Cost assumptions are expert controls — collapsed by default, open on
  // mount when non-default assumptions are already active. Derived during
  // render (no effect): an explicit user toggle wins (`assumptionsOverride`,
  // set by onToggle so a manual close sticks); with no user choice the
  // details follow the auto rule "open while the panel is expanded and the
  // active assumptions are non-default". The override resets on each panel
  // expansion (the <details> remounts with the panel, so non-default
  // assumptions must stay discoverable after collapse + re-expand).
  const [assumptionsOverride, setAssumptionsOverride] = createSignal<boolean | null>(null);
  // Reset the override each time the panel expands to true (effect phase is an
  // imperative scope, so the write is legal here; `lastExpanded` scaffolding
  // from Solid 1 is gone — the compute phase already fires only on changes).
  createEffect(
    () => expanded(),
    (isExpanded) => {
      if (isExpanded) setAssumptionsOverride(null);
    },
  );
  const activeAssumptionsActive = () => {
    const n = normalizeCostAssumptions(app.filters().costAssumptions);
    return (
      n.outputTokenShare !== DEFAULT_COST_ASSUMPTIONS.outputTokenShare ||
      n.inputCacheHitRate !== DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate
    );
  };
  const assumptionsOpen = () =>
    assumptionsOverride() ?? (expanded() && activeAssumptionsActive());
  // Benchmark gates disclosure — same override semantics as the assumptions
  // details: an explicit user toggle wins (`benchOverride`), otherwise the
  // gate opens while the panel is expanded and a bench filter is active.
  // The override resets on each panel expansion (see assumptionsOverride).
  const [benchOverride, setBenchOverride] = createSignal<boolean | null>(null);
  createEffect(
    () => expanded(),
    (isExpanded) => {
      if (isExpanded) setBenchOverride(null);
    },
  );
  const benchOpen = () =>
    benchOverride() ?? (expanded() && !!(app.filters().benchMin || app.filters().benchMaxCost));

  return (
    <div class="flex flex-col gap-3">
      {/* Primary controls row */}
      <div class="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search — full-width row on mobile, first slot on desktop */}
        <SearchInput app={app} />

        {/* Mobile controls row — Filters opens the sheet; Reset mirrors the desktop affordance */}
        <div class="sm:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-expanded={filtersOpen() ? "true" : "false"}
            aria-controls="filters-sheet"
            class={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-body font-medium border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
              activeRangeCount() > 0
                ? "bg-violet-500/10 text-violet-300 border-violet-500/40 hover:border-violet-500/60"
                : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            <SlidersIcon />
            Filters
            <Show when={activeRangeCount() > 0}>
              <span class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-violet-500/20 text-violet-200 text-caption font-semibold tabular-nums">
                {activeRangeCount()}
              </span>
            </Show>
          </button>
          <Show when={props.hasFilterCriteria}>
            <button
              type="button"
              onClick={app.resetFilters}
              class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-body font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <ResetIcon />
              Reset filters
            </button>
          </Show>
        </div>

        {/* Count readout — slim status line under the search on mobile */}
        <ResultsCount
          filteredCount={props.filteredCount}
          totalCount={props.totalCount}
          updatedAt={app.dataUpdatedAt()}
        />

        {/* Desktop controls (sm+) — the desktop row, unchanged */}
        <div class="hidden sm:block sm:w-48 relative">
          <ProviderCombobox
            class="relative sm:w-48"
            provider={app.filters().selectedProvider}
            onProviderChange={(value) => app.updateFilters({ selectedProvider: value })}
            providers={props.providers}
          />
        </div>
        <div class="hidden sm:block sm:w-44 relative">
          <SortSelect
            class="relative sm:w-44"
            value={props.relevanceActive ? "relevance" : app.filters().sortBy}
            onChange={app.setSortBy}
          />
        </div>
        {/* More filters toggle — desktop inline expand */}
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded() ? "true" : "false"}
          aria-controls="more-filters-panel"
          class={`hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-body font-medium border transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            activeRangeCount() > 0
              ? "bg-violet-500/10 text-violet-300 border-violet-500/40 hover:border-violet-500/60"
              : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
          }`}
        >
          <SlidersIcon />
          {expanded() ? "Hide filters" : "More filters"}
          <Show when={activeRangeCount() > 0}>
            <span class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-violet-500/20 text-violet-200 text-caption font-semibold tabular-nums">
              {activeRangeCount()}
            </span>
          </Show>
          <ChevronDownIcon open={expanded()} />
        </button>
        <Show when={props.hasFilterCriteria}>
          <button
            onClick={app.resetFilters}
            class="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-body font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <ResetIcon />
            Reset filters
          </button>
        </Show>
      </div>
      <Show when={filtersOpen()}>
        <MobileFiltersSheet
          app={app}
          providers={props.providers}
          relevanceActive={props.relevanceActive}
          hasFilters={props.hasFilters}
          benchOpen={benchOpen()}
          assumptionsOpen={assumptionsOpen()}
          onToggleBench={() => setBenchOverride(!benchOpen())}
          onToggleAssumptions={(open) => setAssumptionsOverride(open)}
          onClose={() => setFiltersOpen(false)}
        />
      </Show>

      {/* Hidden unpriced models — announced to screen readers when it appears */}
      <Show when={props.hiddenUnpricedCount > 0}>
        <p role="status" class="text-caption text-amber-300">
          {props.hiddenUnpricedCount} model{props.hiddenUnpricedCount === 1 ? "" : "s"} without
          published prices hidden by the price filter.
        </p>
      </Show>

      {/* Collapsible "More filters" panel — desktop (sm+). Below sm the same
          content renders inside the mobile filters sheet instead. The panel
          root carries both the group scope and the active-bench state so the
          gate body reacts via the group-data variant without a second
          checkbox-style input. */}
      <Show when={expanded()}>
        <div id="more-filters-panel" class="max-sm:hidden">
          <FiltersPanel
            app={app}
            idSuffix=""
            expanded={expanded()}
            benchOpen={benchOpen()}
            assumptionsOpen={assumptionsOpen()}
            onToggleBench={() => setBenchOverride(!benchOpen())}
            onToggleAssumptions={(open) => setAssumptionsOverride(open)}
          />
        </div>
      </Show>
    </div>
  );
}
