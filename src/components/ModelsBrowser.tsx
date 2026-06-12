"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AIModel, ModelsResponse } from "@/lib/types";
import { getProviderFromId, getUniqueProviders, isFreeModel, calculateAveragePrice } from "@/lib/utils";
import { ModelCard } from "./ModelCard";
import { SearchFilter } from "./SearchFilter";
import { ViewToggle } from "./ViewToggle";
import { SkeletonGrid } from "./SkeletonCard";
import { Pagination } from "./Pagination";
import { MODELS_API_URL } from "@/lib/constants";

const PAGE_SIZE = 40;

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
      <p className="text-sm text-zinc-500 mb-6 max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
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
      <h3 className="text-lg font-semibold text-zinc-300 mb-2">No models found</h3>
      <p className="text-sm text-zinc-500">
        {hasFilters
          ? "Try adjusting your search or filter criteria."
          : "No models are available at this time."}
      </p>
    </div>
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
  const [sortBy, setSortBy] = useState<
    | "default"
    | "newest"
    | "oldest"
    | "price-asc"
    | "price-desc"
    | "bench-asc"
    | "bench-desc"
  >(
    (searchParams.get("sort") as
      | "default"
      | "newest"
      | "oldest"
      | "price-asc"
      | "price-desc"
      | "bench-asc"
      | "bench-desc") || "default"
  );
  const [priceMin, setPriceMin] = useState(searchParams.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("priceMax") || "");
  const [benchMin, setBenchMin] = useState(searchParams.get("benchMin") || "");
  const [benchMax, setBenchMax] = useState(searchParams.get("benchMax") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const updateUrl = useCallback((next?: {
    search?: string;
    selectedProvider?: string;
    freeOnly?: boolean;
    sortBy?:
      | "default"
      | "newest"
      | "oldest"
      | "price-asc"
      | "price-desc"
      | "bench-asc"
      | "bench-desc";
    priceMin?: string;
    priceMax?: string;
    benchMin?: string;
    benchMax?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const nextSearch = next?.search ?? search;
    const nextProvider = next?.selectedProvider ?? selectedProvider;
    const nextFreeOnly = next?.freeOnly ?? freeOnly;
    const nextSortBy = next?.sortBy ?? sortBy;
    const nextPriceMin = next?.priceMin ?? priceMin;
    const nextPriceMax = next?.priceMax ?? priceMax;
    const nextBenchMin = next?.benchMin ?? benchMin;
    const nextBenchMax = next?.benchMax ?? benchMax;
    const nextDateFrom = next?.dateFrom ?? dateFrom;
    const nextDateTo = next?.dateTo ?? dateTo;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextProvider) params.set("provider", nextProvider);
    if (nextFreeOnly) params.set("free", "true");
    if (nextSortBy !== "default") params.set("sort", nextSortBy);
    if (nextPriceMin) params.set("priceMin", nextPriceMin);
    if (nextPriceMax) params.set("priceMax", nextPriceMax);
    if (nextBenchMin) params.set("benchMin", nextBenchMin);
    if (nextBenchMax) params.set("benchMax", nextBenchMax);
    if (nextDateFrom) params.set("dateFrom", nextDateFrom);
    if (nextDateTo) params.set("dateTo", nextDateTo);

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : "/";
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }, [search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMax, dateFrom, dateTo, router, startTransition]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateUrl({ search: value });
  };

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    updateUrl({ selectedProvider: value });
  };

  const handleFreeOnlyChange = (value: boolean) => {
    setFreeOnly(value);
    updateUrl({ freeOnly: value });
  };

  const handleSortByChange = (value:
    | "default"
    | "newest"
    | "oldest"
    | "price-asc"
    | "price-desc"
    | "bench-asc"
    | "bench-desc") => {
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

  const handleBenchMaxChange = (value: string) => {
    setBenchMax(value);
    updateUrl({ benchMax: value });
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    updateUrl({ dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    updateUrl({ dateTo: value });
  };

  const handleReset = () => {
    setSearch("");
    setSelectedProvider("");
    setFreeOnly(false);
    setSortBy("default");
    setPriceMin("");
    setPriceMax("");
    setBenchMin("");
    setBenchMax("");
    setDateFrom("");
    setDateTo("");
    startTransition(() => {
      router.replace("/", { scroll: false });
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
    const urlSortBy =
      rawSort === "newest" ||
      rawSort === "oldest" ||
      rawSort === "default" ||
      rawSort === "price-asc" ||
      rawSort === "price-desc" ||
      rawSort === "bench-asc" ||
      rawSort === "bench-desc"
        ? rawSort
        : "default";
    const urlPriceMin = searchParams.get("priceMin") || "";
    const urlPriceMax = searchParams.get("priceMax") || "";
    const urlBenchMin = searchParams.get("benchMin") || "";
    const urlBenchMax = searchParams.get("benchMax") || "";
    const urlDateFrom = searchParams.get("dateFrom") || "";
    const urlDateTo = searchParams.get("dateTo") || "";

    setSearch(urlSearch);
    setSelectedProvider(urlProvider);
    setFreeOnly(urlFreeOnly);
    setSortBy(urlSortBy);
    setPriceMin(urlPriceMin);
    setPriceMax(urlPriceMax);
    setBenchMin(urlBenchMin);
    setBenchMax(urlBenchMax);
    setDateFrom(urlDateFrom);
    setDateTo(urlDateTo);
    // Only re-sync when the URL actually changes (e.g. browser back/forward).
    // Omitting the state variables from deps prevents a feedback loop where
    // setState → re-render → effect re-runs → setState again causes blinking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const filteredModels = useMemo(() => {
    // Shared per-million-token avg price helper, reused by both range filter and
    // price sorting. calculateAveragePrice returns a per-token weighted avg, so
    // we multiply by 1,000,000 to match the $/1M-tokens unit shown on ModelCard.
    const getAvgPricePerMillion = (model: AIModel) =>
      calculateAveragePrice({
        input: parseFloat(model.pricing.prompt),
        output: parseFloat(model.pricing.completion),
        cacheRead:
          model.pricing.input_cache_read != null
            ? parseFloat(model.pricing.input_cache_read)
            : null,
      }) * 1_000_000;

    // Parse range bounds once. Empty strings or malformed values become null
    // (treated as "no bound on this side"). Negative price inputs are ignored.
    const parsedPriceMin = priceMin === "" ? NaN : Number(priceMin);
    const parsedPriceMax = priceMax === "" ? NaN : Number(priceMax);
    const minPriceNum =
      Number.isFinite(parsedPriceMin) && parsedPriceMin >= 0 ? parsedPriceMin : null;
    const maxPriceNum =
      Number.isFinite(parsedPriceMax) && parsedPriceMax >= 0 ? parsedPriceMax : null;

    const parsedFromMs = dateFrom === "" ? NaN : Date.parse(dateFrom);
    const parsedToMs = dateTo === "" ? NaN : Date.parse(dateTo);
    // Convert to Unix seconds (matching AIModel.created). Shift `to` to end of
    // day so e.g. dateTo=2024-01-15 is inclusive of any time on that calendar
    // day (UTC-based to keep behaviour predictable across timezones).
    const fromTs = Number.isFinite(parsedFromMs) ? parsedFromMs / 1000 : null;
    const toTs = Number.isFinite(parsedToMs) ? (parsedToMs + 86_399_999) / 1000 : null;
    const dateActive = fromTs != null || toTs != null;

    // TerminalBench filters. When either bound is active, models without any
    // benchmark data are excluded (per product spec). The max-cost filter
    // also keeps models that don't have a cost value set.
    const parsedBenchMin = benchMin === "" ? NaN : Number(benchMin);
    const parsedBenchMax = benchMax === "" ? NaN : Number(benchMax);
    const benchMinNum =
      Number.isFinite(parsedBenchMin) && parsedBenchMin >= 0 ? parsedBenchMin : null;
    const benchMaxNum =
      Number.isFinite(parsedBenchMax) && parsedBenchMax >= 0 ? parsedBenchMax : null;
    const benchActive = benchMinNum != null || benchMaxNum != null;

    const filtered = models.filter((model) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        model.name.toLowerCase().includes(searchLower) ||
        model.id.toLowerCase().includes(searchLower) ||
        (model.description?.toLowerCase().includes(searchLower) ?? false);

      const matchesProvider =
        !selectedProvider ||
        getProviderFromId(model.id) === selectedProvider;

      const matchesFree = !freeOnly || isFreeModel(model);

      // Avg price range — compared in $/1M tokens to match the unit shown on
      // ModelCard and in the filter inputs.
      const avgPerMillion =
        minPriceNum != null || maxPriceNum != null
          ? getAvgPricePerMillion(model)
          : 0;
      const matchesPriceMin = minPriceNum == null || avgPerMillion >= minPriceNum;
      const matchesPriceMax = maxPriceNum == null || avgPerMillion <= maxPriceNum;

      // Date range — model.created is a Unix timestamp (seconds). Models with
      // `created === 0` are meta/router placeholders with no real date and are
      // excluded whenever any date bound is active.
      const matchesDate =
        !dateActive ||
        (model.created !== 0 &&
          (fromTs == null || model.created >= fromTs) &&
          (toTs == null || model.created <= toTs));

      // TerminalBench filters. Models missing benchmark data are dropped when
      // any benchmark bound is active. For the cost bound we additionally keep
      // models that have a benchmark score but no cost recorded (cost=null).
      const bench = model.terminalBench;
      const matchesBench =
        !benchActive ||
        (bench != null &&
          (benchMinNum == null || bench.overallScore >= benchMinNum) &&
          (benchMaxNum == null || bench.avgAttemptCostUsd <= benchMaxNum));

      return (
        matchesSearch &&
        matchesProvider &&
        matchesFree &&
        matchesPriceMin &&
        matchesPriceMax &&
        matchesDate &&
        matchesBench
      );
    });

    if (sortBy === "newest") {
      return [...filtered].sort((a, b) => b.created - a.created);
    }
    if (sortBy === "oldest") {
      return [...filtered].sort((a, b) => a.created - b.created);
    }
    if (sortBy === "price-asc" || sortBy === "price-desc") {
      return [...filtered].sort((a, b) =>
        sortBy === "price-asc"
          ? getAvgPricePerMillion(a) - getAvgPricePerMillion(b)
          : getAvgPricePerMillion(b) - getAvgPricePerMillion(a)
      );
    }
    if (sortBy === "bench-asc" || sortBy === "bench-desc") {
      return [...filtered].sort((a, b) => {
        const aScore = a.terminalBench?.overallScore ?? 0;
        const bScore = b.terminalBench?.overallScore ?? 0;
        return sortBy === "bench-asc" ? aScore - bScore : bScore - aScore;
      });
    }
    return filtered;
  }, [models, search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMax, dateFrom, dateTo]);

  const hasFilters =
    !!search ||
    !!selectedProvider ||
    freeOnly ||
    sortBy !== "default" ||
    !!priceMin ||
    !!priceMax ||
    !!benchMin ||
    !!benchMax ||
    !!dateFrom ||
    !!dateTo;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMax, dateFrom, dateTo]);

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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
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
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
            Browse AI Models
          </h2>
          <p className="text-zinc-500 text-sm sm:text-base">
            Explore and discover AI models available through the Kilo Gateway.
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
            priceMin={priceMin}
            priceMax={priceMax}
            onPriceMinChange={handlePriceMinChange}
            onPriceMaxChange={handlePriceMaxChange}
            benchMin={benchMin}
            benchMax={benchMax}
            onBenchMinChange={handleBenchMinChange}
            onBenchMaxChange={handleBenchMaxChange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            hasFilters={hasFilters}
            onReset={handleReset}
            totalCount={models.length}
            filteredCount={filteredModels.length}
          />
        )}
      </div>

      {/* Content */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <SkeletonGrid count={12} view={view} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchModels} />
        ) : filteredModels.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
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
                <ModelCard key={model.id} model={model} view={view} />
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
