"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  CostAssumptions,
  DEFAULT_COST_ASSUMPTIONS,
  formatCostAssumptionInputValue,
  formatCostAssumptionSummary,
  formatProviderName,
  normalizeCostAssumptions,
  SortBy,
  splitProviderParam,
} from "@/lib/utils";

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  provider: string;
  onProviderChange: (value: string) => void;
  providers: string[];
  freeOnly: boolean;
  onFreeOnlyChange: (value: boolean) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  benchMin: string;
  benchMaxCost: string;
  onBenchMinChange: (value: string) => void;
  onBenchMaxCostChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  hasFilters: boolean;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
  costAssumptions: CostAssumptions;
  costAssumptionsActive: boolean;
  onCostAssumptionsChange: (value: CostAssumptions) => void;
  hiddenUnpricedCount?: number;
  relevanceActive?: boolean;
}

function ProviderCombobox({
  provider,
  onProviderChange,
  providers,
}: {
  provider: string;
  onProviderChange: (value: string) => void;
  providers: string[];
}) {
  const selected = useMemo(() => splitProviderParam(provider), [provider]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter(
      (p) =>
        p.toLowerCase().includes(q) ||
        formatProviderName(p).toLowerCase().includes(q),
    );
  }, [providers, query]);

  const commit = (next: string[]) => {
    onProviderChange(next.join(","));
  };

  const toggleProvider = (p: string) => {
    commit(selected.includes(p) ? selected.filter((s) => s !== p) : [...selected, p]);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const triggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((current) => {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        return (current + delta + filtered.length) % filtered.length;
      });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const target = event.target as HTMLElement;
      if (target.closest("button")) return; // footer buttons keep native behavior
      if (filtered.length === 0) return;
      event.preventDefault();
      toggleProvider(filtered[activeIndex]);
    }
  };

  useEffect(() => {
    const node = listRef.current?.children[activeIndex];
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const triggerLabel =
    selected.length === 0
      ? "All Providers"
      : selected.length === 1
        ? formatProviderName(selected[0])
        : `Providers: ${selected.length}`;

  return (
    <div
      ref={rootRef}
      className="relative sm:w-48"
      onKeyDown={onKeyDown}
      data-testid="provider-combobox"
    >
      <button
        type="button"
        ref={triggerRef}
        onClick={() => (open ? setOpen(false) : setOpen(true))}
        onKeyDown={triggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? "provider-listbox" : undefined}
        className={`w-full flex items-center justify-between gap-2 pl-3 pr-8 py-2.5 border rounded-xl text-sm transition-all duration-200 cursor-pointer focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400 ${
          selected.length > 0
            ? "bg-zinc-900 text-violet-200 border-violet-500/40"
            : "bg-zinc-900 text-zinc-200 border-zinc-700"
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDownIcon open={open} />
        </span>
      </button>

      {open && (
        <>
          {/* Mobile backdrop — tap to close */}
          <button
            type="button"
            aria-label="Close provider filter"
            onClick={close}
            className="fixed inset-0 z-30 bg-black/60 sm:hidden cursor-default"
          />
          {/* Popover (sm+) / bottom sheet (below sm) */}
          <div
            className="z-40 sm:absolute sm:left-0 sm:right-0 sm:top-full sm:bottom-auto sm:mt-2 fixed inset-x-0 bottom-0 sm:rounded-xl border border-zinc-700 bg-zinc-900 sm:shadow-xl shadow-2xl overflow-hidden flex flex-col max-sm:rounded-t-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <input
                autoFocus
                type="text"
                role="combobox"
                aria-expanded
                aria-controls="provider-listbox"
                aria-label="Filter providers"
                aria-activedescendant={
                  filtered.length > 0 ? `provider-option-${filtered[activeIndex]}` : undefined
                }
                placeholder="Filter providers..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
              />
            </div>

            <ul
              id="provider-listbox"
              ref={listRef}
              role="listbox"
              aria-multiselectable
              aria-label="Providers"
              className="overflow-y-auto p-1 max-h-64 max-sm:max-h-[50vh]"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500" aria-live="polite">
                  No providers match &lsquo;{query.trim()}&rsquo;
                </li>
              ) : (
                filtered.map((p, index) => {
                  const isSelected = selected.includes(p);
                  return (
                    <li
                      key={p}
                      id={`provider-option-${p}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggleProvider(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                        index === activeIndex
                          ? "bg-zinc-800 text-zinc-200"
                          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-violet-500 border-violet-500 text-white"
                            : "border-zinc-600"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                      {formatProviderName(p)}
                    </li>
                  );
                })
              )}
            </ul>

            <div className="flex items-center justify-between gap-2 p-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => commit([])}
                className="px-2 py-1 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={close}
                className="px-2 py-1 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
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
  benchMin,
  benchMaxCost,
  onBenchMinChange,
  onBenchMaxCostChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  hasFilters,
  onReset,
  totalCount,
  filteredCount,
  costAssumptions,
  costAssumptionsActive,
  onCostAssumptionsChange,
  hiddenUnpricedCount = 0,
  relevanceActive = false,
}: SearchFilterProps) {
  // Auto-expand on initial mount when any range field is non-empty so a user
  // landing on a URL like `?priceMax=5` immediately sees the active values.
  // Initializer-only — we deliberately do NOT re-sync on prop change so the
  // user's manual collapse choice is respected.
  const [expanded, setExpanded] = useState(
    () => !!(priceMin || priceMax || benchMin || benchMaxCost || dateFrom || dateTo || costAssumptionsActive)
  );

  const activeRangeCount =
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (benchMin ? 1 : 0) +
    (benchMaxCost ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (costAssumptionsActive ? 1 : 0);

  const normalizedCostAssumptions = normalizeCostAssumptions(costAssumptions);

  const updateOutputShare = (rawPercent: string) => {
    const pct = Number(rawPercent);
    if (!Number.isFinite(pct)) return;
    onCostAssumptionsChange({
      ...normalizedCostAssumptions,
      outputTokenShare: Math.min(1, Math.max(0, pct / 100)),
    });
  };

  const updateCacheHitRate = (rawPercent: string) => {
    const pct = Number(rawPercent);
    if (!Number.isFinite(pct)) return;
    onCostAssumptionsChange({
      ...normalizedCostAssumptions,
      inputCacheHitRate: Math.min(1, Math.max(0, pct / 100)),
    });
  };

  // Validation flags — both bounds must be present and parse to valid values
  // for a comparison to make sense; otherwise show no warning.
  const priceMinNum = priceMin === "" ? NaN : Number(priceMin);
  const priceMaxNum = priceMax === "" ? NaN : Number(priceMax);
  const priceRangeInvalid =
    Number.isFinite(priceMinNum) &&
    Number.isFinite(priceMaxNum) &&
    priceMinNum > priceMaxNum;

  const benchMinNum = benchMin === "" ? NaN : Number(benchMin);
  const benchRangeInvalid =
    Number.isFinite(benchMinNum) && (benchMinNum < 0 || benchMinNum > 1);

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
            aria-label="Search models"
            placeholder="Search models by name or ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {/* Provider filter — searchable multi-select combobox */}
        <ProviderCombobox
          provider={provider}
          onProviderChange={onProviderChange}
          providers={providers}
        />
        <div className="relative sm:w-44">
          <select
            value={relevanceActive ? "relevance" : sortBy}
            onChange={(e) =>
              onSortByChange(e.target.value as SortBy)
            }
            className="w-full appearance-none pl-3 pr-8 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400 transition-all duration-200 cursor-pointer"
          >
            <option value="relevance" disabled hidden>
              Sorted by relevance
            </option>
            <option value="default">Gateway order</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="bench-asc">Benchmark: Low to High</option>
            <option value="bench-desc">Benchmark: High to Low</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronIcon />
          </div>
        </div>

        {/* Free only toggle */}
        <button
          onClick={() => onFreeOnlyChange(!freeOnly)}
          aria-pressed={freeOnly}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
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
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
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
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <ResetIcon />
            Reset
          </button>
        )}

        <div
          className="flex items-center justify-center sm:justify-start px-3 py-2.5 text-sm text-zinc-400 whitespace-nowrap"
          role="status"
          aria-label={`${filteredCount} of ${totalCount} models shown`}
        >
          <span className="text-zinc-200 font-semibold">{filteredCount}</span>
          <span className="mx-1">/</span>
          <span>{totalCount}</span>
          <span className="ml-1 hidden sm:inline">models</span>
        </div>
      </div>

      {/* Hidden unpriced models — announced to screen readers when it appears */}
      {hiddenUnpricedCount > 0 && (
        <p role="status" className="text-xs text-amber-300">
          {hiddenUnpricedCount} model{hiddenUnpricedCount === 1 ? "" : "s"} without published prices hidden by the price filter.
        </p>
      )}

      {/* Collapsible "More filters" panel */}
      {expanded && (
        <div
          id="more-filters-panel"
          className="flex flex-col md:flex-row gap-3 flex-wrap p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl"
        >
          {/* Cost assumptions */}
          <div className="flex-1 min-w-[280px] rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Cost assumptions
                </h3>
                <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                  Avg, price sorting, and avg price filters use these values.
                </p>
              </div>
              {costAssumptionsActive && (
                <button
                  type="button"
                  onClick={() => onCostAssumptionsChange(DEFAULT_COST_ASSUMPTIONS)}
                  className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs text-zinc-500 mb-1">Output token share (%)</span>
                <input
                  id="avg-output-share"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formatCostAssumptionInputValue(normalizedCostAssumptions.outputTokenShare)}
                  onChange={(e) => updateOutputShare(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-zinc-500 mb-1">Input cache hit rate (%)</span>
                <input
                  id="avg-cache-hit-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formatCostAssumptionInputValue(normalizedCostAssumptions.inputCacheHitRate)}
                  onChange={(e) => updateCacheHitRate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
                />
              </label>
            </div>

            <p className="mt-2 text-[11px] text-zinc-600">
              Current: {formatCostAssumptionSummary(normalizedCostAssumptions)}
            </p>
          </div>

          {/* Avg price range */}
          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Avg price{" "}
              <span className="text-zinc-600 font-normal normal-case tracking-normal">
                ($/1M tokens)
              </span>
            </label>
            <p className="mb-2 text-xs text-zinc-600">
              Uses the cost assumptions above.
            </p>
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
            {freeOnly && (priceMin !== "" || priceMax !== "") && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Free models have no published prices — a price range may exclude them.
              </p>
            )}
          </div>

          {/* Min benchmark result */}
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="bench-min"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2"
            >
              Min benchmark result{" "}
              <span className="text-zinc-600 font-normal normal-case tracking-normal">
                (0–1)
              </span>
            </label>
            <input
              id="bench-min"
              type="number"
              inputMode="decimal"
              min="0"
              max="1"
              step="0.01"
              placeholder="e.g. 0.5"
              value={benchMin}
              onChange={(e) => onBenchMinChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
            />
            {benchRangeInvalid && (
              <p className="mt-1.5 text-xs text-red-400">
                Benchmark result must be between 0 and 1.
              </p>
            )}
          </div>

          {/* Max benchmark cost */}
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="bench-max-cost"
              className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2"
            >
              Max benchmark cost{" "}
              <span className="text-zinc-600 font-normal normal-case tracking-normal">
                (USD / attempt)
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
                $
              </span>
              <input
                id="bench-max-cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="No max"
                value={benchMaxCost}
                onChange={(e) => onBenchMaxCostChange(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
              />
            </div>
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
