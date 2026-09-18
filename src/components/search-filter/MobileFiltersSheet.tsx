import { onSettled, Show } from "solid-js";
import type { AppState } from "@/lib/appState";
import { ProviderCombobox } from "./ProviderCombobox";
import { SortSelect } from "./SortSelect";
import { FiltersPanel } from "./FiltersPanel";
import { ClearIcon, ResetIcon } from "./icons";

export function MobileFiltersSheet(props: {
  app: AppState;
  providers: string[];
  relevanceActive: boolean;
  hasFilters: boolean;
  benchOpen: boolean;
  assumptionsOpen: boolean;
  onToggleBench: () => void;
  onToggleAssumptions: (open: boolean) => void;
  onClose: () => void;
}) {
  const app = props.app;
  let filterDialogRef: HTMLDivElement | undefined;

  // Escape closes the mobile filters sheet (backdrop and Done handle taps).
  // The sheet mounts only while open (the orchestrator wraps it in a
  // <Show>), so the listener lives exactly as long as the open sheet.
  onSettled(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  // Focus trap inside the aria-modal mobile filters sheet.
  onSettled(() => {
    const dialog = filterDialogRef;
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const visible = Array.from(focusables).filter((el) => !el.hasAttribute("disabled"));
      if (visible.length === 0) return;
      const first = visible[0];
      const last = visible[visible.length - 1];
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
  });

  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        onClick={props.onClose}
        class="fixed inset-0 z-30 bg-black/60 sm:hidden cursor-default"
      />
      <div
        ref={filterDialogRef}
        id="filters-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        class="fixed inset-x-0 bottom-0 z-40 sm:hidden flex flex-col max-h-[85vh] rounded-t-2xl border border-b-0 border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden"
      >
        <div class="pt-2 shrink-0" aria-hidden="true">
          <div class="mx-auto h-1 w-10 rounded-full bg-zinc-700" />
        </div>
        <div class="flex items-center justify-between gap-2 px-4 py-2 border-b border-zinc-800 shrink-0">
          <span class="text-title text-zinc-200">Filters</span>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close filters"
            class="flex items-center justify-center min-h-11 min-w-11 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <ClearIcon />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <p class="text-caption font-medium uppercase tracking-wide text-zinc-400">Essentials</p>
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
          {/* All filters always render in the sheet: gating them on the
              desktop `expanded` flag is what hid everything but provider +
              sort on mobile. Section labels separate essentials from refine. */}
          <p class="text-caption font-medium uppercase tracking-wide text-zinc-400 mt-1">Refine</p>
          <div id="more-filters-panel-m">
            <FiltersPanel
              app={app}
              idSuffix="-m"
              expanded={true}
              benchOpen={props.benchOpen}
              assumptionsOpen={props.assumptionsOpen}
              onToggleBench={props.onToggleBench}
              onToggleAssumptions={props.onToggleAssumptions}
            />
          </div>
        </div>
        {/* Sheet footer — Done closes; Reset mirrors the desktop placement */}
        <div class="flex items-center gap-2 p-3 border-t border-zinc-800 shrink-0 bg-zinc-900">
          <Show when={props.hasFilters}>
            <button
              type="button"
              onClick={app.resetAll}
              class="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-body font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <ResetIcon />
              Reset
            </button>
          </Show>
          <button
            type="button"
            onClick={props.onClose}
            class="ml-auto flex items-center justify-center px-6 py-2.5 min-h-[44px] rounded-xl text-body font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
