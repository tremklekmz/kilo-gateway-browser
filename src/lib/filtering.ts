import type { AIModel } from "@/lib/types";
import type { AppFilters } from "@/lib/appState";
import { UNPRICED_CHIP_SUFFIX } from "@/lib/appState";
import {
  areCostAssumptionsDefault,
  formatCostAssumptionSummary,
  formatPercent,
  formatProviderName,
  getAveragePricePerMillion,
  getProviderFromId,
  hasPublishedPrice,
  isFreeModel,
  relevanceScore,
  splitProviderParam,
} from "@/lib/utils";

export const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  default: "Provider default order",
  oldest: "Oldest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "bench-asc": "Benchmark: low to high",
  "bench-desc": "Benchmark: high to low",
};

export function filterAndSortModels(
  models: AIModel[],
  filters: AppFilters,
  userPickedSort: boolean,
): { models: AIModel[]; hiddenUnpricedCount: number } {
  const { search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions } = filters;
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
}

export function hasFilterCriteria(filters: AppFilters): boolean {
  return (
    !!filters.search ||
    !!filters.selectedProvider ||
    filters.freeOnly ||
    filters.sortBy !== "newest" ||
    !!filters.priceMin ||
    !!filters.priceMax ||
    !!filters.benchMin ||
    !!filters.benchMaxCost ||
    !!filters.dateFrom ||
    !!filters.dateTo
  );
}

export function buildFilterChips(filters: AppFilters, hiddenUnpricedCount: number): string[] {
  const f = filters;
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
  if (hiddenUnpricedCount > 0) {
    chips.push(`${hiddenUnpricedCount} ${UNPRICED_CHIP_SUFFIX}`);
  }
  return chips;
}
