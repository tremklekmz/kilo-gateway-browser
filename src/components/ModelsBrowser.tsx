"use client";

import { useState, useEffect, useMemo, useCallback, useTransition, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AIModel, ModelsResponse } from "@/lib/types";
import {
  areCostAssumptionsDefault,
  COST_ASSUMPTIONS_STORAGE_KEY,
  CostAssumptions,
  DEFAULT_COST_ASSUMPTIONS,
  formatCostAssumptionSummary,
  formatPercent,
  formatProviderName,
  getAveragePricePerMillion,
  getProviderFromId,
  getUniqueProviders,
  hasPublishedPrice,
  isFreeModel,
  normalizeCostAssumptions,
  parseCostAssumptionParam,
  relevanceScore,
  serializeCostAssumptionParam,
  SortBy,
  splitProviderParam,
} from "@/lib/utils";
import { ModelCard } from "./ModelCard";
import { SearchFilter } from "./SearchFilter";
import { ViewToggle } from "./ViewToggle";
import { SkeletonGrid } from "./SkeletonCard";
import { Pagination } from "./Pagination";
import { MODELS_API_URL } from "@/lib/constants";

const PAGE_SIZE = 40;

const SORT_VALUES: readonly SortBy[] = [
  "default",
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "bench-asc",
  "bench-desc",
];

/** Suffix identifying the amber "unpriced hidden" chip in the EmptyState chip row. */
const UNPRICED_CHIP_SUFFIX = "unpriced hidden by price filter";

interface ModelsBrowserProps {
  /** Models pre-fetched on the server. When provided, no client-side fetch is needed.
   *  When omitted (e.g. server fetch failed), the component will fetch on the client instead. */
  initialModels?: AIModel[];
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">Failed to load models</h3>
      <p className="text-sm text-zinc-400 mb-1 max-w-sm">
        Couldn&apos;t reach the gateway API. Check your connection and try again.
      </p>
      <p className="text-xs text-zinc-600 max-w-sm mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({
  hasFilters,
  filterChips,
  onReset,
}: {
  hasFilters: boolean;
  filterChips: string[];
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-500"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">No models found</h3>
      <p className="text-sm text-zinc-400">
        {hasFilters
          ? "No models match the active filters."
          : "No models are available at this time."}
      </p>
      {hasFilters && filterChips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mt-4 max-w-md">
          {filterChips.map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className={
                chip.endsWith(UNPRICED_CHIP_SUFFIX)
                  ? "px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  : "px-2 py-0.5 rounded-full text-xs bg-zinc-800/80 text-zinc-300 border border-zinc-700"
              }
            >
              {chip}
            </span>
          ))}
        </div>
      )}
      {hasFilters && (
        <button
          onClick={onReset}
          className="mt-6 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function readStoredCostAssumptions(): CostAssumptions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COST_ASSUMPTIONS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CostAssumptions>;
    return normalizeCostAssumptions(parsed);
  } catch {
    return null;
  }
}

function writeStoredCostAssumptions(assumptions: CostAssumptions) {
  if (typeof window === "undefined") return;
  if (areCostAssumptionsDefault(assumptions)) {
    window.localStorage.removeItem(COST_ASSUMPTIONS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    COST_ASSUMPTIONS_STORAGE_KEY,
    JSON.stringify(normalizeCostAssumptions(assumptions)),
  );
}

export function ModelsBrowser({ initialModels }: ModelsBrowserProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const hasServerData = initialModels !== undefined;

  const [models, setModels] = useState<AIModel[]>(initialModels ?? []);
  const [loading, setLoading] = useState(!hasServerData);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedProvider, setSelectedProvider] = useState(searchParams.get("provider") || "");
  const [freeOnly, setFreeOnly] = useState(searchParams.get("free") === "true");
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const raw = searchParams.get("sort");
    return (SORT_VALUES as readonly string[]).includes(raw ?? "") ? (raw as SortBy) : "newest";
  });
  const [priceMin, setPriceMin] = useState(searchParams.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("priceMax") || "");
  const [benchMin, setBenchMin] = useState(searchParams.get("benchMin") || "");
  const [benchMaxCost, setBenchMaxCost] = useState(
    searchParams.get("benchMaxCost") || ""
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [costAssumptions, setCostAssumptions] = useState<CostAssumptions>(() =>
    normalizeCostAssumptions({
      outputTokenShare: parseCostAssumptionParam(
        searchParams.get("avgOutputShare"),
        DEFAULT_COST_ASSUMPTIONS.outputTokenShare,
      ),
      inputCacheHitRate: parseCostAssumptionParam(
        searchParams.get("avgCacheHitRate"),
        DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate,
      ),
    }),
  );
  const loadedStoredCostAssumptionsRef = useRef(false);
  const [view, setView] = useState<"grid" | "list">(
    searchParams.get("view") === "list" ? "list" : "grid"
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Shared URLs can carry raw cost-assumption params outside 0–1 (e.g.
  // ?avgOutputShare=999). normalizeCostAssumptions clamps them silently, so
  // the recipient would otherwise see different numbers than the sender
  // without any notice. Detect that divergence and surface a dismissible hint.
  const [assumptionsAdjustedNotice, setAssumptionsAdjustedNotice] = useState(false);

  // True when a raw URL param holds a value outside 0–1 (e.g. 999, -3, or a
  // non-number): parseCostAssumptionParam clamps/falls back silently, so the
  // recipient's normalized assumptions differ from the sender's raw numbers.
  // Params absent from the URL contributed a fallback, not a shared value,
  // so they never count as diverged.
  const rawAssumptionsDiverged = useMemo(() => {
    const diverged = (param: string) => {
      const raw = searchParams.get(param);
      if (raw == null || raw.trim() === "") return false;
      const value = Number(raw);
      if (!Number.isFinite(value)) return true;
      return value < 0 || value > 1;
    };
    return diverged("avgOutputShare") || diverged("avgCacheHitRate");
  }, [searchParams]);

  // Sync the notice to URL changes: show it whenever the incoming URL carries
  // diverged raw params, hide it when they no longer do. Dismissal below only
  // suppresses the current divergence — a newly shared URL re-triggers it.
  useEffect(() => {
    if (rawAssumptionsDiverged) {
      setAssumptionsAdjustedNotice(true);
    } else {
      setAssumptionsAdjustedNotice(false);
    }
  }, [rawAssumptionsDiverged]);

  // Session-only flag: once the user explicitly picks a sort, relevance ordering
  // stands down until page reload. Never a URL param — a shared ?q=... URL
  // reproduces relevance behavior naturally on load.
  const userPickedSortRef = useRef(false);

  const updateUrl = useCallback((next?: {
    search?: string;
    selectedProvider?: string;
    freeOnly?: boolean;
    sortBy?: SortBy;
    priceMin?: string;
    priceMax?: string;
    benchMin?: string;
    benchMaxCost?: string;
    dateFrom?: string;
    dateTo?: string;
    costAssumptions?: CostAssumptions;
    view?: "grid" | "list";
  }) => {
    const nextSearch = next?.search ?? search;
    const nextProvider = next?.selectedProvider ?? selectedProvider;
    const nextFreeOnly = next?.freeOnly ?? freeOnly;
    const nextSortBy = next?.sortBy ?? sortBy;
    const nextPriceMin = next?.priceMin ?? priceMin;
    const nextPriceMax = next?.priceMax ?? priceMax;
    const nextBenchMin = next?.benchMin ?? benchMin;
    const nextBenchMaxCost = next?.benchMaxCost ?? benchMaxCost;
    const nextDateFrom = next?.dateFrom ?? dateFrom;
    const nextDateTo = next?.dateTo ?? dateTo;
    const nextCostAssumptions = normalizeCostAssumptions(
      next?.costAssumptions ?? costAssumptions,
    );
    const nextView = next?.view ?? view;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextProvider) params.set("provider", nextProvider);
    if (nextFreeOnly) params.set("free", "true");
    if (nextSortBy !== "newest") params.set("sort", nextSortBy);
    if (nextPriceMin) params.set("priceMin", nextPriceMin);
    if (nextPriceMax) params.set("priceMax", nextPriceMax);
    if (nextBenchMin) params.set("benchMin", nextBenchMin);
    if (nextBenchMaxCost) params.set("benchMaxCost", nextBenchMaxCost);
    if (nextDateFrom) params.set("dateFrom", nextDateFrom);
    if (nextDateTo) params.set("dateTo", nextDateTo);
    if (!areCostAssumptionsDefault(nextCostAssumptions)) {
      params.set(
        "avgOutputShare",
        serializeCostAssumptionParam(nextCostAssumptions.outputTokenShare),
      );
      params.set(
        "avgCacheHitRate",
        serializeCostAssumptionParam(nextCostAssumptions.inputCacheHitRate),
      );
    }
    if (nextView !== "grid") params.set("view", nextView);

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : "/";
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }, [search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions, view, router, startTransition]);

  // Debounced URL write for the search param: state updates stay instant so
  // typing stays responsive, but router.replace fires at most once per 250ms
  // of typing pause instead of on every keystroke. The timer runs the latest
  // `updateUrl` (via ref) so a debounced fire never replays stale filter
  // state changed in the interim. Timer cleared on unmount.
  const searchUrlTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const updateUrlRef = useRef(updateUrl);
  useEffect(() => {
    updateUrlRef.current = updateUrl;
  });
  useEffect(() => {
    return () => clearTimeout(searchUrlTimerRef.current);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchUrlTimerRef.current);
    searchUrlTimerRef.current = setTimeout(() => {
      searchUrlTimerRef.current = undefined;
      updateUrlRef.current({ search: value });
    }, 250);
  };

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    updateUrl({ selectedProvider: value });
  };

  const handleFreeOnlyChange = (value: boolean) => {
    setFreeOnly(value);
    updateUrl({ freeOnly: value });
  };

  const handleSortByChange = (value: SortBy) => {
    userPickedSortRef.current = true;
    setSortBy(value);
    updateUrl({ sortBy: value });
  };

  const handlePriceMinChange = (value: string) => {
    setPriceMin(value);
    updateUrl({ priceMin: value });
  };

  const handlePriceMaxChange = (value: string) => {
    setPriceMax(value);
    updateUrl({ priceMax: value });
  };

  const handleBenchMinChange = (value: string) => {
    setBenchMin(value);
    updateUrl({ benchMin: value });
  };

  const handleBenchMaxCostChange = (value: string) => {
    setBenchMaxCost(value);
    updateUrl({ benchMaxCost: value });
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    updateUrl({ dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    updateUrl({ dateTo: value });
  };

  const handleCostAssumptionsChange = (value: CostAssumptions) => {
    const normalized = normalizeCostAssumptions(value);
    setCostAssumptions(normalized);
    writeStoredCostAssumptions(normalized);
    updateUrl({ costAssumptions: normalized });
  };

  const handleViewChange = (value: "grid" | "list") => {
    setView(value);
    updateUrl({ view: value });
  };

  const handleReset = () => {
    setSearch("");
    setSelectedProvider("");
    setFreeOnly(false);
    setSortBy("newest");
    setPriceMin("");
    setPriceMax("");
    setBenchMin("");
    setBenchMaxCost("");
    setDateFrom("");
    setDateTo("");
    // Filters-only reset: cost assumptions are reset inside the More-filters
    // panel, and `view` is not a filter — its URL param is preserved.
    const params = new URLSearchParams();
    if (view !== "grid") params.set("view", view);
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `?${queryString}` : "/", { scroll: false });
    });
  };

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(MODELS_API_URL);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data: ModelsResponse = await res.json();
      setModels(data.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while fetching models."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlSearch = searchParams.get("q") || "";
    const urlProvider = searchParams.get("provider") || "";
    const urlFreeOnly = searchParams.get("free") === "true";
    const rawSort = searchParams.get("sort");
    const urlSortBy = (SORT_VALUES as readonly string[]).includes(rawSort ?? "")
      ? (rawSort as SortBy)
      : "newest";
    const urlPriceMin = searchParams.get("priceMin") || "";
    const urlPriceMax = searchParams.get("priceMax") || "";
    const urlBenchMin = searchParams.get("benchMin") || "";
    const urlBenchMaxCost = searchParams.get("benchMaxCost") || "";
    const urlDateFrom = searchParams.get("dateFrom") || "";
    const urlDateTo = searchParams.get("dateTo") || "";
    const urlCostAssumptions = normalizeCostAssumptions({
      outputTokenShare: parseCostAssumptionParam(
        searchParams.get("avgOutputShare"),
        DEFAULT_COST_ASSUMPTIONS.outputTokenShare,
      ),
      inputCacheHitRate: parseCostAssumptionParam(
        searchParams.get("avgCacheHitRate"),
        DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate,
      ),
    });

    setSearch(urlSearch);
    setSelectedProvider(urlProvider);
    setFreeOnly(urlFreeOnly);
    setSortBy(urlSortBy);
    setPriceMin(urlPriceMin);
    setPriceMax(urlPriceMax);
    setBenchMin(urlBenchMin);
    setBenchMaxCost(urlBenchMaxCost);
    setDateFrom(urlDateFrom);
    setDateTo(urlDateTo);
    setCostAssumptions(urlCostAssumptions);
    setView(searchParams.get("view") === "list" ? "list" : "grid");
    // Only re-sync when the URL actually changes (e.g. browser back/forward).
    // Omitting the state variables from deps prevents a feedback loop where
    // setState → re-render → effect re-runs → setState again causes blinking.
  }, [searchParams]);

  useEffect(() => {
    if (loadedStoredCostAssumptionsRef.current) return;
    loadedStoredCostAssumptionsRef.current = true;

    const hasUrlAssumptions =
      searchParams.has("avgOutputShare") || searchParams.has("avgCacheHitRate");
    if (hasUrlAssumptions) return;

    const stored = readStoredCostAssumptions();
    if (stored) {
      setCostAssumptions(stored);
    }
  }, [searchParams]);

  useEffect(() => {
    // Only fetch on the client if we don't already have server-provided data.
    // This covers both the serverFetchFailed case and the no-props (legacy) case.
    if (!hasServerData) {
      fetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providers = useMemo(() => getUniqueProviders(models), [models]);

  const { filteredModels, hiddenUnpricedCount } = useMemo(() => {
    // Shared per-million-token avg price helper, reused by both range filter
    // and price sorting. Reads from the shared utility so the same formula
    // powers ModelCard display, the range filter, and price sorting.
    const getAvgPriceForModel = (model: AIModel) =>
      getAveragePricePerMillion(model, costAssumptions);

    // Parse range bounds once. Empty strings or malformed values become null
    // (treated as "no bound on this side"). Negative price inputs are ignored.
    const parsedPriceMin = priceMin === "" ? NaN : Number(priceMin);
    const parsedPriceMax = priceMax === "" ? NaN : Number(priceMax);
    const minPriceNum =
      Number.isFinite(parsedPriceMin) && parsedPriceMin >= 0 ? parsedPriceMin : null;
    const maxPriceNum =
      Number.isFinite(parsedPriceMax) && parsedPriceMax >= 0 ? parsedPriceMax : null;
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
      Number.isFinite(parsedBenchMaxCost) && parsedBenchMaxCost >= 0
        ? parsedBenchMaxCost
        : null;

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

      const matchesProvider =
        !providerSet || providerSet.includes(getProviderFromId(model.id));

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

      return (
        matchesSearch &&
        matchesProvider &&
        matchesFree &&
        matchesDate &&
        matchesBench
      );
    };

    const filtered = models.filter((model) => {
      // Avg price range — compared in $/1M tokens to match the unit shown on
      // ModelCard and in the filter inputs. Unpriced models (NaN average from
      // -1 sentinels) fail both bounds and are filtered out.
      const avgPerMillion = priceBoundActive ? getAvgPriceForModel(model) : 0;
      const matchesPriceMin = minPriceNum == null || avgPerMillion >= minPriceNum;
      const matchesPriceMax = maxPriceNum == null || avgPerMillion <= maxPriceNum;

      return (
        matchesNonPricePredicates(model) &&
        matchesPriceMin &&
        matchesPriceMax
      );
    });

    // Models whose ONLY failing bound is the price filter: unpriced (no
    // published prices) while a price bound is active and every other
    // predicate passes. Reported to SearchFilter/EmptyState; never counts
    // toward filteredCount.
    const hiddenUnpricedCount = priceBoundActive
      ? models.filter(
          (model) => !hasPublishedPrice(model) && matchesNonPricePredicates(model),
        ).length
      : 0;

    // Relevance ordering: while a query is active and the user hasn't picked a
    // sort this session, relevanceScore wins. Ties break by newest `created`
    // first; placeholders (created === 0) always sink to the end.
    if (search && !userPickedSortRef.current) {
      const query = search;
      return {
        filteredModels: [...filtered].sort((a, b) => {
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
        filteredModels: [...filtered].sort((a, b) => {
          if ((a.created === 0) !== (b.created === 0)) return a.created === 0 ? 1 : -1;
          return b.created - a.created;
        }),
        hiddenUnpricedCount,
      };
    }
    if (sortBy === "price-asc" || sortBy === "price-desc") {
      // Models with unpublished prices (-1 sentinels → NaN average, shown as
      // "Varies") sink to the end regardless of direction.
      return {
        filteredModels: [...filtered].sort((a, b) => {
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
        filteredModels: [...filtered].sort((a, b) => {
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
    return { filteredModels: filtered, hiddenUnpricedCount };
  }, [models, search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions]);

  const costAssumptionsActive = !areCostAssumptionsDefault(costAssumptions);

  const hasFilters =
    !!search ||
    !!selectedProvider ||
    freeOnly ||
    sortBy !== "newest" ||
    !!priceMin ||
    !!priceMax ||
    !!benchMin ||
    !!benchMaxCost ||
    !!dateFrom ||
    !!dateTo ||
    costAssumptionsActive;

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (search) chips.push(`Search: "${search}"`);
    if (selectedProvider) {
      const providerNames = splitProviderParam(selectedProvider)
        .map((provider) => formatProviderName(provider))
        .join(", ");
      chips.push(`Provider: ${providerNames}`);
    }
    if (freeOnly) chips.push("Free only");
    if (sortBy !== "newest") {
      const labels: Record<string, string> = {
        newest: "Newest first",
        default: "Gateway order",
        oldest: "Oldest first",
        "price-asc": "Price: low to high",
        "price-desc": "Price: high to low",
        "bench-asc": "Benchmark: low to high",
        "bench-desc": "Benchmark: high to low",
      };
      chips.push(`Sort: ${labels[sortBy] ?? sortBy}`);
    }
    if (priceMin) chips.push(`Avg ≥ $${priceMin}`);
    if (benchMin) chips.push(`TerminalBench ≥ ${formatPercent(Number(benchMin), 0)}`);
    if (benchMaxCost) chips.push(`Bench cost ≤ $${benchMaxCost}`);
    if (dateFrom) chips.push(`From ${dateFrom}`);
    if (dateTo) chips.push(`To ${dateTo}`);
    if (costAssumptionsActive) chips.push(formatCostAssumptionSummary(costAssumptions));
    if (hiddenUnpricedCount > 0) {
      chips.push(`${hiddenUnpricedCount} ${UNPRICED_CHIP_SUFFIX}`);
    }
    return chips;
  }, [search, selectedProvider, freeOnly, sortBy, priceMin, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions, costAssumptionsActive, hiddenUnpricedCount]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions]);

  const visibleModels = useMemo(
    () => filteredModels.slice(0, visibleCount),
    [filteredModels, visibleCount]
  );

  const hasMore = visibleCount < filteredModels.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Logo mark */}
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-violet-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-zinc-100 leading-none">
                  Kilo Gateway
                </h1>
                <p className="text-xs text-zinc-500 leading-none mt-0.5">
                  AI Model Explorer
                </p>
              </div>
            </div>
            <ViewToggle view={view} onViewChange={handleViewChange} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
            Latest AI Models
          </h2>
          <p className="text-zinc-500 text-sm sm:text-base">
            Newest releases across every provider on the Kilo Gateway — compare price, context, and capability to pick the current best.
          </p>
        </div>

        {/* Search & Filter */}
        {!loading && !error && (
          <SearchFilter
            search={search}
            onSearchChange={handleSearchChange}
            provider={selectedProvider}
            onProviderChange={handleProviderChange}
            providers={providers}
            freeOnly={freeOnly}
            onFreeOnlyChange={handleFreeOnlyChange}
            sortBy={sortBy}
            onSortByChange={handleSortByChange}
            relevanceActive={!userPickedSortRef.current && !!search}
            priceMin={priceMin}
            priceMax={priceMax}
            onPriceMinChange={handlePriceMinChange}
            onPriceMaxChange={handlePriceMaxChange}
            benchMin={benchMin}
            benchMaxCost={benchMaxCost}
            onBenchMinChange={handleBenchMinChange}
            onBenchMaxCostChange={handleBenchMaxCostChange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            hasFilters={hasFilters}
            onReset={handleReset}
            totalCount={models.length}
            filteredCount={filteredModels.length}
            hiddenUnpricedCount={hiddenUnpricedCount}
            costAssumptions={costAssumptions}
            costAssumptionsActive={costAssumptionsActive}
            onCostAssumptionsChange={handleCostAssumptionsChange}
          />
        )}
      {/* Shared-URL cost assumptions that were out of range got clamped — tell the recipient. */}
      {assumptionsAdjustedNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300"
        >
          <span>
            Shared cost assumptions were outside 0–100% and were adjusted.
          </span>
          <button
            type="button"
            onClick={() => setAssumptionsAdjustedNotice(false)}
            className="shrink-0 font-semibold text-amber-400 hover:text-amber-200 transition-colors"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}
      </div>

      {/* Content */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <SkeletonGrid count={12} view={view} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchModels} />
        ) : filteredModels.length === 0 ? (
          <EmptyState hasFilters={hasFilters} filterChips={activeFilterChips} onReset={handleReset} />
        ) : (
          <>
            <div
              className={
                view === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-3"
              }
            >
              {visibleModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  view={view}
                  costAssumptions={costAssumptions}
                />
              ))}
            </div>
            {hasMore && <Pagination visibleCount={visibleModels.length} totalCount={filteredModels.length} onLoadMore={loadMore} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-600">
          Data sourced from{" "}
          <a
            href="https://api.kilo.ai/api/gateway/models"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-500 hover:text-violet-400 transition-colors"
          >
            api.kilo.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
