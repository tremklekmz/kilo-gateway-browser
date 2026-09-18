import { For, Show } from "solid-js";
import { UNPRICED_CHIP_SUFFIX } from "@/lib/appState";

/** A filter chip is amber when it flags unpriced models hidden by the price filter. */
function chipClass(chip: string): string {
  return chip.endsWith(UNPRICED_CHIP_SUFFIX)
    ? "px-2 py-0.5 rounded-full text-caption bg-amber-500/10 text-amber-300 border border-amber-500/20"
    : "px-2 py-0.5 rounded-full text-caption bg-zinc-800/80 text-zinc-300 border border-zinc-700";
}

export default function EmptyState(props: {
  hasFilters: boolean;
  filterChips: string[];
  onReset: () => void;
}) {
  return (
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-zinc-500"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 class="text-headline text-zinc-200 mb-2">No models found</h3>
      <p class="text-body text-zinc-400">
        {props.hasFilters
          ? "No models match the active filters."
          : "No models are available at this time."}
      </p>
      <Show when={props.hasFilters && props.filterChips.length > 0}>
        <div class="flex flex-wrap justify-center gap-1.5 mt-4 max-w-md">
          <For each={props.filterChips}>
            {(chip) => (
              <span class={chipClass(chip)}>
                {chip}
              </span>
            )}
          </For>
        </div>
      </Show>
      <Show when={props.hasFilters}>
        <button
          onClick={props.onReset}
          class="mt-6 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-body font-medium rounded-lg transition-colors duration-200"
        >
          Clear all filters
        </button>
      </Show>
    </div>
  );
}
