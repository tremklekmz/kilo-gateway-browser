"use client";

import { useState } from "react";
import { formatProviderName } from "@/lib/utils";

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  provider: string;
  onProviderChange: (value: string) => void;
  providers: string[];
  freeOnly: boolean;
  onFreeOnlyChange: (value: boolean) => void;
  sortBy: "default" | "newest" | "oldest" | "price-asc" | "price-desc";
  onSortByChange: (value: "default" | "newest" | "oldest" | "price-asc" | "price-desc") => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  hasFilters: boolean;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-500"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-500 pointer-events-none"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SearchFilter({
  search,
  onSearchChange,
  provider,
  onProviderChange,
  providers,
  freeOnly,
  onFreeOnlyChange,
  sortBy,
  onSortByChange,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  hasFilters,
  onReset,
  totalCount,
  filteredCount,
}: SearchFilterProps) {
  // Auto-expand on initial mount when any range field is non-empty so a user
  // landing on a URL like `?priceMax=5` immediately sees the active values.
  // Initializer-only — we deliberately do NOT re-sync on prop change so the
  // user's manual collapse choice is respected.
  const [expanded, setExpanded] = useState(
    () => !!(priceMin || priceMax || dateFrom || dateTo)
  );

  const activeRangeCount =
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  // Validation flags — both bounds must be present and parse to valid values
  // for a comparison to make sense; otherwise show no warning.
  const priceMinNum = priceMin === "" ? NaN : Number(priceMin);
  const priceMaxNum = priceMax === "" ? NaN : Number(priceMax);
  const priceRangeInvalid =
    Number.isFinite(priceMinNum) &&
    Number.isFinite(priceMaxNum) &&
    priceMinNum > priceMaxNum;

  const dateFromMs = dateFrom === "" ? NaN : Date.parse(dateFrom);
  const dateToMs = dateTo === "" ? NaN : Date.parse(dateTo);
  const dateRangeInvalid =
    Number.isFinite(dateFromMs) &&
    Number.isFinite(dateToMs) &&
    dateFromMs > dateToMs;

  return (
    <div className="flex flex-col gap-3">
      {/* Primary controls row */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search models by name or ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {/* Provider filter */}
        <div className="relative sm:w-48">
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200 cursor-pointer"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {formatProviderName(p)}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronIcon />
          </div>
        </div>

        {/* Sort by */}
        <div className="relative sm:w-44">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as "default" | "newest" | "oldest" | "price-asc" | "price-desc")}
            className="w-full appearance-none pl-3 pr-8 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200 cursor-pointer"
          >
            <option value="default">Default order</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronIcon />
          </div>
        </div>

        {/* Free only toggle */}
        <button
          onClick={() => onFreeOnlyChange(!freeOnly)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 whitespace-nowrap ${
            freeOnly
              ? "bg-neon-green/10 text-neon-green border-neon-green/30"
              : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
          }`}
        >
          <span
            className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
              freeOnly ? "border-neon-green bg-neon-green/20" : "border-zinc-600"
            }`}
          >
            {freeOnly && (
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green block" />
            )}
          </span>
          Free only
        </button>

        {/* More filters toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="more-filters-panel"
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 whitespace-nowrap ${
            activeRangeCount > 0
              ? "bg-violet-500/10 text-violet-300 border-violet-500/40 hover:border-violet-500/60"
              : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
          }`}
        >
          <SlidersIcon />
          {expanded ? "Hide filters" : "More filters"}
          {activeRangeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-violet-500/20 text-violet-200 text-xs font-semibold">
              {activeRangeCount}
            </span>
          )}
          <ChevronDownIcon open={expanded} />
        </button>

        {/* Reset button */}
        {hasFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 whitespace-nowrap"
          >
            <ResetIcon />
            Reset
          </button>
        )}

        {/* Count */}
        <div className="flex items-center justify-center sm:justify-start px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-500 whitespace-nowrap">
          <span className="text-zinc-300 font-semibold">{filteredCount}</span>
          <span className="mx-1">/</span>
          <span>{totalCount}</span>
          <span className="ml-1 hidden sm:inline">models</span>
        </div>
      </div>

      {/* Collapsible "More filters" panel */}
      {expanded && (
        <div
          id="more-filters-panel"
          className="flex flex-col md:flex-row gap-3 flex-wrap p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl"
        >
          {/* Avg price range */}
          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Avg price{" "}
              <span className="text-zinc-600 font-normal normal-case tracking-normal">
                ($/1M tokens)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => onPriceMinChange(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
                />
              </div>
              <span className="text-zinc-600 text-sm select-none">–</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => onPriceMaxChange(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
                />
              </div>
            </div>
            {priceRangeInvalid && (
              <p className="mt-1.5 text-xs text-red-400">
                Min price is greater than max — no models will match.
              </p>
            )}
          </div>

          {/* Created date range */}
          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Created date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Created from"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="flex-1 min-w-0 px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
              />
              <span className="text-zinc-600 text-sm select-none">–</span>
              <input
                type="date"
                aria-label="Created to"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="flex-1 min-w-0 px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
              />
            </div>
            {dateRangeInvalid && (
              <p className="mt-1.5 text-xs text-red-400">
                Start date is after end date — no models will match.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
