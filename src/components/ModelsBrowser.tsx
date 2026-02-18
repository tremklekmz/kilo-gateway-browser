"use client";

import { useState, useEffect, useMemo } from "react";
import { AIModel, ModelsResponse } from "@/lib/types";
import { getProviderFromId, getUniqueProviders, isFreeModel } from "@/lib/utils";
import { ModelCard } from "./ModelCard";
import { SearchFilter } from "./SearchFilter";
import { ViewToggle } from "./ViewToggle";
import { SkeletonGrid } from "./SkeletonCard";

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

export function ModelsBrowser() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.kilo.ai/api/gateway/models");
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
    fetchModels();
  }, []);

  const providers = useMemo(() => getUniqueProviders(models), [models]);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
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
  }, [models, search, selectedProvider, freeOnly]);

  const hasFilters = !!search || !!selectedProvider || freeOnly;

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
            onSearchChange={setSearch}
            provider={selectedProvider}
            onProviderChange={setSelectedProvider}
            providers={providers}
            freeOnly={freeOnly}
            onFreeOnlyChange={setFreeOnly}
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
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {filteredModels.map((model) => (
              <ModelCard key={model.id} model={model} view={view} />
            ))}
          </div>
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
