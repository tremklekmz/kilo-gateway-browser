import { createMemo, Show } from "solid-js";
import { areCostAssumptionsDefault, getUniqueProviders } from "@/lib/utils";
import { pickBenchValueLeader } from "@/lib/bench";
import { createAppState } from "@/lib/appState";
import {
  buildFilterChips,
  filterAndSortModels,
  hasFilterCriteria,
} from "@/lib/filtering";
import { SearchFilter } from "@/components/SearchFilter";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { FreshnessStamp } from "@/components/FreshnessStamp";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import FilterNotices from "@/components/FilterNotices";
import ResultsSection from "@/components/ResultsSection";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

/**
 * SPA shell and orchestrator. Owns the filter/sort pipeline as memos over the
 * reactive app state; all filter writes go through the state engine, which
 * keeps the URL as the shareable truth.
 */
export default function App() {
  const app = createAppState();

  const providers = createMemo(() => getUniqueProviders(app.models()));

  const filtered = createMemo(() =>
    filterAndSortModels(app.models(), app.filters(), app.userPickedSort()),
  );

  const filteredModels = () => filtered().models;
  const hiddenUnpricedCount = () => filtered().hiddenUnpricedCount;

  const costAssumptionsActive = () => !areCostAssumptionsDefault(app.filters().costAssumptions);
  const hasFilters = () => hasFilterCriteria(app.filters()) || costAssumptionsActive();

  const activeFilterChips = createMemo(() =>
    buildFilterChips(app.filters(), hiddenUnpricedCount()),
  );

  const visibleModels = () => filteredModels().slice(0, app.visibleCount());
  const benchValueLeader = () => pickBenchValueLeader(filteredModels());
  const hasMore = () => app.visibleCount() < filteredModels().length;

  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100">
      <AppHeader
        view={app.filters().view}
        onViewChange={(view) => app.updateFilters({ view })}
      />

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
            hasFilterCriteria={hasFilterCriteria(app.filters())}
            hiddenUnpricedCount={hiddenUnpricedCount()}
            relevanceActive={!app.userPickedSort() && !!app.filters().search}
          />
        </Show>

        <FilterNotices
          assumptionsNotice={app.assumptionsAdjustedNotice()}
          invalidNotice={app.invalidParamsNotice()}
          onDismissAssumptions={app.dismissAssumptionsNotice}
          onDismissInvalid={app.dismissInvalidParamsNotice}
        />
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
              <ResultsSection
                view={app.filters().view}
                visibleModels={visibleModels()}
                filteredTotal={filteredModels().length}
                hasMore={hasMore()}
                costAssumptions={app.filters().costAssumptions}
                benchLeader={benchValueLeader()}
                scoredCount={filteredModels().filter((m) => m.terminalBench != null).length}
                costAssumptionsActive={costAssumptionsActive()}
                loadMoreMessage={app.loadMoreMessage()}
                dataUpdatedAt={app.dataUpdatedAt()}
                onLoadMore={() => app.loadMore(filteredModels().length)}
              />
            </Show>
          </Show>
        </Show>
      </main>

      <AppFooter />
    </div>
  );
}
