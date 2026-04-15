"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AIModel, ModelsResponse } from "@/lib/types";
import { getProviderFromId, getUniqueProviders, isFreeModel } from "@/lib/utils";
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

  const hasServerData = initialModels !== undefined;

  const [models, setModels] = useState<AIModel[]>(initialModels ?? []);
  const [loading, setLoading] = useState(!hasServerData);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedProvider, setSelectedProvider] = useState(searchParams.get("provider") || "");
  const [freeOnly, setFreeOnly] = useState(searchParams.get("free") === "true");
  const [sortBy, setSortBy] = useState<"default" | "newest" | "oldest">(
    (searchParams.get("sort") as "default" | "newest" | "oldest") || "default"
  );
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const updateUrl = useCallback((next?: {
    search?: string;
    selectedProvider?: string;
    freeOnly?: boolean;
    sortBy?: "default" | "newest" | "oldest";
  }) => {
    const nextSearch = next?.search ?? search;
    const nextProvider = next?.selectedProvider ?? selectedProvider;
    const nextFreeOnly = next?.freeOnly ?? freeOnly;
    const nextSortBy = next?.sortBy ?? sortBy;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextProvider) params.set("provider", nextProvider);
    if (nextFreeOnly) params.set("free", "true");
    if (nextSortBy !== "default") params.set("sort", nextSortBy);

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : "/";
    router.replace(newUrl, { scroll: false });
  }, [search, selectedProvider, freeOnly, sortBy, router]);

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

  const handleSortByChange = (value: "default" | "newest" | "oldest") => {
    setSortBy(value);
    updateUrl({ sortBy: value });
  };

  const handleReset = () => {
    setSearch("");
    setSelectedProvider("");
    setFreeOnly(false);
    setSortBy("default");
    router.replace("/", { scroll: false });
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
      rawSort === "newest" || rawSort === "oldest" || rawSort === "default"
        ? rawSort
        : "default";

    if (search !== urlSearch) setSearch(urlSearch);
    if (selectedProvider !== urlProvider) setSelectedProvider(urlProvider);
    if (freeOnly !== urlFreeOnly) setFreeOnly(urlFreeOnly);
    if (sortBy !== urlSortBy) setSortBy(urlSortBy);
  }, [searchParams, search, selectedProvider, freeOnly, sortBy]);

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

      return matchesSearch && matchesProvider && matchesFree;
    });

    if (sortBy === "newest") {
      return [...filtered].sort((a, b) => b.created - a.created);
    }
    if (sortBy === "oldest") {
      return [...filtered].sort((a, b) => a.created - b.created);
    }
    return filtered;
  }, [models, search, selectedProvider, freeOnly, sortBy]);

  const hasFilters = !!search || !!selectedProvider || freeOnly || sortBy !== "default";

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedProvider, freeOnly, sortBy]);

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
