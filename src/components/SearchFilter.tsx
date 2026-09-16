import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
} from "solid-js";
import type { JSX } from "@solidjs/web";
import type { AppState } from "@/lib/appState";
import {
  DEFAULT_COST_ASSUMPTIONS,
  formatCostAssumptionInputValue,
  formatCostAssumptionSummary,
  formatProviderName,
  normalizeCostAssumptions,
  type SortBy,
  splitProviderParam,
} from "@/lib/utils";
import { FreshnessStamp } from "./FreshnessStamp";

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

function ProviderCombobox(props: {
  class?: string;
  provider: string;
  onProviderChange: (value: string) => void;
  providers: string[];
}) {
  const selected = createMemo(() => splitProviderParam(props.provider));
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [activeIndex, setActiveIndex] = createSignal(0);
  let triggerRef: HTMLButtonElement | undefined;
  let listRef: HTMLUListElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  let dialogRef: HTMLDivElement | undefined;

  // Focus trap inside the aria-modal popover (mobile bottom sheet + desktop
  // popover share the dialog). Compute phase tracks `open()`; the untracked
  // effect phase owns the listener and returns its cleanup.
  createEffect(
    () => open(),
    (isOpen) => {
      const dialog = dialogRef;
      if (!isOpen || !dialog) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      dialog.addEventListener("keydown", onKeyDown);
      return () => dialog.removeEventListener("keydown", onKeyDown);
    },
  );

  createEffect(
    () => open(),
    (isOpen) => {
      if (!isOpen) return;
      const onPointerDown = (event: PointerEvent) => {
        if (rootRef && !rootRef.contains(event.target as Node)) {
          setOpen(false);
          triggerRef?.focus();
        }
      };
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    },
  );

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return props.providers;
    return props.providers.filter(
      (p) => p.toLowerCase().includes(q) || formatProviderName(p).toLowerCase().includes(q),
    );
  });

  const commit = (next: string[]) => props.onProviderChange(next.join(","));

  const toggleProvider = (p: string) =>
    commit(
      selected().includes(p) ? selected().filter((s) => s !== p) : [...selected(), p],
    );

  const close = () => {
    setOpen(false);
    triggerRef?.focus();
  };

  const triggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered().length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + delta + filtered().length) % filtered().length);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const target = event.target as HTMLElement;
      if (target.closest("button")) return; // footer buttons keep native behavior
      if (filtered().length === 0) return;
      event.preventDefault();
      toggleProvider(filtered()[activeIndex()]);
    }
  };

  createEffect(
    () => activeIndex(),
    (index) => {
      listRef?.children[index]?.scrollIntoView({ block: "nearest" });
    },
  );

  const triggerLabel = createMemo(() => {
    if (selected().length === 0) return "All Providers";
    if (selected().length === 1) return formatProviderName(selected()[0]);
    return `Providers: ${selected().length}`;
  });

  return (
    <div ref={rootRef} class={props.class} onKeyDown={onKeyDown} data-testid="provider-combobox">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={triggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open() ? "true" : "false"}
        aria-controls={open() ? "provider-listbox" : undefined}
        class={`relative w-full flex items-center justify-between gap-2 pl-3 pr-8 py-2.5 max-sm:py-3 border rounded-xl text-body transition-all duration-200 cursor-pointer focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400 ${
          selected().length > 0
            ? "bg-zinc-900 text-violet-200 border-violet-500/40"
            : "bg-zinc-900 text-zinc-200 border-zinc-700"
        }`}
      >
        <span class="truncate">{triggerLabel()}</span>
        <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDownIcon open={open()} />
        </span>
      </button>

      <Show when={open()}>
        {/* Mobile backdrop — tap to close */}
        <button
          type="button"
          aria-label="Close provider filter"
          onClick={close}
          class="fixed inset-0 z-30 bg-black/60 sm:hidden cursor-default"
        />
        {/* Popover (sm+) / bottom sheet (below sm) */}
        <div
          ref={dialogRef}
          class="z-40 sm:absolute sm:left-0 sm:right-0 sm:top-full sm:bottom-auto sm:mt-2 fixed inset-x-0 bottom-0 sm:rounded-xl border border-zinc-700 bg-zinc-900 sm:shadow-xl shadow-2xl overflow-hidden flex flex-col max-sm:rounded-t-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div class="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
            <input
              autofocus
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls="provider-listbox"
              aria-label="Filter providers"
              aria-activedescendant={
                filtered().length > 0 ? `provider-option-${filtered()[activeIndex()]}` : undefined
              }
              placeholder="Filter providers..."
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setActiveIndex(0);
              }}
              class="w-full px-3 py-2 max-sm:py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-body text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>

          <ul
            id="provider-listbox"
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            aria-label="Providers"
            class="overflow-y-auto p-1 max-h-64 max-sm:max-h-[50vh]"
          >
            <Show
              when={filtered().length > 0}
              fallback={
                <li class="px-3 py-2 text-body text-zinc-400" aria-live="polite">
                  No providers match &lsquo;{query().trim()}&rsquo;
                </li>
              }
            >
              <For each={filtered()}>
                {(p, index) => {
                  const isSelected = createMemo(() => selected().includes(p));
                  return (
                    <li
                      id={`provider-option-${p}`}
                      role="option"
                      aria-selected={isSelected() ? "true" : "false"}
                      onClick={() => toggleProvider(p)}
                      class={`flex items-center gap-2 px-3 py-2 max-sm:py-3 rounded-lg text-body cursor-pointer transition-colors ${
                        index() === activeIndex()
                          ? "bg-zinc-800 text-zinc-200"
                          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      }`}
                    >
                      <span
                        class={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected() ? "bg-violet-500 border-violet-500 text-white" : "border-zinc-600"
                        }`}
                      >
                        <Show when={isSelected()}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </Show>
                      </span>
                      {formatProviderName(p)}
                    </li>
                  );
                }}
              </For>
            </Show>
          </ul>

          <div class="flex items-center justify-between gap-2 p-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => commit([])}
              class="px-2 py-1 text-caption max-sm:min-h-11 max-sm:text-body rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={close}
              class="px-2 py-1 text-caption max-sm:min-h-11 max-sm:text-body rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Show>
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
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-zinc-400"
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
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
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
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-zinc-400 pointer-events-none"
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
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
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
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
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

function ChevronDownIcon(props: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={`transition-transform duration-200 ${props.open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SortSelect(props: {
  class: string;
  value: string;
  onChange: (value: SortBy) => void;
  selectId?: string;
}) {
  return (
    <div class={props.class}>
      <select
        id={props.selectId}
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value as SortBy)}
        class="w-full appearance-none pl-3 pr-8 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-body text-zinc-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400 transition-all duration-200 cursor-pointer"
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
      <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronIcon />
      </div>
    </div>
  );
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
  let filterDialogRef: HTMLDivElement | undefined;

  // Escape closes the mobile filters sheet (backdrop and Done handle taps).
  createEffect(
    () => filtersOpen(),
    (isOpen) => {
      if (!isOpen) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") setFiltersOpen(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    },
  );

  // Focus trap inside the aria-modal mobile filters sheet.
  createEffect(
    () => filtersOpen(),
    (isOpen) => {
      const dialog = filterDialogRef;
      if (!isOpen || !dialog) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      dialog.addEventListener("keydown", onKeyDown);
      return () => dialog.removeEventListener("keydown", onKeyDown);
    },
  );

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

  // Terse state mirror for the gate header, same voice as the assumptions
  // summary ("10% output, 77.8% cache hit").
  const benchGateSummary = createMemo(() => {
    const f = app.filters();
    const parts: string[] = [];
    if (f.benchMin) parts.push(`min ${f.benchMin}`);
    if (f.benchMaxCost) parts.push(`max $${f.benchMaxCost}`);
    return parts.length ? parts.join(" · ") : "Not set";
  });

  const normalizedCostAssumptions = () => normalizeCostAssumptions(app.filters().costAssumptions);
  const activeAssumptionsActive = () => {
    const n = normalizedCostAssumptions();
    return (
      n.outputTokenShare !== DEFAULT_COST_ASSUMPTIONS.outputTokenShare ||
      n.inputCacheHitRate !== DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate
    );
  };

  const updateOutputShare = (rawPercent: string) => {
    const pct = Number(rawPercent);
    if (!Number.isFinite(pct)) return;
    app.setCostAssumptions({
      ...normalizedCostAssumptions(),
      outputTokenShare: Math.min(1, Math.max(0, pct / 100)),
    });
  };

  const updateCacheHitRate = (rawPercent: string) => {
    const pct = Number(rawPercent);
    if (!Number.isFinite(pct)) return;
    app.setCostAssumptions({
      ...normalizedCostAssumptions(),
      inputCacheHitRate: Math.min(1, Math.max(0, pct / 100)),
    });
  };

  // Validation flags — both bounds must be present and parse to valid values
  // for a comparison to make sense; otherwise show no warning.
  const priceMinNum = createMemo(() => (app.filters().priceMin === "" ? NaN : Number(app.filters().priceMin)));
  const priceMaxNum = createMemo(() => (app.filters().priceMax === "" ? NaN : Number(app.filters().priceMax)));
  const priceRangeInvalid = createMemo(
    () => Number.isFinite(priceMinNum()) && Number.isFinite(priceMaxNum()) && priceMinNum() > priceMaxNum(),
  );

  const benchMinNum = createMemo(() => (app.filters().benchMin === "" ? NaN : Number(app.filters().benchMin)));
  const benchRangeInvalid = createMemo(
    () => Number.isFinite(benchMinNum()) && (benchMinNum() < 0 || benchMinNum() > 1),
  );

  const dateFromMs = createMemo(() => (app.filters().dateFrom === "" ? NaN : Date.parse(app.filters().dateFrom)));
  const dateToMs = createMemo(() => (app.filters().dateTo === "" ? NaN : Date.parse(app.filters().dateTo)));
  const dateRangeInvalid = createMemo(
    () => Number.isFinite(dateFromMs()) && Number.isFinite(dateToMs()) && dateFromMs() > dateToMs(),
  );

  // Panel content is rendered twice (desktop inline panel + mobile sheet), so
  // per-instance control ids take a suffix; `""` keeps the desktop DOM
  // identical to previous releases.
  // Shared class recipes for the panel — inline Tailwind literals per repo
  // convention (AGENTS.md: no parallel styling channel). The panel renders
  // twice (desktop inline + mobile sheet), so the long strings live in consts
  // instead of being duplicated per element.
  const MF_LABEL =
    "block mb-2 text-caption font-medium uppercase tracking-wide text-zinc-400";
  // 11px = functional-text floor (DESIGN.md); sub-labels sit one step tighter
  // than MF_LABEL because they hug their inputs inside the disclosures.
  const MF_SUB = "block mb-1 text-micro text-zinc-400";
  // Disclosure header row, shared by the bench gate button and the assumptions
  // <summary> (Safari needs the ::-webkit-details-marker reset in index.css).
  const MF_SUMMARY =
    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-body font-medium text-zinc-200 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
  // Standalone field. Date/number pickers get the dark scheme from
  // `html { color-scheme: dark }`; violet focus is the interactivity accent.
  const MF_INPUT =
    "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-body text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200";
  // Input fused into a row: the row owns the well chrome, so the input is
  // bare (no border/background/radius) and stretches between its affixes.
  const MF_FUSED_INPUT =
    "min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-body text-zinc-200 placeholder:text-zinc-400 outline-none";
  // Fused row: two inputs sharing one zinc well; the 1px separator drops out
  // on mobile where the row wraps instead of crushing the pair.
  const MF_FUSED_ROW =
    "flex items-stretch max-sm:flex-wrap rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden transition-all duration-200 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500/30";
  // Disclosure container (bench gate + cost assumptions).
  const MF_DZ = "rounded-xl border border-zinc-800 bg-zinc-950/40";

  const renderFiltersPanel = (m: string): JSX.Element => (
    <div class="group flex flex-col gap-4 p-4" data-bench-open={benchOpen() ? "" : undefined}>
      {/* Lane 1 — cost (dominant task) + quick filters */}
      <div class="flex items-end gap-3 max-sm:flex-col max-sm:items-stretch">
        <div class="flex-1 min-w-0">
          <label class={MF_LABEL} for={`avg-min${m}`}>
            Average cost ($/1M tokens)
          </label>
          <p class="mt-0.5 mb-2 text-caption text-zinc-300">
            Blended input/output estimate using{" "}
            {formatCostAssumptionSummary(normalizedCostAssumptions())}.
          </p>
          <div class={MF_FUSED_ROW}>
            <span class="self-center pl-3 text-body text-zinc-400 pointer-events-none" aria-hidden="true">
              $
            </span>
            <input
              id={`avg-min${m}`}
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="Min"
              aria-label="Minimum average cost"
              class={MF_FUSED_INPUT}
              value={app.filters().priceMin}
              onInput={(e) => app.updateFilters({ priceMin: e.currentTarget.value })}
            />
            <span class="w-px shrink-0 bg-zinc-700 max-sm:hidden" aria-hidden="true"></span>
            <span class="self-center pl-3 text-body text-zinc-400 pointer-events-none" aria-hidden="true">
              $
            </span>
            <input
              id={`avg-max${m}`}
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="Max"
              aria-label="Maximum average cost"
              class={MF_FUSED_INPUT}
              value={app.filters().priceMax}
              onInput={(e) => app.updateFilters({ priceMax: e.currentTarget.value })}
            />
          </div>
          <Show when={priceRangeInvalid()}>
            <p class="mt-1.5 text-caption text-red-400">
              Min price is greater than max — no models will match.
            </p>
          </Show>
          <Show
            when={app.filters().freeOnly && (app.filters().priceMin !== "" || app.filters().priceMax !== "")}
          >
            <p class="mt-1.5 text-caption text-zinc-400">
              Free models have no published prices — a price range may exclude them.
            </p>
          </Show>
        </div>
        <div class="w-56 flex-none max-sm:w-full">
          <span class={MF_LABEL}>Quick filters</span>
          <button
            type="button"
            onClick={() => app.updateFilters({ freeOnly: !app.filters().freeOnly })}
            aria-pressed={app.filters().freeOnly ? "true" : "false"}
            class={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-body font-medium cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
              app.filters().freeOnly
                ? "border-neon-green/30 bg-neon-green/10 text-neon-green"
                : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            <span
              class={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                app.filters().freeOnly ? "border-neon-green bg-neon-green/20" : "border-zinc-600"
              }`}
              aria-hidden="true"
            ></span>
            Free only
          </button>
        </div>
      </div>

      {/* Lane 2 — freshness */}
      <div class="max-w-[460px] max-sm:max-w-none">
        <span class={MF_LABEL} id={`created-h${m}`}>
          Created date
        </span>
        <div class={MF_FUSED_ROW} role="group" aria-labelledby={`created-h${m}`}>
          <input
            type="date"
            aria-label="Created from"
            class={MF_FUSED_INPUT}
            value={app.filters().dateFrom}
            onInput={(e) => app.updateFilters({ dateFrom: e.currentTarget.value })}
          />
          <span class="w-px shrink-0 bg-zinc-700 max-sm:hidden" aria-hidden="true"></span>
          <input
            type="date"
            aria-label="Created to"
            class={MF_FUSED_INPUT}
            value={app.filters().dateTo}
            onInput={(e) => app.updateFilters({ dateTo: e.currentTarget.value })}
          />
        </div>
        <Show when={dateRangeInvalid()}>
          <p class="mt-1.5 text-caption text-red-400">
            Start date is after end date — no models will match.
          </p>
        </Show>
      </div>

      {/* Lane 3 — benchmark gates behind a disclosure (sparse coverage). The
          wrapper carries data-bench-open so the gate body can react via the
          group-data variant without a second checkbox-style input. */}
      <div class={MF_DZ}>
        <button
          type="button"
          onClick={() => setBenchOverride(!benchOpen())}
          aria-expanded={benchOpen() ? "true" : "false"}
          aria-controls={`bench-gate-body${m}`}
          class={MF_SUMMARY}
          data-panel-bench-toggle
        >
          <span class="flex items-center gap-2">
            <ChevronDownIcon open={benchOpen()} />
            Benchmark gates
          </span>
          <span class="text-caption font-normal text-zinc-400 tabular-nums">{benchGateSummary()}</span>
        </button>
        <div
          id={`bench-gate-body${m}`}
          class="hidden group-data-[bench-open]:grid grid-cols-2 gap-3 px-3 pb-3"
        >
          <div class="min-w-0">
            <label class={MF_SUB} for={`bench-min${m}`}>
              Min result (0–1)
            </label>
            <input
              id={`bench-min${m}`}
              type="number"
              inputmode="decimal"
              min="0"
              max="1"
              step="0.01"
              placeholder="e.g. 0.5"
              class={MF_INPUT}
              value={app.filters().benchMin}
              onInput={(e) => app.updateFilters({ benchMin: e.currentTarget.value })}
            />
            <Show when={benchRangeInvalid()}>
              <p class="mt-1.5 text-caption text-red-400">Benchmark result must be between 0 and 1.</p>
            </Show>
          </div>
          <div class="min-w-0">
            <label class={MF_SUB} for={`bench-max-cost${m}`}>
              Max cost (USD / attempt)
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-body pointer-events-none">
                $
              </span>
              <input
                id={`bench-max-cost${m}`}
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="No max"
                class={`${MF_INPUT} pl-7`}
                value={app.filters().benchMaxCost}
                onInput={(e) => app.updateFilters({ benchMaxCost: e.currentTarget.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lane 4 — cost assumptions, progressively disclosed */}
      <details
        open={assumptionsOpen()}
        onToggle={(e) => {
          const open = e.currentTarget.open;
          if (open !== assumptionsOpen()) setAssumptionsOverride(open);
        }}
        class={MF_DZ}
      >
        <summary class={MF_SUMMARY}>
          <span class="flex items-center gap-2">
            <ChevronDownIcon open={assumptionsOpen()} />
            Cost assumptions
          </span>
          <span class="text-caption font-normal text-zinc-400 tabular-nums">
            {formatCostAssumptionSummary(normalizedCostAssumptions())}
          </span>
        </summary>
        <div class="flex flex-wrap gap-3 px-3 pb-3">
          <label class="block">
            <span class={MF_SUB}>Output token share (%)</span>
            <input
              id={`avg-output-share${m}`}
              type="number"
              inputmode="decimal"
              min="0"
              max="100"
              step="0.1"
              class={MF_INPUT}
              value={formatCostAssumptionInputValue(normalizedCostAssumptions().outputTokenShare)}
              onInput={(e) => updateOutputShare(e.currentTarget.value)}
            />
          </label>
          <label class="block">
            <span class={MF_SUB}>Input cache hit rate (%)</span>
            <input
              id={`avg-cache-hit-rate${m}`}
              type="number"
              inputmode="decimal"
              min="0"
              max="100"
              step="0.1"
              class={MF_INPUT}
              value={formatCostAssumptionInputValue(normalizedCostAssumptions().inputCacheHitRate)}
              onInput={(e) => updateCacheHitRate(e.currentTarget.value)}
            />
          </label>
        </div>
      </details>
    </div>
  );

  return (
    <div class="flex flex-col gap-3">
      {/* Primary controls row */}
      <div class="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search — full-width row on mobile, first slot on desktop */}
        <div class="relative flex-1 min-w-0">
          <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            aria-label="Search models"
            placeholder="Search models by name or ID..."
            value={app.filters().search}
            onInput={(e) => app.setSearch(e.currentTarget.value)}
            class="w-full pl-9 pr-9 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-body text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
          />
          <Show when={app.filters().search}>
            <button
              type="button"
              onClick={() => app.setSearch("")}
              aria-label="Clear search"
              class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-lg max-sm:min-h-11 max-sm:min-w-11"
            >
              <ClearIcon />
            </button>
          </Show>
        </div>

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
        <div class="max-sm:py-0.5 max-sm:text-caption flex items-center justify-start sm:px-3 sm:py-2.5 text-body text-zinc-400 whitespace-nowrap">
          <span role="status" aria-label={`${props.filteredCount} of ${props.totalCount} models shown`}>
            <span class="text-zinc-200 font-semibold tabular-nums">{props.filteredCount}</span>
            <span class="mx-1">/</span>
            <span>{props.totalCount}</span>
            <span class="ml-1">models</span>
          </span>
          <Show when={app.dataUpdatedAt() != null}>
            <FreshnessStamp
              updatedAt={app.dataUpdatedAt()!}
              class="ml-2 text-zinc-400"
            />
          </Show>
        </div>

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
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
          class="fixed inset-0 z-30 bg-black/60 sm:hidden cursor-default"
        />
        <div
          ref={filterDialogRef}
          id="filters-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          class="fixed inset-x-0 bottom-0 z-40 sm:hidden flex flex-col max-h-[80vh] rounded-t-2xl border border-b-0 border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden"
        >
          <div class="flex items-center justify-between gap-2 p-3 border-b border-zinc-800 shrink-0">
            <span class="text-title text-zinc-200">Filters</span>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
              class="flex items-center justify-center min-h-11 min-w-11 -m-2 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <ClearIcon />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            <div>
              <label class="block text-caption font-medium uppercase tracking-wide text-zinc-400 mb-2">
                Provider
              </label>
              <ProviderCombobox
                class="relative w-full"
                provider={app.filters().selectedProvider}
                onProviderChange={(value) => app.updateFilters({ selectedProvider: value })}
                providers={props.providers}
              />
            </div>
            <div>
              <label
                for="filters-sheet-sort"
                class="block text-caption font-medium uppercase tracking-wide text-zinc-400 mb-2"
              >
                Sort by
              </label>
              <SortSelect
                class="relative w-full"
                value={props.relevanceActive ? "relevance" : app.filters().sortBy}
                onChange={app.setSortBy}
                selectId="filters-sheet-sort"
              />
            </div>

            {/* Panel content — one source of truth: `expanded`. A shared URL
                with active panel filters auto-expands it on load. The panel
                root is the group scope for the data-bench-open gate variant. */}
            <Show when={expanded()}>
              <div id="more-filters-panel-m" class="max-sm:block">
                {renderFiltersPanel("-m")}
              </div>
            </Show>
          </div>
          {/* Sheet footer — Done closes; Reset mirrors the desktop placement */}
          <div class="flex items-center gap-2 p-3 border-t border-zinc-800 shrink-0">
            <Show when={props.hasFilters}>
              <button
                type="button"
                onClick={app.resetAll}
                class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-body font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <ResetIcon />
                Reset filters
              </button>
            </Show>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              class="ml-auto flex items-center justify-center px-6 py-2.5 rounded-xl text-body font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Done
            </button>
          </div>
        </div>
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
          {renderFiltersPanel("")}
        </div>
      </Show>
    </div>
  );
}
