import { createSignal, onSettled, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { AIModel } from "@/lib/types";
import {
  calculateAveragePrice,
  type CostAssumptions,
  DEFAULT_COST_ASSUMPTIONS,
  formatContextLength,
  formatCreatedDate,
  formatCostAssumptionSummary,
  formatDisplayName,
  formatPercent,
  formatRelativeAge,
  formatPrice,
  formatProviderName,
  formatUsd,
  getProviderFromId,
  isFreeModel,
  isNewModel,
} from "@/lib/utils";

interface ModelCardProps {
  model: AIModel;
  view: "grid" | "list";
  costAssumptions?: CostAssumptions;
  /** Set on the single benchmark-value leader card (coverage-gated upstream). */
  isBenchValueLeader?: boolean;
}

/** Unique-per-instance id for aria-describedby wiring on disclosure popovers. */
let disclosureIdCounter = 0;
function nextDisclosureId(): string {
  disclosureIdCounter += 1;
  return `disclosure-${disclosureIdCounter}`;
}

function CopyIcon(props: { copied: boolean }) {
  if (props.copied) {
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
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function ProviderBadge(props: { provider: string }) {
  const colorMap: Record<string, string> = {
    openai: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    anthropic: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    meta: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    google: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    mistralai: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    deepseek: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "x-ai": "bg-slate-500/10 text-slate-300 border-slate-500/20",
    kilo: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    cohere: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    qwen: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    microsoft: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    nvidia: "bg-green-500/10 text-green-400 border-green-500/20",
    perplexity: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };

  const colorClass =
    colorMap[props.provider.toLowerCase()] ||
    "bg-zinc-700/50 text-zinc-400 border-zinc-600/30";

  return (
    <span
      class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass} shrink-0`}
    >
      {formatProviderName(props.provider)}
    </span>
  );
}

function FreeBadge() {
  return (
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-neon-green/10 text-neon-green border border-neon-green/30 shrink-0">
      FREE
    </span>
  );
}

function NewBadge() {
  return (
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/15 text-violet-300 border border-violet-400/30 shrink-0">
      NEW
    </span>
  );
}

function BenchValueTick() {
  return (
    <span
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30 shrink-0"
      title="Cheapest per attempt among the top TerminalBench scorers in the current results"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Best value
    </span>
  );
}

/**
 * TerminalBench disclosure, two geometries:
 * - stat-grid tile (default): a full-width pill in the card's stat grid,
 *   rendered only when the model carries TB data (31/364 coverage — cards
 *   without a score truthfully render nothing).
 * - compact cell (compact): the TB column cell in list-view's comparison
 *   table.
 *
 * Interaction is tap/click + keyboard (Escape close, outside-tap close) — no
 * hover behavior, no <details> hover-trap. The popover carries the score
 * scale hint so "76.2%" is decodable ("0-100, agentic terminal tasks").
 */
function TerminalBenchStat(props: {
  score: number;
  avgAttemptCostUsd: number | null;
  compact?: boolean;
}) {
  const [open, setOpen] = createSignal(false);
  let rootRef: HTMLDivElement | undefined;
  const infoId = nextDisclosureId();

  const onPointerDown = (e: PointerEvent) => {
    if (rootRef && !rootRef.contains(e.target as Node)) setOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };
  onSettled(() => {
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  const popover = (
    <Show when={open()}>
      <div
        id={infoId}
        role="tooltip"
        class="absolute bottom-full left-0 z-50 mb-1.5 w-max max-w-56 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs shadow-lg shadow-black/30"
      >
        <p class="font-semibold text-sky-400 mb-1">TerminalBench</p>
        <p class="text-zinc-300">Overall: {formatPercent(props.score, 1)}</p>
        <p class="text-zinc-400">Avg attempt cost: {formatUsd(props.avgAttemptCostUsd)}</p>
        <p class="text-zinc-400 mt-1">0–100, agentic terminal tasks</p>
      </div>
    </Show>
  );

  if (props.compact) {
    return (
      <div ref={rootRef} class="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open() ? "true" : "false"}
          aria-label={`TerminalBench: ${formatPercent(props.score, 1)}`}
          aria-describedby={open() ? infoId : undefined}
          class="inline-flex items-center gap-1 px-1.5 max-sm:min-h-[44px] max-sm:px-3 rounded-md text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/25 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" x2="20" y1="19" y2="19" />
          </svg>
          {formatPercent(props.score, 1)}
        </button>
        {popover}
      </div>
    );
  }

  return (
    <div ref={rootRef} class="relative col-span-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open() ? "true" : "false"}
        aria-describedby={open() ? infoId : undefined}
        class="w-full flex flex-col items-center justify-center px-3 py-2 max-sm:min-h-[44px] rounded-lg bg-sky-500/10 border border-sky-500/25 min-w-0 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span class="text-xs text-sky-400 font-medium uppercase tracking-wide leading-none mb-1">
          TerminalBench
        </span>
        <span class="text-sm font-semibold text-sky-300 leading-none">
          {formatPercent(props.score, 1)}
        </span>
      </button>
      {popover}
    </div>
  );
}

function TrainingWarning() {
  const [open, setOpen] = createSignal(false);
  const infoId = nextDisclosureId();
  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open() ? "true" : "false"}
        aria-describedby={open() ? infoId : undefined}
        class="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-md px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span aria-hidden="true">!</span>
        <span>This provider may train on your prompts.</span>
      </button>
      <Show when={open()}>
        <p
          id={infoId}
          class="mt-1 rounded-md border border-amber-500/20 bg-zinc-800 px-3 py-2 text-[11px] text-amber-200"
        >
          Review the provider's data-use policy before sending sensitive prompts.
        </p>
      </Show>
    </div>
  );
}

const MODALITY_CONFIG: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  text: {
    label: "Text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 6.1H3" /><path d="M21 12.1H3" /><path d="M15.1 18H3" />
      </svg>
    ),
    color: "bg-blue-400/10 text-blue-200 border-blue-400/20",
  },
  image: {
    label: "Image",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  },
  audio: {
    label: "Audio",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
    color: "bg-zinc-700/50 text-zinc-300 border-zinc-600/30",
  },
  video: {
    label: "Video",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m22 8-6 4 6 4V8z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </svg>
    ),
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
};

function ModalityBadges(props: { modalities: string[] }) {
  if (!props.modalities || props.modalities.length === 0) return null;
  const normalized = props.modalities.map((m) => m.toLowerCase().split("+")[0].trim());
  const unique = Array.from(new Set(normalized));
  // "text" is the near-universal baseline modality for a model gateway — it
  // appears on ~90% of cards and carries no discriminating signal. Suppress it
  // so only the differentiators (image/audio/video) render.
  const discriminating = unique.filter((mod) => mod !== "text");
  if (discriminating.length === 0) return null;
  return (
    <div class="flex flex-wrap gap-1">
      {discriminating.map((mod) => {
        const cfg = MODALITY_CONFIG[mod];
        if (!cfg) return null;
        return (
          <span
            class={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${cfg.color}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

function StatPill(props: { label: string; value: string; info?: string }) {
  const [open, setOpen] = createSignal(false);
  const infoId = nextDisclosureId();
  return (
    <div class="relative min-w-0">
      <button
        type="button"
        onClick={() => props.info && setOpen((current) => !current)}
        aria-label={
          props.info ? `${props.label}: ${props.value}. Show pricing assumptions` : `${props.label}: ${props.value}`
        }
        aria-expanded={props.info ? (open() ? "true" : "false") : undefined}
        aria-describedby={props.info && open() ? infoId : undefined}
        class="w-full flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span class="text-xs text-zinc-400 font-medium uppercase tracking-wide leading-none mb-1">
          {props.label}
        </span>
        <span class="text-sm font-semibold text-zinc-200 leading-none truncate w-full text-center">
          {props.value}
        </span>
      </button>
      <Show when={props.info && open()}>
        <p
          id={infoId}
          class="absolute left-1/2 top-full z-20 mt-1 w-max max-w-56 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 shadow-lg"
        >
          {props.info}
        </p>
      </Show>
    </div>
  );
}

function ExpandableDescription(props: {
  text: string;
  lineClamp: number;
  class?: string;
}) {
  const [expanded, setExpanded] = createSignal(false);
  const [isClamped, setIsClamped] = createSignal(false);
  let ref: HTMLParagraphElement | undefined;

  onSettled(() => {
    const measure = () => {
      const el = ref;
      if (!el || expanded()) return;

      const prevDisplay = el.style.display;
      const prevOrient = el.style.webkitBoxOrient;
      const prevClamp = el.style.webkitLineClamp;
      const prevOverflow = el.style.overflow;

      el.style.display = "block";
      el.style.webkitLineClamp = "unset";
      el.style.overflow = "visible";
      const fullHeight = el.scrollHeight;

      el.style.display = "-webkit-box";
      el.style.webkitBoxOrient = "vertical";
      el.style.webkitLineClamp = String(props.lineClamp);
      el.style.overflow = "hidden";
      const clampedHeight = el.clientHeight;

      setIsClamped(fullHeight > clampedHeight);

      el.style.display = prevDisplay;
      el.style.webkitBoxOrient = prevOrient;
      el.style.webkitLineClamp = prevClamp;
      el.style.overflow = prevOverflow;
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (ref) ro.observe(ref);
    return () => ro.disconnect();
  });

  return (
    <div>
      <p
        ref={ref}
        style={
          expanded()
            ? undefined
            : {
                display: "-webkit-box",
                "-webkit-box-orient": "vertical",
                "-webkit-line-clamp": String(props.lineClamp),
                overflow: "hidden",
              }
        }
        class={props.class}
      >
        {props.text}
      </p>
      <Show when={isClamped()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded() ? "true" : "false"}
          class="mt-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-150 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
        >
          {expanded() ? "Show less" : "Show more"}
        </button>
      </Show>
    </div>
  );
}

export function ModelCard(props: ModelCardProps) {
  const [copied, setCopied] = createSignal(false);
  // Current time captured once per setup — "3d ago" needs no live tick, and a
  // stable value keeps the card's lifetime rendering consistent.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const provider = () => getProviderFromId(props.model.id);
  const free = () => isFreeModel(props.model);
  const isNew = () => isNewModel(props.model);

  const promptPrice = () => formatPrice(props.model.pricing.prompt);
  const completionPrice = () => formatPrice(props.model.pricing.completion);
  const contextLength = () => formatContextLength(props.model.context_length);

  let copiedTimer: number | undefined;
  onSettled(() => {
    return () => {
      if (copiedTimer !== undefined) clearTimeout(copiedTimer);
    };
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.model.id);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = props.model.id;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (copiedTimer !== undefined) clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => setCopied(false), 2000);
  };

  const createdDate = () => formatCreatedDate(props.model.created);
  const relativeAge = () => formatRelativeAge(props.model.created, nowSeconds);
  const ageDays = () => (props.model.created > 0 ? (nowSeconds - props.model.created) / 86400 : -1);
  const relativeAgeFresh = () => ageDays() >= 0 && ageDays() <= 30;
  // calculateAveragePrice is scale-invariant; pass raw per-token values and
  // forward the result to formatPrice, which normalises to $/1M for display.
  // NaN/Infinity from malformed strings are clamped to 0 inside the utility.
  const avgPrice = () =>
    formatPrice(
      calculateAveragePrice(
        {
          input: parseFloat(props.model.pricing.prompt),
          output: parseFloat(props.model.pricing.completion),
          cacheRead:
            props.model.pricing.input_cache_read != null
              ? parseFloat(props.model.pricing.input_cache_read)
              : null,
        },
        props.costAssumptions ?? DEFAULT_COST_ASSUMPTIONS,
      ),
    );
  const avgAssumptionSummary = () =>
    formatCostAssumptionSummary(props.costAssumptions ?? DEFAULT_COST_ASSUMPTIONS);

  return (
    <Show
      when={props.view === "list"}
      fallback={<ModelCardGrid {...props} free={free()} isNew={isNew()} provider={provider()} promptPrice={promptPrice()} completionPrice={completionPrice()} contextLength={contextLength()} avgPrice={avgPrice()} avgAssumptionSummary={avgAssumptionSummary()} createdDate={createdDate()} relativeAge={relativeAge()} relativeAgeFresh={relativeAgeFresh()} isBenchValueLeader={props.isBenchValueLeader ?? false} handleCopy={handleCopy} copied={copied()} />}
    >
      <ModelCardList {...props} free={free()} isNew={isNew()} provider={provider()} promptPrice={promptPrice()} completionPrice={completionPrice()} contextLength={contextLength()} avgPrice={avgPrice()} avgAssumptionSummary={avgAssumptionSummary()} createdDate={createdDate()} relativeAge={relativeAge()} relativeAgeFresh={relativeAgeFresh()} handleCopy={handleCopy} copied={copied()} />
    </Show>
  );
}

function ModelCardList(props: {
  model: AIModel;
  free: boolean;
  isNew: boolean;
  provider: string;
  promptPrice: string;
  completionPrice: string;
  contextLength: string;
  avgPrice: string;
  avgAssumptionSummary: string;
  createdDate: string | null;
  relativeAge: string | null;
  relativeAgeFresh: boolean;
  handleCopy: () => void;
  copied: boolean;
}) {
  const model = () => props.model;
  return (
    // Comparison-table row: an 8-column grid shared with the sticky header in
    // App (same template), so Context/In/Out/Avg/TB/Age align into true
    // columns. Mobile collapses to a stacked single column.
    <div class="group rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 max-sm:p-4 sm:grid sm:grid-cols-[minmax(0,2fr)_80px_96px_96px_96px_72px_64px_108px] sm:items-center sm:gap-x-4 sm:px-4 sm:py-3">
      {/* Model identity + badges */}
      <div class="min-w-0 max-sm:mb-1">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-sm font-semibold text-zinc-100 truncate">
            {formatDisplayName(model().name)}
          </h3>
          <ProviderBadge provider={props.provider} />
          {props.free && <FreeBadge />}
          {props.isNew && <NewBadge />}
        </div>
        <Show when={model().description}>
          <p class="hidden sm:block text-xs text-zinc-400 truncate leading-relaxed">
            {model().description}
          </p>
          <p class="sm:hidden text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-1">
            {model().description}
          </p>
        </Show>
        <Show when={model().mayTrainOnYourPrompts}>
          <div class="mt-2">
            <TrainingWarning />
          </div>
        </Show>
      </div>
      {/* Context */}
      <span class="hidden sm:block text-sm font-medium text-zinc-300 text-right tabular-nums whitespace-nowrap">
        {props.contextLength}
      </span>
      {/* In */}
      <span
        class={`hidden sm:block text-sm font-medium text-right tabular-nums whitespace-nowrap ${
          props.free ? "text-neon-green" : "text-zinc-300"
        }`}
      >
        {props.promptPrice}
      </span>
      {/* Out */}
      <span
        class={`hidden sm:block text-sm font-medium text-right tabular-nums whitespace-nowrap ${
          props.free ? "text-neon-green" : "text-zinc-300"
        }`}
      >
        {props.completionPrice}
      </span>
      {/* Avg */}
      <span
        class={`hidden sm:block text-sm font-medium text-right tabular-nums whitespace-nowrap ${
          props.free ? "text-neon-green" : "text-zinc-300"
        }`}
      >
        {props.avgPrice}
      </span>
      {/* TB: sparse column — em-dash when unscored, honest absence */}
      <span class="hidden sm:flex justify-center">
        <Show
          when={model().terminalBench}
          fallback={
            <span class="text-sm text-zinc-500" aria-hidden="true">
              —
            </span>
          }
        >
          {(bench) => (
            <TerminalBenchStat
              score={bench().overallScore}
              avgAttemptCostUsd={bench().avgAttemptCostUsd}
              compact
            />
          )}
        </Show>
      </span>
      {/* Age */}
      <span class="hidden sm:block text-xs font-medium text-right whitespace-nowrap">
        <Show when={props.relativeAge}>
          <span
            title={`Released ${props.createdDate}`}
            aria-label={`Released ${props.createdDate}`}
            class={
              props.isNew
                ? "text-violet-300"
                : props.relativeAgeFresh
                  ? "text-zinc-300"
                  : "text-zinc-400"
            }
          >
            {props.relativeAge}
          </span>
        </Show>
      </span>
      {/* Copy action */}
      <span class="hidden sm:flex justify-end">
        <button
          onClick={props.handleCopy}
          aria-live="polite"
          class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            props.copied
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-100 hover:border-zinc-600"
          }`}
        >
          <CopyIcon copied={props.copied} />
          {props.copied ? "Copied!" : "Copy ID"}
        </button>
      </span>
      {/* Mobile stack: everything desktop columns hold, card-style */}
      <div class="sm:hidden space-y-2.5">
        <div class="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-zinc-400">
          <Show when={model().terminalBench}>
            {(bench) => (
              <TerminalBenchStat
                score={bench().overallScore}
                avgAttemptCostUsd={bench().avgAttemptCostUsd}
                compact
              />
            )}
          </Show>
          <span class="flex items-center gap-1">
            Context: <span class="text-zinc-300 font-medium">{props.contextLength}</span>
          </span>
          <span class="flex items-center gap-1">
            In:{" "}
            <span class={`font-medium ${props.free ? "text-neon-green" : "text-zinc-300"}`}>
              {props.promptPrice}
            </span>
          </span>
          <span class="flex items-center gap-1">
            Out:{" "}
            <span class={`font-medium ${props.free ? "text-neon-green" : "text-zinc-300"}`}>
              {props.completionPrice}
            </span>
          </span>
          <span class="flex items-center gap-1">
            Avg:{" "}
            <span class={`font-medium ${props.free ? "text-neon-green" : "text-zinc-300"}`}>
              {props.avgPrice}
            </span>
          </span>
        </div>
        <div class="flex flex-wrap gap-3 text-[11px] text-zinc-400">
          <span>per 1M · {props.avgAssumptionSummary}</span>
          <Show when={props.relativeAge}>
            <span class="font-mono">{model().id}</span>
          </Show>
          <Show when={props.createdDate && props.relativeAge}>
            <span
              class={
                props.isNew
                  ? "text-violet-300"
                  : props.relativeAgeFresh
                    ? "text-zinc-300"
                    : "text-zinc-400"
              }
            >
              {props.relativeAge}
              <span class="text-zinc-500 font-normal"> · {props.createdDate}</span>
            </span>
          </Show>
        </div>
        <button
          onClick={props.handleCopy}
          aria-live="polite"
          class={`w-full min-h-[44px] flex items-center justify-center gap-1.5 px-4 rounded-lg text-xs font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            props.copied
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
          }`}
        >
          <CopyIcon copied={props.copied} />
          {props.copied ? "Copied!" : "Copy ID"}
        </button>
      </div>
    </div>
  );
}

function ModelCardGrid(props: {
  model: AIModel;
  free: boolean;
  isNew: boolean;
  provider: string;
  promptPrice: string;
  completionPrice: string;
  contextLength: string;
  avgPrice: string;
  avgAssumptionSummary: string;
  createdDate: string | null;
  relativeAge: string | null;
  relativeAgeFresh: boolean;
  isBenchValueLeader: boolean;
  handleCopy: () => void;
  copied: boolean;
}) {
  const model = () => props.model;
  return (
    <div class="group flex flex-col p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      {/* Header */}
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold text-zinc-100 leading-snug mb-1.5 line-clamp-2">
            {formatDisplayName(model().name)}
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <ProviderBadge provider={props.provider} />
            <Show when={props.isBenchValueLeader}>
              <BenchValueTick />
            </Show>
            <ModalityBadges modalities={model().architecture?.input_modalities ?? []} />
          </div>
        </div>
        <Show when={props.free || props.isNew}>
          <div class="flex flex-col items-end gap-1 shrink-0">
            {props.free && <FreeBadge />}
            {props.isNew && <NewBadge />}
          </div>
        </Show>
      </div>
      {/* Description */}
      <Show when={model().description}>
        <div class="mb-4 flex-1">
          <ExpandableDescription
            text={model().description}
            lineClamp={2}
            class="text-xs text-zinc-400 leading-relaxed break-words"
          />
        </div>
      </Show>
      <div class="mt-auto">
        <Show when={model().mayTrainOnYourPrompts}>
          <div class="mb-3">
            <TrainingWarning />
          </div>
        </Show>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <Show when={model().terminalBench}>
            {(bench) => (
              <TerminalBenchStat
                score={bench().overallScore}
                avgAttemptCostUsd={bench().avgAttemptCostUsd}
              />
            )}
          </Show>
          <StatPill label="Context" value={props.contextLength} />
          <StatPill
            label="Avg $/1M"
            value={props.avgPrice}
            info={`Average blended cost per 1M tokens. Uses ${props.avgAssumptionSummary}. Change it in Cost assumptions.`}
          />
        </div>
        <details class="mb-3 rounded-lg border border-zinc-800 bg-zinc-950/30">
          <summary class="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-lg">
            Direct token rates
          </summary>
          <div class="grid grid-cols-2 gap-2 px-3 pb-3">
            <StatPill label="In $/1M" value={props.promptPrice} />
            <StatPill label="Out $/1M" value={props.completionPrice} />
          </div>
        </details>
        <p class="mb-3 text-center text-[11px] leading-relaxed text-zinc-400">
          Avg price per 1M · {props.avgAssumptionSummary}
        </p>

        {/* Release date is a primary recency signal; absolute date remains visible on touch. */}
        <Show when={props.createdDate && props.relativeAge}>
          <p
            title={`Released ${props.createdDate}`}
            aria-label={`Released ${props.createdDate}`}
            class={`flex items-center justify-center gap-1 text-xs font-semibold mb-2 ${
              props.isNew
                ? "text-violet-300"
                : props.relativeAgeFresh
                  ? "text-zinc-300"
                  : "text-zinc-400"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            Released {props.relativeAge}
            <span class="text-zinc-400 font-normal"> · {props.createdDate}</span>
          </p>
        </Show>

        {/* Model ID + Copy */}
        <div class="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/50">
          <code class="flex-1 text-[11px] text-zinc-300 font-mono truncate">{model().id}</code>
          <button
            onClick={props.handleCopy}
            title="Copy model ID"
            aria-live="polite"
            class={`shrink-0 flex items-center gap-1 px-2 py-1 max-sm:px-3 max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:justify-center rounded-md text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
              props.copied ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            <CopyIcon copied={props.copied} />
            <span class={props.copied ? "inline" : "hidden sm:inline"}>
              {props.copied ? "Copied!" : "Copy"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
