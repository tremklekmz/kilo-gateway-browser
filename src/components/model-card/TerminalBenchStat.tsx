import { createSignal, onSettled, Show } from "solid-js";
import { formatPercent, formatUsd } from "@/lib/utils";

/** Unique-per-instance id for aria-describedby wiring on disclosure popovers. */
let disclosureIdCounter = 0;
function nextDisclosureId(): string {
  disclosureIdCounter += 1;
  return `disclosure-${disclosureIdCounter}`;
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
export function TerminalBenchStat(props: {
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
        class="absolute bottom-full left-0 z-50 mb-1.5 w-max max-w-56 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-caption shadow-lg shadow-black/30"
      >
        <p class="font-semibold text-sky-400 mb-1 text-title">TerminalBench</p>
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
          class="inline-flex items-center gap-1 px-1.5 max-sm:min-h-[44px] max-sm:px-3 rounded-md text-caption font-medium bg-sky-500/10 text-sky-300 border border-sky-500/25 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 tabular-nums"
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
        <span class="text-caption text-sky-400 font-medium uppercase tracking-wide leading-none mb-1">
          TerminalBench
        </span>
        <span class="text-value text-sky-300 leading-none tabular-nums">
          {formatPercent(props.score, 1)}
        </span>
      </button>
      {popover}
    </div>
  );
}
