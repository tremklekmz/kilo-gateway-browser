import { Show } from "solid-js";
import type { AppState } from "@/lib/appState";
import { ClearIcon, SearchIcon } from "./icons";

export function SearchInput(props: { app: AppState }) {
  const app = props.app;
  return (
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
  );
}
