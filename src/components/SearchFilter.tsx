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
import { FreshnessStamp } from "./FreshnessStamp";

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
  hasFilterCriteria: boolean;
  onResetFilters: () => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
  updatedAt?: number;
  costAssumptions: CostAssumptions;
  costAssumptionsActive: boolean;
  onCostAssumptionsChange: (value: CostAssumptions) => void;
  hiddenUnpricedCount?: number;
  relevanceActive?: boolean;
}

function ProviderCombobox({
  className = "relative sm:w-48",
  provider,
  onProviderChange,
  providers,
}: {
  className?: string;
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
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
      className={className}
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
        className={`w-full flex items-center justify-between gap-2 pl-3 pr-8 py-2.5 max-sm:py-3 border rounded-xl text-sm transition-all duration-200 cursor-pointer focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400 ${
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
            ref={dialogRef}
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
                className="w-full px-3 py-2 max-sm:py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
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
                <li className="px-3 py-2 text-sm text-zinc-400" aria-live="polite">
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
                      className={`flex items-center gap-2 px-3 py-2 max-sm:py-3 rounded-lg text-sm cursor-pointer transition-colors ${
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
                className="px-2 py-1 text-xs max-sm:min-h-[44px] max-sm:text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={close}
                className="px-2 py-1 text-xs max-sm:min-h-[44px] max-sm:text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
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
      className="text-zinc-400"
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
      className="text-zinc-400 pointer-events-none"
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

function SortSelect({
  className,
  value,
  onChange,
  selectId,
}: {
  className: string;
  value: string;
  onChange: (value: SortBy) => void;
  selectId?: string;
}) {
  return (
    <div className={className}>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as SortBy)}
        className="w-full appearance-none pl-3 pr-8 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400 transition-all duration-200 cursor-pointer"
      >
        <option value="relevance" disabled hidden>
          Sorted by relevance
        </option>
        <optgroup label="Recency">
          <option value="default">Provider default order</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </optgroup>
        <optgroup label="Cost">
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </optgroup>
        <optgroup label="Benchmark">
          <option value="bench-asc">Benchmark: low to high</option>
          <option value="bench-desc">Benchmark: high to low</option>
        </optgroup>
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronIcon />
      </div>
    </div>
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
  hasFilterCriteria,
  onResetFilters,
  onReset,
  totalCount,
  filteredCount,
  updatedAt,
  costAssumptions,
  costAssumptionsActive,
  onCostAssumptionsChange,
  hiddenUnpricedCount = 0,
  relevanceActive = false,
}: SearchFilterProps) {
  // Auto-expand on initial mount when any panel-only filter is active so a
  // user landing on a URL like `?priceMax=5` or `?free=true` immediately
  // sees the active control. Initializer-only — we deliberately do NOT
  // re-sync on prop change so the user's manual collapse choice is respected.
  const [expanded, setExpanded] = useState(
    () => !!(freeOnly || priceMin || priceMax || benchMin || benchMaxCost || dateFrom || dateTo || costAssumptionsActive)
  );

  // Mobile filters sheet (below sm): provider, sort, and the panel content
  // live here; the primary row collapses to search + Filters toggle + count.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const dialog = filterDialogRef.current;
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

  // Panel-only filters, shown in the More filters badge.
  const activeRangeCount =
    (freeOnly ? 1 : 0) +
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (benchMin ? 1 : 0) +
    (benchMaxCost ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (costAssumptionsActive ? 1 : 0);

  // Cost assumptions are expert controls — collapsed by default, open on
  // mount when non-default assumptions are already active. Derived during
  // render (no effect): an explicit user toggle wins (`assumptionsOverride`,
  // set by onToggle so a manual close sticks); with no user choice the
  // details follow the auto rule "open while the panel is expanded and the
  // active assumptions are non-default". The override resets on each panel
  // expansion (the <details> remounts with the panel, so non-default
  // assumptions must stay discoverable after collapse + re-expand).
  const [assumptionsOverride, setAssumptionsOverride] = useState<boolean | null>(null);
  const [lastExpanded, setLastExpanded] = useState(expanded);
  if (expanded !== lastExpanded) {
    setLastExpanded(expanded);
    if (expanded) setAssumptionsOverride(null);
  }
  const assumptionsOpen = assumptionsOverride ?? (expanded && costAssumptionsActive);

  // Close the mobile filters sheet on Escape (backdrop and Done handle taps).
  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

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

  // Panel content is rendered twice (desktop inline panel + mobile sheet), so
  // per-instance control ids take a suffix; `""` keeps the desktop DOM
  // identical to previous releases.
  const renderFiltersPanel = (m: string) => (
    <>
      {/* Quick filters */}
      <div className="flex flex-col gap-2 md:w-48 md:flex-none">
        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Quick filters
        </label>
        <button
          onClick={() => onFreeOnlyChange(!freeOnly)}
          aria-pressed={freeOnly}
          className={`flex items-center gap-2 px-3 py-2.5 max-sm:py-3 rounded-xl text-sm font-medium border transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
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
      </div>

      {/* Avg price range */}
      <div className="flex-1 min-w-[260px]">
        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
          Average cost ($/1M tokens)
        </label>
        <p className="mb-2 text-xs text-zinc-300">
          Blended input/output estimate using {formatCostAssumptionSummary(normalizedCostAssumptions)}.
        </p>
*** End
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
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
              className="w-full pl-7 pr-3 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
            />
          </div>
          <span className="text-zinc-400 text-sm select-none">–</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
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
              className="w-full pl-7 pr-3 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
            />
          </div>
        </div>
        {priceRangeInvalid && (
          <p className="mt-1.5 text-xs text-red-400">
            Min price is greater than max — no models will match.
          </p>
        )}
        {freeOnly && (priceMin !== "" || priceMax !== "") && (
          <p className="mt-1.5 text-xs text-zinc-400">
            Free models have no published prices — a price range may exclude them.
          </p>
        )}
      </div>

      {/* Min benchmark result */}
      <div className="flex-1 min-w-[200px]">
        <label
          htmlFor={`bench-min${m}`}
          className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2"
        >
          Min benchmark result{" "}
          <span className="text-zinc-400 font-normal normal-case tracking-normal">
            (0–1)
          </span>
        </label>
        <input
          id={`bench-min${m}`}
          type="number"
          inputMode="decimal"
          min="0"
          max="1"
          step="0.01"
          placeholder="e.g. 0.5"
          value={benchMin}
          onChange={(e) => onBenchMinChange(e.target.value)}
          className="w-full px-3 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
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
          htmlFor={`bench-max-cost${m}`}
          className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2"
        >
          Max benchmark cost{" "}
          <span className="text-zinc-400 font-normal normal-case tracking-normal">
            (USD / attempt)
          </span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
            $
          </span>
          <input
            id={`bench-max-cost${m}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="No max"
            value={benchMaxCost}
            onChange={(e) => onBenchMaxCostChange(e.target.value)}
            className="w-full pl-7 pr-3 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
          />
        </div>
      </div>

      {/* Created date range */}
      <div className="flex-1 min-w-[260px]">
        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
          Created date
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Created from"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="flex-1 min-w-0 px-3 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
          />
          <span className="text-zinc-400 text-sm select-none">–</span>
          <input
            type="date"
            aria-label="Created to"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="flex-1 min-w-0 px-3 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
          />
        </div>
        {dateRangeInvalid && (
          <p className="mt-1.5 text-xs text-red-400">
            Start date is after end date — no models will match.
          </p>
        )}
      </div>

      {/* Cost assumptions — expert controls, progressively disclosed */}
      <details
        open={assumptionsOpen}
        onToggle={(e) => {
          const open = e.currentTarget.open;
          if (open !== assumptionsOpen) setAssumptionsOverride(open);
        }}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40"
      >
        <summary className="flex items-center justify-between gap-3 cursor-pointer select-none list-none px-3 py-2.5 max-sm:py-3 text-sm text-zinc-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-xl">
          <span className="flex items-center gap-2">
            <ChevronDownIcon open={assumptionsOpen} />
            Cost assumptions
          </span>
          <span className="text-xs font-normal text-zinc-400">
            {formatCostAssumptionSummary(normalizedCostAssumptions)}
          </span>
        </summary>
        <div className="px-3 pb-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Avg, price sorting, and avg price filters use these values.
            </p>
            {costAssumptionsActive && (
              <button
                type="button"
                onClick={() => onCostAssumptionsChange(DEFAULT_COST_ASSUMPTIONS)}
                className="shrink-0 text-xs text-zinc-400 hover:text-zinc-300 transition-colors max-sm:min-h-[44px]"
              >
                Reset assumptions
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-zinc-400 mb-1">Output token share (%)</span>
              <input
                id={`avg-output-share${m}`}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.1"
                value={formatCostAssumptionInputValue(normalizedCostAssumptions.outputTokenShare)}
                onChange={(e) => updateOutputShare(e.target.value)}
                className="w-full px-3 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-zinc-400 mb-1">Input cache hit rate (%)</span>
              <input
                id={`avg-cache-hit-rate${m}`}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.1"
                value={formatCostAssumptionInputValue(normalizedCostAssumptions.inputCacheHitRate)}
                onChange={(e) => updateCacheHitRate(e.target.value)}
                className="w-full px-3 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
              />
            </label>
          </div>
        </div>
      </details>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Primary controls row */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search — full-width row on mobile, first slot on desktop */}
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
            className="w-full pl-9 pr-9 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-lg max-sm:min-h-[44px] max-sm:min-w-[44px]"
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {/* Mobile controls row — Filters opens the sheet; Reset mirrors the desktop affordance */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-expanded={filtersOpen}
            aria-controls="filters-sheet"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
              activeRangeCount > 0
                ? "bg-violet-500/10 text-violet-300 border-violet-500/40 hover:border-violet-500/60"
                : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            <SlidersIcon />
            Filters
            {activeRangeCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-violet-500/20 text-violet-200 text-xs font-semibold">
                {activeRangeCount}
              </span>
            )}
          </button>
          {hasFilterCriteria && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <ResetIcon />
              Reset filters
            </button>
          )}
*** End
        </div>

        {/* Count readout — slim status line under the search on mobile */}
        <div
          className="max-sm:py-0.5 max-sm:text-xs flex items-center justify-start sm:px-3 sm:py-2.5 text-sm text-zinc-400 whitespace-nowrap"
        >
          <span
            role="status"
            aria-label={`${filteredCount} of ${totalCount} models shown`}
          >
            <span className="text-zinc-200 font-semibold">{filteredCount}</span>
            <span className="mx-1">/</span>
            <span>{totalCount}</span>
            <span className="ml-1">models</span>
          </span>
          {updatedAt != null && (
            <FreshnessStamp
              updatedAt={updatedAt}
              className="ml-2 text-zinc-400"
            />
          )}
        </div>

        {/* Desktop controls (sm+) — the desktop row, unchanged */}
        <ProviderCombobox
          className="relative hidden sm:block sm:w-48"
          provider={provider}
          onProviderChange={onProviderChange}
          providers={providers}
        />
        <SortSelect
          className="relative hidden sm:block sm:w-44"
          value={relevanceActive ? "relevance" : sortBy}
          onChange={onSortByChange}
        />
        {/* More filters toggle — desktop inline expand */}
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="more-filters-panel"
          className={`hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
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
        {hasFilterCriteria && (
          <button
            onClick={onResetFilters}
            className="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <ResetIcon />
            Reset filters
          </button>
        )}
*** End
      </div>
      {filtersOpen && (
        <>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 sm:hidden cursor-default"
          />
          <div
            ref={filterDialogRef}
            id="filters-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="fixed inset-x-0 bottom-0 z-40 sm:hidden flex flex-col max-h-[80vh] rounded-t-2xl border border-b-0 border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 p-3 border-b border-zinc-800 shrink-0">
              <span className="text-sm font-semibold text-zinc-200">Filters</span>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="flex items-center justify-center min-h-[44px] min-w-[44px] -m-2 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <ClearIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
                  Provider
                </label>
                <ProviderCombobox
                  className="relative w-full"
                  provider={provider}
                  onProviderChange={onProviderChange}
                  providers={providers}
                />
              </div>
              <div>
                <label
                  htmlFor="filters-sheet-sort"
                  className="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2"
                >
                  Sort by
                </label>
                <SortSelect
                  className="relative w-full"
                  value={relevanceActive ? "relevance" : sortBy}
                  onChange={onSortByChange}
                  selectId="filters-sheet-sort"
                />
              </div>

              {/* Panel content — one source of truth: `expanded`. A shared URL
                  with active panel filters auto-expands it on load. */}
              {expanded && (
                <div
                  id="more-filters-panel-m"
                  className="flex flex-col md:flex-row gap-3 flex-wrap p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl"
                >
                  {renderFiltersPanel("-m")}
                </div>
              )}
            </div>
            {/* Sheet footer — Done closes; Reset mirrors the desktop placement */}
            <div className="flex items-center gap-2 p-3 border-t border-zinc-800 shrink-0">
              {hasFilters && (
                <button
                  type="button"
                  onClick={onReset}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <ResetIcon />
                  Reset filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="ml-auto flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden unpriced models — announced to screen readers when it appears */}
      {hiddenUnpricedCount > 0 && (
        <p role="status" className="text-xs text-amber-300">
          {hiddenUnpricedCount} model{hiddenUnpricedCount === 1 ? "" : "s"} without published prices hidden by the price filter.
        </p>
      )}

      {/* Collapsible "More filters" panel — desktop (sm+). Below sm the same
          content renders inside the mobile filters sheet instead. */}
      {expanded && (
        <div
          id="more-filters-panel"
          className="max-sm:hidden flex flex-col md:flex-row gap-3 flex-wrap p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl"
        >
          {renderFiltersPanel("")}
        </div>
      )}
    </div>
  );
}
