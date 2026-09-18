import { createMemo, Show } from "solid-js";
import type { AppState } from "@/lib/appState";
import {
  formatCostAssumptionInputValue,
  formatCostAssumptionSummary,
  normalizeCostAssumptions,
} from "@/lib/utils";
import { ChevronDownIcon } from "./icons";

export function FiltersPanel(props: {
  app: AppState;
  idSuffix: string;
  expanded: boolean;
  benchOpen: boolean;
  assumptionsOpen: boolean;
  onToggleBench: () => void;
  onToggleAssumptions: (open: boolean) => void;
}) {
  const app = props.app;
  const m = props.idSuffix;

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

  return (
    <div class="group flex flex-col gap-4 p-4" data-bench-open={props.benchOpen ? "" : undefined}>
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
          onClick={props.onToggleBench}
          aria-expanded={props.benchOpen ? "true" : "false"}
          aria-controls={`bench-gate-body${m}`}
          class={MF_SUMMARY}
          data-panel-bench-toggle
        >
          <span class="flex items-center gap-2">
            <ChevronDownIcon open={props.benchOpen} />
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
        open={props.assumptionsOpen}
        onToggle={(e) => {
          const open = e.currentTarget.open;
          if (open !== props.assumptionsOpen) props.onToggleAssumptions(open);
        }}
        class={MF_DZ}
      >
        <summary class={MF_SUMMARY}>
          <span class="flex items-center gap-2">
            <ChevronDownIcon open={props.assumptionsOpen} />
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
}
